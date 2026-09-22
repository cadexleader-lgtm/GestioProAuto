-- Cycle de vie non financier de la maintenance (ouverture, mise a jour des couts/statut).
-- La cloture (complete_vehicle_maintenance, 20260916100000) reste inchangee : c'est deja
-- elle qui gere l'impact financier (depense/ledger/caisse) de facon atomique et idempotente.
-- Ici on comble ce qui manquait en amont : ouverture non atomique (db.add + db.update
-- separes, cote client), aucune idempotency_key, aucune protection contre une double
-- maintenance active sur le meme vehicule, et aucun moyen securise d'editer les couts
-- avant la cloture.

CREATE UNIQUE INDEX IF NOT EXISTS vehicle_maintenances_company_open_idempotency_key_idx
  ON public.vehicle_maintenances (
    company_id,
    (data->>'open_idempotency_key')
  )
  WHERE NULLIF(data->>'open_idempotency_key', '') IS NOT NULL;

CREATE OR REPLACE FUNCTION public.open_vehicle_maintenance(
  p_company_id uuid,
  p_maintenance_id text,
  p_vehicle_id text,
  p_motif text,
  p_type text,
  p_garage text,
  p_priority text,
  p_date_in date,
  p_parts_cost numeric,
  p_labor_cost numeric,
  p_other_cost numeric,
  p_notes text,
  p_idempotency_key text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_existing public.vehicle_maintenances;
  v_active public.vehicle_maintenances;
  v_vehicle_data jsonb;
  v_maintenance_data jsonb;
  v_idempotency_key text := btrim(COALESCE(p_idempotency_key, ''));
  v_parts_cost numeric := COALESCE(p_parts_cost, 0);
  v_labor_cost numeric := COALESCE(p_labor_cost, 0);
  v_other_cost numeric := COALESCE(p_other_cost, 0);
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  IF p_company_id IS NULL OR NOT private.is_company_member(p_company_id) THEN
    RAISE EXCEPTION 'User is not a member of this company' USING ERRCODE = '42501';
  END IF;

  IF NULLIF(btrim(COALESCE(p_maintenance_id, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Maintenance id must not be empty' USING ERRCODE = '22023';
  END IF;
  IF NULLIF(btrim(COALESCE(p_vehicle_id, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Vehicle id must not be empty' USING ERRCODE = '22023';
  END IF;
  IF NULLIF(btrim(COALESCE(p_motif, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Motif must not be empty' USING ERRCODE = '22023';
  END IF;
  IF v_idempotency_key = '' THEN
    RAISE EXCEPTION 'Idempotency key must not be empty' USING ERRCODE = '22023';
  END IF;
  IF v_parts_cost < 0 OR v_labor_cost < 0 OR v_other_cost < 0 THEN
    RAISE EXCEPTION 'Maintenance costs must not be negative' USING ERRCODE = '22003';
  END IF;

  -- Rejeu idempotent : meme cle -> on renvoie la fiche existante sans rien recreer.
  SELECT *
    INTO v_existing
    FROM public.vehicle_maintenances
   WHERE company_id = p_company_id
     AND data->>'open_idempotency_key' = v_idempotency_key;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'maintenance_id', v_existing.id,
      'vehicle_id', v_existing.data->>'vehicleId',
      'maintenance', v_existing.data,
      'idempotent', true
    );
  END IF;

  SELECT data
    INTO v_vehicle_data
    FROM public.vehicles
   WHERE company_id = p_company_id
     AND id = btrim(p_vehicle_id)
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vehicle not found' USING ERRCODE = 'P0002';
  END IF;

  IF COALESCE(v_vehicle_data->>'status', '') = 'sold' THEN
    RAISE EXCEPTION 'Cannot open a maintenance on a sold vehicle' USING ERRCODE = '22023';
  END IF;

  SELECT *
    INTO v_active
    FROM public.vehicle_maintenances
   WHERE company_id = p_company_id
     AND data->>'vehicleId' = btrim(p_vehicle_id)
     AND COALESCE(data->>'status', '') <> 'done'
   FOR UPDATE;

  IF FOUND THEN
    RAISE EXCEPTION 'Vehicle already has an active maintenance (%)' , v_active.id
      USING ERRCODE = '23505';
  END IF;

  v_maintenance_data := COALESCE(p_metadata, '{}'::jsonb) || jsonb_build_object(
    'vehicleId', btrim(p_vehicle_id),
    'motif', btrim(p_motif),
    'type', COALESCE(NULLIF(btrim(p_type), ''), 'Autre'),
    'garage', COALESCE(p_garage, ''),
    'priority', COALESCE(NULLIF(btrim(p_priority), ''), 'medium'),
    'dateIn', COALESCE(p_date_in, current_date),
    'status', 'pending',
    'partsCost', v_parts_cost,
    'laborCost', v_labor_cost,
    'otherCost', v_other_cost,
    'notes', COALESCE(p_notes, ''),
    'open_idempotency_key', v_idempotency_key
  );

  INSERT INTO public.vehicle_maintenances (id, company_id, data)
  VALUES (btrim(p_maintenance_id), p_company_id, v_maintenance_data);

  UPDATE public.vehicles
     SET data = v_vehicle_data || jsonb_build_object('status', 'maintenance')
   WHERE company_id = p_company_id
     AND id = btrim(p_vehicle_id);

  RETURN jsonb_build_object(
    'maintenance_id', btrim(p_maintenance_id),
    'vehicle_id', btrim(p_vehicle_id),
    'maintenance', v_maintenance_data,
    'idempotent', false
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.open_vehicle_maintenance(
  uuid, text, text, text, text, text, text, date, numeric, numeric, numeric, text, text, jsonb
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.open_vehicle_maintenance(
  uuid, text, text, text, text, text, text, date, numeric, numeric, numeric, text, text, jsonb
) TO authenticated;

-- Mise a jour du statut / des couts / des notes tant que la maintenance n'est pas cloturee.
-- Une fois status = 'done' (pose exclusivement par complete_vehicle_maintenance), plus aucune
-- modification n'est acceptee ici : la fiche devient immuable, comme un document financier
-- deja emis.

CREATE OR REPLACE FUNCTION public.update_vehicle_maintenance(
  p_company_id uuid,
  p_maintenance_id text,
  p_status text DEFAULT NULL,
  p_parts_cost numeric DEFAULT NULL,
  p_labor_cost numeric DEFAULT NULL,
  p_other_cost numeric DEFAULT NULL,
  p_garage text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_priority text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_maintenance public.vehicle_maintenances;
  v_data jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  IF p_company_id IS NULL OR NOT private.is_company_member(p_company_id) THEN
    RAISE EXCEPTION 'User is not a member of this company' USING ERRCODE = '42501';
  END IF;

  IF NULLIF(btrim(COALESCE(p_maintenance_id, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Maintenance id must not be empty' USING ERRCODE = '22023';
  END IF;

  IF p_status IS NOT NULL AND p_status NOT IN ('pending', 'diagnostic', 'repair', 'parts_wait') THEN
    RAISE EXCEPTION 'Status must be pending, diagnostic, repair or parts_wait (use complete_vehicle_maintenance to close)'
      USING ERRCODE = '22023';
  END IF;

  IF p_parts_cost IS NOT NULL AND p_parts_cost < 0 THEN
    RAISE EXCEPTION 'Parts cost must not be negative' USING ERRCODE = '22003';
  END IF;
  IF p_labor_cost IS NOT NULL AND p_labor_cost < 0 THEN
    RAISE EXCEPTION 'Labor cost must not be negative' USING ERRCODE = '22003';
  END IF;
  IF p_other_cost IS NOT NULL AND p_other_cost < 0 THEN
    RAISE EXCEPTION 'Other cost must not be negative' USING ERRCODE = '22003';
  END IF;

  SELECT *
    INTO v_maintenance
    FROM public.vehicle_maintenances
   WHERE company_id = p_company_id
     AND id = btrim(p_maintenance_id)
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vehicle maintenance not found' USING ERRCODE = 'P0002';
  END IF;

  IF COALESCE(v_maintenance.data->>'status', '') = 'done' THEN
    RAISE EXCEPTION 'Vehicle maintenance is already completed and cannot be modified'
      USING ERRCODE = '55000';
  END IF;

  v_data := v_maintenance.data || jsonb_build_object(
    'status', COALESCE(p_status, v_maintenance.data->>'status'),
    'partsCost', COALESCE(p_parts_cost, NULLIF(v_maintenance.data->>'partsCost', '')::numeric, 0),
    'laborCost', COALESCE(p_labor_cost, NULLIF(v_maintenance.data->>'laborCost', '')::numeric, 0),
    'otherCost', COALESCE(p_other_cost, NULLIF(v_maintenance.data->>'otherCost', '')::numeric, 0),
    'garage', COALESCE(p_garage, v_maintenance.data->>'garage'),
    'notes', COALESCE(p_notes, v_maintenance.data->>'notes'),
    'priority', COALESCE(p_priority, v_maintenance.data->>'priority')
  );

  UPDATE public.vehicle_maintenances
     SET data = v_data
   WHERE company_id = p_company_id
     AND id = btrim(p_maintenance_id);

  RETURN jsonb_build_object(
    'maintenance_id', v_maintenance.id,
    'vehicle_id', v_data->>'vehicleId',
    'maintenance', v_data
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.update_vehicle_maintenance(
  uuid, text, text, numeric, numeric, numeric, text, text, text
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.update_vehicle_maintenance(
  uuid, text, text, numeric, numeric, numeric, text, text, text
) TO authenticated;

-- Les deux fonctions font foi cote serveur : on retire l'ecriture directe sur
-- vehicle_maintenances pour forcer le passage par ces RPC (comme deja fait pour
-- vehicle_sales, cash_movements, ledger_entries, rentals, rental_payments, payslips).
REVOKE INSERT, UPDATE, DELETE ON public.vehicle_maintenances FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.vehicle_maintenances FROM PUBLIC;
