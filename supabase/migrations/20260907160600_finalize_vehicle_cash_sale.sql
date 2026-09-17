CREATE OR REPLACE FUNCTION public.record_vehicle_cash_sale(
  p_company_id uuid,
  p_sale_id text,
  p_vehicle_id text,
  p_customer text,
  p_phone text,
  p_address text,
  p_cin text,
  p_amount numeric,
  p_currency text,
  p_method text,
  p_occurred_at timestamptz,
  p_idempotency_key text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_vehicle_data jsonb;
  v_vehicle_status text;
  v_vehicle jsonb;
  v_sale jsonb;
  v_entry public.ledger_entries;
  v_cash_id text;
  v_occurred_at timestamptz := COALESCE(p_occurred_at, now());
  v_currency text := upper(btrim(COALESCE(p_currency, '')));
  v_method text := btrim(COALESCE(p_method, ''));
  v_customer text := btrim(COALESCE(p_customer, ''));
  v_idempotency_key text := btrim(COALESCE(p_idempotency_key, ''));
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  IF p_company_id IS NULL OR NOT private.is_company_member(p_company_id) THEN
    RAISE EXCEPTION 'User is not a member of this company' USING ERRCODE = '42501';
  END IF;

  IF NOT private.company_role_at_least(p_company_id, 'manager'::public.app_role) THEN
    RAISE EXCEPTION 'Insufficient permissions to record a vehicle cash sale'
      USING ERRCODE = '42501';
  END IF;

  IF p_sale_id IS NULL OR btrim(p_sale_id) = '' THEN
    RAISE EXCEPTION 'Sale id must not be empty' USING ERRCODE = '22023';
  END IF;
  IF p_vehicle_id IS NULL OR btrim(p_vehicle_id) = '' THEN
    RAISE EXCEPTION 'Vehicle id must not be empty' USING ERRCODE = '22023';
  END IF;
  IF v_customer = '' THEN
    RAISE EXCEPTION 'Customer must not be empty' USING ERRCODE = '22023';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Sale amount must be greater than zero' USING ERRCODE = '22003';
  END IF;
  IF v_currency = '' THEN
    RAISE EXCEPTION 'Currency must not be empty' USING ERRCODE = '22023';
  END IF;
  IF v_method = '' THEN
    RAISE EXCEPTION 'Payment method must not be empty' USING ERRCODE = '22023';
  END IF;
  IF v_idempotency_key = '' THEN
    RAISE EXCEPTION 'Idempotency key must not be empty' USING ERRCODE = '22023';
  END IF;

  SELECT *
    INTO v_entry
    FROM public.ledger_entries
   WHERE company_id = p_company_id
     AND idempotency_key = v_idempotency_key;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'sale_id', v_entry.source_id,
      'ledger_entry_id', v_entry.id,
      'cash_movement_id', 'vehicle-cash-sale:' || v_entry.id::text,
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

  SELECT *
    INTO v_entry
    FROM public.ledger_entries
   WHERE company_id = p_company_id
     AND idempotency_key = v_idempotency_key;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'sale_id', v_entry.source_id,
      'ledger_entry_id', v_entry.id,
      'cash_movement_id', 'vehicle-cash-sale:' || v_entry.id::text,
      'idempotent', true
    );
  END IF;

  v_vehicle_status := v_vehicle_data->>'status';
  IF v_vehicle_status IS DISTINCT FROM 'available' THEN
    RAISE EXCEPTION 'Vehicle is not available for sale' USING ERRCODE = '55000';
  END IF;

  v_vehicle := v_vehicle_data || jsonb_build_object('status', 'sold');
  v_sale := COALESCE(p_metadata, '{}'::jsonb) || jsonb_build_object(
    'vehicleId', btrim(p_vehicle_id),
    'customer', v_customer,
    'phone', NULLIF(btrim(COALESCE(p_phone, '')), ''),
    'address', NULLIF(btrim(COALESCE(p_address, '')), ''),
    'cin', NULLIF(btrim(COALESCE(p_cin, '')), ''),
    'amount', p_amount,
    'date', (v_occurred_at AT TIME ZONE 'UTC')::date,
    'payment', 'cash',
    'method', v_method,
    'downPayment', p_amount,
    'status', 'done'
  );

  INSERT INTO public.ledger_entries (
    company_id, source_module, source_type, source_id, cash_account_id,
    direction, amount, currency, occurred_at, status, idempotency_key,
    description, metadata, created_by
  )
  VALUES (
    p_company_id, 'vehicles', 'cash_sale', btrim(p_sale_id), v_method,
    'in', p_amount, v_currency, v_occurred_at, 'posted', v_idempotency_key,
    'Vente véhicule — ' || v_customer,
    jsonb_build_object(
      'vehicle_id', btrim(p_vehicle_id),
      'method', v_method
    ) || COALESCE(p_metadata, '{}'::jsonb),
    auth.uid()
  )
  ON CONFLICT (company_id, idempotency_key) DO NOTHING
  RETURNING * INTO v_entry;

  IF NOT FOUND THEN
    SELECT *
      INTO v_entry
      FROM public.ledger_entries
     WHERE company_id = p_company_id
       AND idempotency_key = v_idempotency_key;
  END IF;

  IF v_entry IS NULL THEN
    RAISE EXCEPTION 'Unable to create or retrieve ledger entry';
  END IF;

  INSERT INTO public.vehicle_sales (id, company_id, data)
  VALUES (btrim(p_sale_id), p_company_id, v_sale);

  UPDATE public.vehicles
     SET data = v_vehicle
   WHERE company_id = p_company_id
     AND id = btrim(p_vehicle_id);

  v_cash_id := 'vehicle-cash-sale:' || v_entry.id::text;
  INSERT INTO public.cash_movements (id, company_id, data)
  VALUES (
    v_cash_id,
    p_company_id,
    jsonb_build_object(
      'type', 'in',
      'label', 'Vente véhicule — ' || v_customer,
      'amount', p_amount,
      'date', v_occurred_at,
      'source', v_method,
      'ledger_entry_id', v_entry.id,
      'source_module', 'vehicles',
      'source_type', 'cash_sale',
      'source_id', btrim(p_sale_id),
      'idempotency_key', v_idempotency_key
    )
  );

  RETURN jsonb_build_object(
    'sale_id', btrim(p_sale_id),
    'ledger_entry_id', v_entry.id,
    'cash_movement_id', v_cash_id,
    'idempotent', false
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.record_vehicle_cash_sale(
  uuid, text, text, text, text, text, text, numeric, text, text,
  timestamptz, text, jsonb
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.record_vehicle_cash_sale(
  uuid, text, text, text, text, text, text, numeric, text, text,
  timestamptz, text, jsonb
) TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_sales TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ledger_entries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_movements TO authenticated;
