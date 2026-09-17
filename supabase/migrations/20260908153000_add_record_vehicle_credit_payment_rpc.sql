CREATE UNIQUE INDEX IF NOT EXISTS vehicle_payments_company_idempotency_key_idx
  ON public.vehicle_payments (company_id, ((data->>'idempotency_key')))
  WHERE NULLIF(data->>'idempotency_key', '') IS NOT NULL;

CREATE OR REPLACE FUNCTION public.record_vehicle_credit_payment(
  p_company_id uuid,
  p_payment_id text,
  p_credit_id text,
  p_amount numeric,
  p_payment_date date,
  p_currency text,
  p_method text,
  p_idempotency_key text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_credit_data jsonb;
  v_existing_payment public.vehicle_payments;
  v_existing_cash_data jsonb;
  v_payment_data jsonb;
  v_entry public.ledger_entries;
  v_credit_total numeric;
  v_down_payment numeric;
  v_payments_received numeric;
  v_remaining numeric;
  v_total_paid numeric;
  v_paid_months integer;
  v_next_due_date date;
  v_currency text := upper(btrim(COALESCE(p_currency, '')));
  v_method text := btrim(COALESCE(p_method, ''));
  v_idempotency_key text := btrim(COALESCE(p_idempotency_key, ''));
  v_cash_id text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  IF p_company_id IS NULL OR NOT private.is_company_member(p_company_id) THEN
    RAISE EXCEPTION 'User is not a member of this company' USING ERRCODE = '42501';
  END IF;

  IF NOT private.company_role_at_least(p_company_id, 'manager'::public.app_role) THEN
    RAISE EXCEPTION 'Insufficient permissions to record a credit payment'
      USING ERRCODE = '42501';
  END IF;

  IF NULLIF(btrim(COALESCE(p_payment_id, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Payment id must not be empty' USING ERRCODE = '22023';
  END IF;
  IF NULLIF(btrim(COALESCE(p_credit_id, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Credit id must not be empty' USING ERRCODE = '22023';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero' USING ERRCODE = '22003';
  END IF;
  IF p_payment_date IS NULL THEN
    RAISE EXCEPTION 'Payment date must not be empty' USING ERRCODE = '22023';
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
    INTO v_existing_payment
    FROM public.vehicle_payments
   WHERE company_id = p_company_id
     AND data->>'idempotency_key' = v_idempotency_key;

  IF FOUND THEN
    IF v_existing_payment.data->>'creditId' IS DISTINCT FROM btrim(p_credit_id) THEN
      RAISE EXCEPTION 'Idempotency key is already used by another credit'
        USING ERRCODE = '23505';
    END IF;

    SELECT data
      INTO v_credit_data
      FROM public.vehicle_credits
     WHERE company_id = p_company_id
       AND id = btrim(p_credit_id)
     FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Credit not found for existing payment'
        USING ERRCODE = 'P0002';
    END IF;

    SELECT *
      INTO v_entry
      FROM public.ledger_entries
     WHERE company_id = p_company_id
       AND source_type = 'credit_payment'
       AND source_id = v_existing_payment.id;

    SELECT id, data
      INTO v_cash_id, v_existing_cash_data
      FROM public.cash_movements
     WHERE company_id = p_company_id
       AND data->>'source_type' = 'credit_payment'
       AND data->>'source_id' = v_existing_payment.id;

    IF v_entry IS NULL OR v_cash_id IS NULL THEN
      RAISE EXCEPTION 'Existing payment is missing its ledger or cash movement';
    END IF;

    IF v_existing_cash_data->>'ledger_entry_id' IS DISTINCT FROM v_entry.id::text
       OR v_existing_cash_data->>'source_id' IS DISTINCT FROM v_existing_payment.id
       OR COALESCE((v_existing_cash_data->>'amount')::numeric, NULL) IS DISTINCT FROM
          COALESCE((v_existing_payment.data->>'amount')::numeric, NULL) THEN
      RAISE EXCEPTION 'Existing cash movement is inconsistent with the payment';
    END IF;

    RETURN jsonb_build_object(
      'payment_id', v_existing_payment.id,
      'credit_id', btrim(p_credit_id),
      'ledger_entry_id', CASE WHEN v_entry IS NULL THEN NULL ELSE v_entry.id END,
      'cash_movement_id', v_cash_id,
      'payment', v_existing_payment.data,
      'credit', v_credit_data,
      'idempotent', true
    );
  END IF;

  SELECT data
    INTO v_credit_data
    FROM public.vehicle_credits
   WHERE company_id = p_company_id
     AND id = btrim(p_credit_id)
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Credit not found' USING ERRCODE = 'P0002';
  END IF;

  IF lower(COALESCE(v_credit_data->>'status', '')) = 'cancelled' THEN
    RAISE EXCEPTION 'Cancelled credit cannot receive payments' USING ERRCODE = '55000';
  END IF;

  v_credit_total := COALESCE((v_credit_data->>'total')::numeric, 0);
  v_down_payment := COALESCE((v_credit_data->>'downPayment')::numeric, 0);

  SELECT COALESCE(SUM((data->>'amount')::numeric), 0)
    INTO v_payments_received
    FROM public.vehicle_payments
   WHERE company_id = p_company_id
     AND data->>'creditId' = btrim(p_credit_id);

  v_remaining := GREATEST(0, v_credit_total - v_down_payment - v_payments_received);

  IF p_amount > v_remaining THEN
    RAISE EXCEPTION 'Payment exceeds the remaining credit balance'
      USING ERRCODE = '22003';
  END IF;

  v_total_paid := v_down_payment + v_payments_received + p_amount;
  v_paid_months := COALESCE((v_credit_data->>'paidMonths')::integer, 0);

  IF COALESCE((v_credit_data->>'monthlyPayment')::numeric, 0) > 0 THEN
    v_paid_months := LEAST(
      COALESCE((v_credit_data->>'totalMonths')::integer, v_paid_months),
      FLOOR(v_total_paid / (v_credit_data->>'monthlyPayment')::numeric)::integer
    );
  END IF;

  v_next_due_date := CASE
    WHEN v_total_paid >= v_credit_total THEN
      COALESCE(NULLIF(v_credit_data->>'nextDueDate', '')::date, p_payment_date)
    ELSE
      (p_payment_date + INTERVAL '1 month')::date
  END;

  v_payment_data := COALESCE(p_metadata, '{}'::jsonb) || jsonb_build_object(
    'creditId', btrim(p_credit_id),
    'amount', p_amount,
    'date', p_payment_date,
    'method', v_method,
    'currency', v_currency,
    'idempotency_key', v_idempotency_key,
    'status', 'posted'
  );

  INSERT INTO public.vehicle_payments (id, company_id, data)
  VALUES (btrim(p_payment_id), p_company_id, v_payment_data)
  ON CONFLICT (company_id, id) DO NOTHING;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment id already exists' USING ERRCODE = '23505';
  END IF;

  UPDATE public.vehicle_credits
     SET data = v_credit_data || jsonb_build_object(
       'paidMonths', v_paid_months,
       'nextDueDate', v_next_due_date,
       'status', CASE
         WHEN v_total_paid >= v_credit_total THEN 'ok'
         WHEN v_next_due_date < CURRENT_DATE THEN 'late'
         ELSE 'ok'
       END
     )
   WHERE company_id = p_company_id
     AND id = btrim(p_credit_id);

  INSERT INTO public.ledger_entries (
    company_id, source_module, source_type, source_id, cash_account_id,
    direction, amount, currency, occurred_at, status, idempotency_key,
    description, metadata, created_by
  )
  VALUES (
    p_company_id,
    'vehicles',
    'credit_payment',
    btrim(p_payment_id),
    v_method,
    'in',
    p_amount,
    v_currency,
    p_payment_date::timestamptz,
    'posted',
    'vehicle-credit-payment:' || v_idempotency_key,
    'Paiement crédit — ' || COALESCE(v_credit_data->>'customer', btrim(p_credit_id)),
    jsonb_build_object(
      'credit_id', btrim(p_credit_id),
      'payment_id', btrim(p_payment_id),
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
       AND idempotency_key = 'vehicle-credit-payment:' || v_idempotency_key;
  END IF;

  IF v_entry IS NULL THEN
    RAISE EXCEPTION 'Unable to create or retrieve ledger entry';
  END IF;

  v_cash_id := 'vehicle-credit-payment:' || v_entry.id::text;

  INSERT INTO public.cash_movements (id, company_id, data)
  VALUES (
    v_cash_id,
    p_company_id,
    jsonb_build_object(
      'type', 'in',
      'label', 'Paiement crédit — ' || COALESCE(v_credit_data->>'customer', btrim(p_credit_id)),
      'amount', p_amount,
      'date', p_payment_date,
      'source', v_method,
      'currency', v_currency,
      'ledger_entry_id', v_entry.id,
      'source_module', 'vehicles',
      'source_type', 'credit_payment',
      'source_id', btrim(p_payment_id),
      'credit_id', btrim(p_credit_id),
      'idempotency_key', v_idempotency_key
    )
  )
  ON CONFLICT (company_id, id) DO UPDATE
    SET data = public.cash_movements.data
  RETURNING data INTO v_existing_cash_data;

  IF v_existing_cash_data->>'ledger_entry_id' IS DISTINCT FROM v_entry.id::text
     OR v_existing_cash_data->>'source_id' IS DISTINCT FROM btrim(p_payment_id)
     OR COALESCE((v_existing_cash_data->>'amount')::numeric, NULL) IS DISTINCT FROM p_amount THEN
    RAISE EXCEPTION 'Existing cash movement is inconsistent with the payment';
  END IF;

  RETURN jsonb_build_object(
    'payment_id', btrim(p_payment_id),
    'credit_id', btrim(p_credit_id),
    'ledger_entry_id', v_entry.id,
    'cash_movement_id', v_cash_id,
    'payment', v_payment_data,
    'credit', v_credit_data || jsonb_build_object(
      'paidMonths', v_paid_months,
      'nextDueDate', v_next_due_date,
      'status', CASE
        WHEN v_total_paid >= v_credit_total THEN 'ok'
        WHEN v_next_due_date < CURRENT_DATE THEN 'late'
        ELSE 'ok'
      END
    ),
    'idempotent', false
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.record_vehicle_credit_payment(
  uuid, text, text, numeric, date, text, text, text, jsonb
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.record_vehicle_credit_payment(
  uuid, text, text, numeric, date, text, text, text, jsonb
) TO authenticated;
