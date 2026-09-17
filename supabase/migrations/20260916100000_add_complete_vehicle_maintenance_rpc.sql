-- Complete a vehicle maintenance and, when applicable, post its financial impact atomically.
-- A zero-cost maintenance is completed without expense, ledger or cash records.

CREATE UNIQUE INDEX IF NOT EXISTS vehicle_maintenances_company_completion_idempotency_key_idx
  ON public.vehicle_maintenances (
    company_id,
    (data->>'completion_idempotency_key')
  )
  WHERE NULLIF(data->>'completion_idempotency_key', '') IS NOT NULL;

CREATE OR REPLACE FUNCTION public.complete_vehicle_maintenance(
  p_company_id uuid,
  p_maintenance_id text,
  p_completed_at date,
  p_currency text,
  p_payment_method text,
  p_idempotency_key text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_maintenance public.vehicle_maintenances;
  v_vehicle_data jsonb;
  v_maintenance_data jsonb;
  v_expense_data jsonb;
  v_cash_data jsonb;
  v_existing_entry public.ledger_entries;
  v_entry public.ledger_entries;
  v_parts_cost numeric;
  v_labor_cost numeric;
  v_other_cost numeric;
  v_total numeric;
  v_currency text := upper(btrim(COALESCE(p_currency, '')));
  v_method text := btrim(COALESCE(p_payment_method, ''));
  v_idempotency_key text := btrim(COALESCE(p_idempotency_key, ''));
  v_expense_id text;
  v_cash_id text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  IF p_company_id IS NULL OR NOT private.is_company_member(p_company_id) THEN
    RAISE EXCEPTION 'User is not a member of this company' USING ERRCODE = '42501';
  END IF;

  IF NOT private.company_role_at_least(p_company_id, 'manager'::public.app_role) THEN
    RAISE EXCEPTION 'Insufficient permissions to complete vehicle maintenance'
      USING ERRCODE = '42501';
  END IF;

  IF NULLIF(btrim(COALESCE(p_maintenance_id, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Maintenance id must not be empty' USING ERRCODE = '22023';
  END IF;
  IF p_completed_at IS NULL THEN
    RAISE EXCEPTION 'Completion date must not be empty' USING ERRCODE = '22023';
  END IF;
  IF v_idempotency_key = '' THEN
    RAISE EXCEPTION 'Idempotency key must not be empty' USING ERRCODE = '22023';
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

  SELECT data
    INTO v_vehicle_data
    FROM public.vehicles
   WHERE company_id = p_company_id
     AND id = v_maintenance.data->>'vehicleId'
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vehicle not found for maintenance' USING ERRCODE = 'P0002';
  END IF;

  v_parts_cost := COALESCE(NULLIF(v_maintenance.data->>'partsCost', '')::numeric, 0);
  v_labor_cost := COALESCE(NULLIF(v_maintenance.data->>'laborCost', '')::numeric, 0);
  v_other_cost := COALESCE(NULLIF(v_maintenance.data->>'otherCost', '')::numeric, 0);

  IF v_parts_cost < 0 OR v_labor_cost < 0 OR v_other_cost < 0 THEN
    RAISE EXCEPTION 'Maintenance costs must not be negative' USING ERRCODE = '22003';
  END IF;

  v_total := v_parts_cost + v_labor_cost + v_other_cost;

  IF v_total > 0 AND (v_currency = '' OR v_method = '') THEN
    RAISE EXCEPTION 'Currency and payment method are required for a paid maintenance'
      USING ERRCODE = '22023';
  END IF;

  SELECT *
    INTO v_existing_entry
    FROM public.ledger_entries
   WHERE company_id = p_company_id
     AND idempotency_key = v_idempotency_key;

  IF FOUND AND (
    v_existing_entry.source_module IS DISTINCT FROM 'vehicles'
    OR v_existing_entry.source_type IS DISTINCT FROM 'maintenance_completion'
    OR v_existing_entry.source_id IS DISTINCT FROM v_maintenance.id
  ) THEN
    RAISE EXCEPTION 'Idempotency key is already used by another operation'
      USING ERRCODE = '23505';
  END IF;

  IF COALESCE(v_maintenance.data->>'status', '') = 'done' THEN
    IF v_maintenance.data->>'completion_idempotency_key' IS DISTINCT FROM v_idempotency_key THEN
      RAISE EXCEPTION 'Vehicle maintenance is already completed' USING ERRCODE = '55000';
    END IF;

    IF COALESCE(NULLIF(v_maintenance.data->>'financialAmount', '')::numeric, 0) IS DISTINCT FROM v_total THEN
      RAISE EXCEPTION 'Existing maintenance completion amount is inconsistent'
        USING ERRCODE = '23505';
    END IF;

    v_expense_id := v_maintenance.data->>'expenseId';
    v_cash_id := v_maintenance.data->>'cashMovementId';

    IF v_total = 0 THEN
      IF v_expense_id IS NOT NULL
         OR v_cash_id IS NOT NULL
         OR NULLIF(v_maintenance.data->>'ledgerEntryId', '') IS NOT NULL THEN
        RAISE EXCEPTION 'Zero-cost maintenance contains financial records';
      END IF;

      RETURN jsonb_build_object(
        'maintenance_id', v_maintenance.id,
        'vehicle_id', v_maintenance.data->>'vehicleId',
        'expense_id', NULL,
        'ledger_entry_id', NULL,
        'cash_movement_id', NULL,
        'amount', 0,
        'currency', NULL,
        'maintenance', v_maintenance.data,
        'expense', NULL,
        'ledger_entry', NULL,
        'cash', NULL,
        'idempotent', true
      );
    END IF;

    IF v_existing_entry IS NULL
       OR v_existing_entry.id::text IS DISTINCT FROM v_maintenance.data->>'ledgerEntryId'
       OR v_existing_entry.direction IS DISTINCT FROM 'out'
       OR v_existing_entry.amount IS DISTINCT FROM v_total
       OR v_existing_entry.currency IS DISTINCT FROM v_currency
       OR v_existing_entry.cash_account_id IS DISTINCT FROM v_method THEN
      RAISE EXCEPTION 'Existing maintenance ledger entry is inconsistent';
    END IF;

    SELECT data
      INTO v_expense_data
      FROM public.expenses
     WHERE company_id = p_company_id
       AND id = v_expense_id;

    SELECT data
      INTO v_cash_data
      FROM public.cash_movements
     WHERE company_id = p_company_id
       AND id = v_cash_id;

    IF v_expense_data IS NULL OR v_cash_data IS NULL
       OR v_expense_data->>'maintenanceId' IS DISTINCT FROM v_maintenance.id
       OR v_expense_data->>'vehicleId' IS DISTINCT FROM v_maintenance.data->>'vehicleId'
       OR v_expense_data->>'ledgerEntryId' IS DISTINCT FROM v_existing_entry.id::text
       OR v_cash_data->>'maintenanceId' IS DISTINCT FROM v_maintenance.id
       OR v_cash_data->>'vehicleId' IS DISTINCT FROM v_maintenance.data->>'vehicleId'
       OR v_cash_data->>'ledgerEntryId' IS DISTINCT FROM v_existing_entry.id::text
       OR COALESCE((v_expense_data->>'amount')::numeric, NULL) IS DISTINCT FROM v_total
       OR COALESCE((v_cash_data->>'amount')::numeric, NULL) IS DISTINCT FROM v_total THEN
      RAISE EXCEPTION 'Existing maintenance financial records are inconsistent';
    END IF;

    RETURN jsonb_build_object(
      'maintenance_id', v_maintenance.id,
      'vehicle_id', v_maintenance.data->>'vehicleId',
      'expense_id', v_expense_id,
      'ledger_entry_id', v_existing_entry.id,
      'cash_movement_id', v_cash_id,
      'amount', v_total,
      'currency', v_currency,
      'maintenance', v_maintenance.data,
      'expense', v_expense_data,
      'ledger_entry', to_jsonb(v_existing_entry),
      'cash', v_cash_data,
      'idempotent', true
    );
  END IF;

  IF v_existing_entry IS NOT NULL THEN
    RAISE EXCEPTION 'Existing maintenance ledger entry has no completed maintenance'
      USING ERRCODE = '23505';
  END IF;

  IF v_total > 0 THEN
    INSERT INTO public.ledger_entries (
      company_id, source_module, source_type, source_id, cash_account_id,
      direction, amount, currency, occurred_at, status, idempotency_key,
      description, metadata, created_by
    )
    VALUES (
      p_company_id,
      'vehicles',
      'maintenance_completion',
      v_maintenance.id,
      v_method,
      'out',
      v_total,
      v_currency,
      p_completed_at::timestamptz,
      'posted',
      v_idempotency_key,
      'Maintenance véhicule — ' || COALESCE(v_maintenance.data->>'motif', v_maintenance.id),
      COALESCE(p_metadata, '{}'::jsonb) || jsonb_build_object(
        'vehicleId', v_maintenance.data->>'vehicleId',
        'maintenanceId', v_maintenance.id,
        'idempotency_key', v_idempotency_key
      ),
      auth.uid()
    )
    RETURNING * INTO v_entry;

    UPDATE public.ledger_entries
       SET metadata = metadata || jsonb_build_object('ledgerEntryId', v_entry.id)
     WHERE id = v_entry.id
    RETURNING * INTO v_entry;

    v_expense_id := 'maintenance-expense:' || v_maintenance.id;
    v_cash_id := 'maintenance-cash:' || v_maintenance.id;

    v_expense_data := jsonb_build_object(
      'category', 'Maintenance',
      'label', 'Maintenance véhicule — ' || COALESCE(v_maintenance.data->>'motif', v_maintenance.id),
      'amount', v_total,
      'date', p_completed_at,
      'currency', v_currency,
      'paymentMethod', v_method,
      'source', 'Automobile',
      'source_type', 'maintenance_completion',
      'vehicleId', v_maintenance.data->>'vehicleId',
      'maintenanceId', v_maintenance.id,
      'ledgerEntryId', v_entry.id,
      'idempotency_key', v_idempotency_key,
      'hasReceipt', true
    );

    INSERT INTO public.expenses (id, company_id, data)
    VALUES (v_expense_id, p_company_id, v_expense_data);

    v_cash_data := jsonb_build_object(
      'type', 'out',
      'label', 'Maintenance véhicule — ' || COALESCE(v_maintenance.data->>'motif', v_maintenance.id),
      'amount', v_total,
      'date', p_completed_at,
      'currency', v_currency,
      'source', v_method,
      'source_module', 'vehicles',
      'source_type', 'maintenance_completion',
      'source_id', v_maintenance.id,
      'vehicleId', v_maintenance.data->>'vehicleId',
      'maintenanceId', v_maintenance.id,
      'ledgerEntryId', v_entry.id,
      'idempotency_key', v_idempotency_key
    );

    INSERT INTO public.cash_movements (id, company_id, data)
    VALUES (v_cash_id, p_company_id, v_cash_data);
  ELSE
    v_expense_id := NULL;
    v_cash_id := NULL;
  END IF;

  v_maintenance_data := v_maintenance.data
    || COALESCE(p_metadata, '{}'::jsonb)
    || jsonb_build_object(
      'status', 'done',
      'dateOut', p_completed_at,
      'financialAmount', v_total,
      'completion_idempotency_key', v_idempotency_key,
      'expenseId', v_expense_id,
      'ledgerEntryId', CASE WHEN v_entry IS NULL THEN NULL ELSE v_entry.id::text END,
      'cashMovementId', v_cash_id
    );

  UPDATE public.vehicle_maintenances
     SET data = v_maintenance_data
   WHERE company_id = p_company_id
     AND id = v_maintenance.id;

  UPDATE public.vehicles
     SET data = v_vehicle_data || jsonb_build_object('status', 'available')
   WHERE company_id = p_company_id
     AND id = v_maintenance.data->>'vehicleId';

  RETURN jsonb_build_object(
    'maintenance_id', v_maintenance.id,
    'vehicle_id', v_maintenance.data->>'vehicleId',
    'expense_id', v_expense_id,
    'ledger_entry_id', CASE WHEN v_entry IS NULL THEN NULL ELSE v_entry.id END,
    'cash_movement_id', v_cash_id,
    'amount', v_total,
    'currency', CASE WHEN v_total > 0 THEN v_currency ELSE NULL END,
    'maintenance', v_maintenance_data,
    'expense', v_expense_data,
    'ledger_entry', CASE WHEN v_entry IS NULL THEN NULL ELSE to_jsonb(v_entry) END,
    'cash', v_cash_data,
    'idempotent', false
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.complete_vehicle_maintenance(
  uuid, text, date, text, text, text, jsonb
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.complete_vehicle_maintenance(
  uuid, text, date, text, text, text, jsonb
) TO authenticated;
