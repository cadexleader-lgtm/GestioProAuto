CREATE UNIQUE INDEX IF NOT EXISTS vehicle_sales_company_idempotency_key_idx
  ON public.vehicle_sales (company_id, ((data->>'idempotency_key')))
  WHERE NULLIF(data->>'idempotency_key', '') IS NOT NULL;

CREATE OR REPLACE FUNCTION public.record_vehicle_credit_sale(
  p_company_id uuid,
  p_sale_id text,
  p_credit_id text,
  p_vehicle_id text,
  p_customer text,
  p_phone text,
  p_id_document text,
  p_total numeric,
  p_down_payment numeric,
  p_total_months integer,
  p_monthly_payment numeric,
  p_first_due_date date,
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
  v_sale_data jsonb;
  v_credit_data jsonb;
  v_existing_sale public.vehicle_sales;
  v_entry public.ledger_entries;
  v_occurred_at timestamptz := COALESCE(p_occurred_at, now());
  v_customer text := btrim(COALESCE(p_customer, ''));
  v_currency text := upper(btrim(COALESCE(p_currency, '')));
  v_method text := btrim(COALESCE(p_method, ''));
  v_idempotency_key text := btrim(COALESCE(p_idempotency_key, ''));
  v_down_payment numeric := COALESCE(p_down_payment, 0);
  v_monthly_payment numeric := COALESCE(p_monthly_payment, 0);
  v_cash_id text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  IF p_company_id IS NULL OR NOT private.is_company_member(p_company_id) THEN
    RAISE EXCEPTION 'User is not a member of this company' USING ERRCODE = '42501';
  END IF;

  IF NOT private.company_role_at_least(p_company_id, 'manager'::public.app_role) THEN
    RAISE EXCEPTION 'Insufficient permissions to record a vehicle credit sale'
      USING ERRCODE = '42501';
  END IF;

  IF NULLIF(btrim(COALESCE(p_sale_id, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Sale id must not be empty' USING ERRCODE = '22023';
  END IF;
  IF NULLIF(btrim(COALESCE(p_credit_id, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Credit id must not be empty' USING ERRCODE = '22023';
  END IF;
  IF NULLIF(btrim(COALESCE(p_vehicle_id, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Vehicle id must not be empty' USING ERRCODE = '22023';
  END IF;
  IF v_customer = '' THEN
    RAISE EXCEPTION 'Customer must not be empty' USING ERRCODE = '22023';
  END IF;
  IF p_total IS NULL OR p_total <= 0 THEN
    RAISE EXCEPTION 'Credit total must be greater than zero' USING ERRCODE = '22003';
  END IF;
  IF v_down_payment < 0 OR v_down_payment > p_total THEN
    RAISE EXCEPTION 'Down payment must be between zero and the credit total'
      USING ERRCODE = '22003';
  END IF;
  IF p_total_months IS NULL OR p_total_months <= 0 THEN
    RAISE EXCEPTION 'Credit duration must be greater than zero' USING ERRCODE = '22003';
  END IF;
  IF p_first_due_date IS NULL THEN
    RAISE EXCEPTION 'First due date must not be empty'
      USING ERRCODE = '22023';
  END IF;
  IF p_total - v_down_payment > 0
     AND (v_monthly_payment <= 0 OR v_monthly_payment * p_total_months < p_total - v_down_payment) THEN
    RAISE EXCEPTION 'Monthly payment is inconsistent with the financed amount'
      USING ERRCODE = '22003';
  END IF;
  IF v_idempotency_key = '' THEN
    RAISE EXCEPTION 'Idempotency key must not be empty' USING ERRCODE = '22023';
  END IF;
  IF v_currency = '' THEN
    RAISE EXCEPTION 'Currency must not be empty' USING ERRCODE = '22023';
  END IF;
  IF NULLIF(btrim(COALESCE(p_method, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Payment method must not be empty' USING ERRCODE = '22023';
  END IF;

  SELECT *
    INTO v_existing_sale
    FROM public.vehicle_sales
   WHERE company_id = p_company_id
     AND data->>'idempotency_key' = v_idempotency_key;

  IF FOUND THEN
    SELECT *
      INTO v_entry
      FROM public.ledger_entries
     WHERE company_id = p_company_id
       AND source_type = 'credit_down_payment'
       AND source_id = v_existing_sale.id;
    SELECT id
      INTO v_cash_id
      FROM public.cash_movements
     WHERE company_id = p_company_id
       AND data->>'source_type' = 'credit_down_payment'
       AND data->>'source_id' = v_existing_sale.id;
    RETURN jsonb_build_object(
      'sale_id', v_existing_sale.id,
      'credit_id', v_existing_sale.data->>'creditId',
      'ledger_entry_id', CASE WHEN v_entry IS NULL THEN NULL ELSE v_entry.id END,
      'cash_movement_id', v_cash_id,
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
    INTO v_existing_sale
    FROM public.vehicle_sales
   WHERE company_id = p_company_id
     AND data->>'idempotency_key' = v_idempotency_key;

  IF FOUND THEN
    SELECT *
      INTO v_entry
      FROM public.ledger_entries
     WHERE company_id = p_company_id
       AND source_type = 'credit_down_payment'
       AND source_id = v_existing_sale.id;
    SELECT id
      INTO v_cash_id
      FROM public.cash_movements
     WHERE company_id = p_company_id
       AND data->>'source_type' = 'credit_down_payment'
       AND data->>'source_id' = v_existing_sale.id;
    RETURN jsonb_build_object(
      'sale_id', v_existing_sale.id,
      'credit_id', v_existing_sale.data->>'creditId',
      'ledger_entry_id', CASE WHEN v_entry IS NULL THEN NULL ELSE v_entry.id END,
      'cash_movement_id', v_cash_id,
      'idempotent', true
    );
  END IF;

  v_vehicle_status := v_vehicle_data->>'status';
  IF v_vehicle_status IS DISTINCT FROM 'available' THEN
    RAISE EXCEPTION 'Vehicle is not available for credit sale' USING ERRCODE = '55000';
  END IF;

  v_sale_data := COALESCE(p_metadata, '{}'::jsonb) || jsonb_build_object(
    'vehicleId', btrim(p_vehicle_id),
    'customer', v_customer,
    'phone', NULLIF(btrim(COALESCE(p_phone, '')), ''),
    'idDocument', NULLIF(btrim(COALESCE(p_id_document, '')), ''),
    'amount', p_total,
    'date', (v_occurred_at AT TIME ZONE 'UTC')::date,
    'payment', 'credit',
    'method', v_method,
    'downPayment', v_down_payment,
    'creditId', btrim(p_credit_id),
    'status', 'done',
    'idempotency_key', v_idempotency_key
  );

  v_credit_data := COALESCE(p_metadata, '{}'::jsonb) || jsonb_build_object(
    'vehicleId', btrim(p_vehicle_id),
    'customer', v_customer,
    'total', p_total,
    'downPayment', v_down_payment,
    'monthlyPayment', v_monthly_payment,
    'paidMonths', 0,
    'totalMonths', p_total_months,
    'nextDueDate', p_first_due_date,
    'status', 'ok',
    'saleId', btrim(p_sale_id),
    'idempotency_key', v_idempotency_key
  );

  INSERT INTO public.vehicle_sales (id, company_id, data)
  VALUES (btrim(p_sale_id), p_company_id, v_sale_data)
  ON CONFLICT (company_id, id) DO NOTHING;

  IF NOT FOUND THEN
    SELECT *
      INTO v_existing_sale
      FROM public.vehicle_sales
     WHERE company_id = p_company_id
       AND data->>'idempotency_key' = v_idempotency_key;
    IF FOUND THEN
      SELECT *
        INTO v_entry
        FROM public.ledger_entries
       WHERE company_id = p_company_id
         AND source_type = 'credit_down_payment'
         AND source_id = v_existing_sale.id;
      SELECT id
        INTO v_cash_id
        FROM public.cash_movements
       WHERE company_id = p_company_id
         AND data->>'source_type' = 'credit_down_payment'
         AND data->>'source_id' = v_existing_sale.id;
      RETURN jsonb_build_object(
        'sale_id', v_existing_sale.id,
        'credit_id', v_existing_sale.data->>'creditId',
        'ledger_entry_id', CASE WHEN v_entry IS NULL THEN NULL ELSE v_entry.id END,
        'cash_movement_id', v_cash_id,
        'idempotent', true
      );
    END IF;
    RAISE EXCEPTION 'Sale id already exists' USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.vehicle_credits (id, company_id, data)
  VALUES (btrim(p_credit_id), p_company_id, v_credit_data)
  ON CONFLICT (company_id, id) DO NOTHING;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Credit id already exists' USING ERRCODE = '23505';
  END IF;

  UPDATE public.vehicles
     SET data = v_vehicle_data || jsonb_build_object('status', 'sold')
   WHERE company_id = p_company_id
     AND id = btrim(p_vehicle_id);

  IF v_down_payment > 0 THEN
    INSERT INTO public.ledger_entries (
      company_id, source_module, source_type, source_id, cash_account_id,
      direction, amount, currency, occurred_at, status, idempotency_key,
      description, metadata, created_by
    )
    VALUES (
      p_company_id, 'vehicles', 'credit_down_payment', btrim(p_sale_id), v_method,
      'in', v_down_payment, v_currency, v_occurred_at, 'posted',
      'vehicle-credit-down-payment:' || v_idempotency_key,
      'Apport vente à crédit — ' || v_customer,
      jsonb_build_object(
        'vehicle_id', btrim(p_vehicle_id),
        'credit_id', btrim(p_credit_id),
        'sale_id', btrim(p_sale_id),
        'method', v_method
      ),
      auth.uid()
    )
    ON CONFLICT (company_id, idempotency_key) DO NOTHING
    RETURNING * INTO v_entry;

    IF NOT FOUND THEN
      SELECT *
        INTO v_entry
        FROM public.ledger_entries
       WHERE company_id = p_company_id
         AND idempotency_key = 'vehicle-credit-down-payment:' || v_idempotency_key;
    END IF;

    v_cash_id := 'vehicle-credit-down-payment:' || v_entry.id::text;
    INSERT INTO public.cash_movements (id, company_id, data)
    VALUES (
      v_cash_id,
      p_company_id,
      jsonb_build_object(
        'type', 'in',
        'label', 'Apport crédit — ' || v_customer,
        'amount', v_down_payment,
        'date', v_occurred_at,
        'source', v_method,
        'ledger_entry_id', v_entry.id,
        'source_module', 'vehicles',
        'source_type', 'credit_down_payment',
        'source_id', btrim(p_sale_id),
        'credit_id', btrim(p_credit_id),
        'idempotency_key', v_idempotency_key
      )
    )
    ON CONFLICT (company_id, id) DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'sale_id', btrim(p_sale_id),
    'credit_id', btrim(p_credit_id),
    'ledger_entry_id', CASE WHEN v_entry IS NULL THEN NULL ELSE v_entry.id END,
    'cash_movement_id', v_cash_id,
    'idempotent', false
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.record_vehicle_credit_sale(
  uuid, text, text, text, text, text, text, numeric, numeric, integer,
  numeric, date, text, text, timestamptz, text, jsonb
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.record_vehicle_credit_sale(
  uuid, text, text, text, text, text, text, numeric, numeric, integer,
  numeric, date, text, text, timestamptz, text, jsonb
) TO authenticated;
