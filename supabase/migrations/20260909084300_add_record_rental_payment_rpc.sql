CREATE TABLE IF NOT EXISTS public.rental_payments (
  id text NOT NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (company_id, id)
);

CREATE UNIQUE INDEX IF NOT EXISTS rental_payments_company_idempotency_key_idx
  ON public.rental_payments (company_id, ((data->>'idempotency_key')))
  WHERE NULLIF(data->>'idempotency_key', '') IS NOT NULL;

CREATE INDEX IF NOT EXISTS rental_payments_company_rental_idx
  ON public.rental_payments (company_id, ((data->>'rentalId')));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rental_payments TO authenticated;
GRANT ALL ON public.rental_payments TO service_role;

ALTER TABLE public.rental_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members read rental payments" ON public.rental_payments;
CREATE POLICY "members read rental payments"
  ON public.rental_payments FOR SELECT TO authenticated
  USING (private.is_company_member(company_id));

DROP POLICY IF EXISTS "members insert rental payments" ON public.rental_payments;
CREATE POLICY "members insert rental payments"
  ON public.rental_payments FOR INSERT TO authenticated
  WITH CHECK (private.is_company_member(company_id));

DROP POLICY IF EXISTS "members update rental payments" ON public.rental_payments;
CREATE POLICY "members update rental payments"
  ON public.rental_payments FOR UPDATE TO authenticated
  USING (private.is_company_member(company_id))
  WITH CHECK (private.is_company_member(company_id));

DROP POLICY IF EXISTS "managers delete rental payments" ON public.rental_payments;
CREATE POLICY "managers delete rental payments"
  ON public.rental_payments FOR DELETE TO authenticated
  USING (private.company_role_at_least(company_id, 'manager'::public.app_role));

DROP TRIGGER IF EXISTS trg_rental_payments_updated ON public.rental_payments;
CREATE TRIGGER trg_rental_payments_updated
  BEFORE UPDATE ON public.rental_payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.record_rental_payment(
  p_company_id uuid,
  p_payment_id text,
  p_rental_id text,
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
  v_rental public.rentals;
  v_existing_payment public.rental_payments;
  v_payment_data jsonb;
  v_cash_data jsonb;
  v_entry public.ledger_entries;
  v_total numeric;
  v_advance numeric;
  v_paid_amount numeric;
  v_remaining numeric;
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
    RAISE EXCEPTION 'Insufficient permissions to record a rental payment'
      USING ERRCODE = '42501';
  END IF;

  IF NULLIF(btrim(COALESCE(p_payment_id, '')), '') IS NULL
     OR NULLIF(btrim(COALESCE(p_rental_id, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Payment and rental ids must not be empty' USING ERRCODE = '22023';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero' USING ERRCODE = '22003';
  END IF;
  IF p_payment_date IS NULL THEN
    RAISE EXCEPTION 'Payment date must not be empty' USING ERRCODE = '22023';
  END IF;
  IF v_currency = '' OR v_method = '' OR v_idempotency_key = '' THEN
    RAISE EXCEPTION 'Currency, payment method and idempotency key must not be empty'
      USING ERRCODE = '22023';
  END IF;

  SELECT *
    INTO v_existing_payment
    FROM public.rental_payments
   WHERE company_id = p_company_id
     AND data->>'idempotency_key' = v_idempotency_key
   FOR UPDATE;

  IF FOUND THEN
    IF v_existing_payment.data->>'rentalId' IS DISTINCT FROM btrim(p_rental_id) THEN
      RAISE EXCEPTION 'Idempotency key is already used by another rental'
        USING ERRCODE = '23505';
    END IF;

    SELECT *
      INTO v_rental
      FROM public.rentals
     WHERE company_id = p_company_id
       AND id = btrim(p_rental_id)
     FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Rental not found for existing payment' USING ERRCODE = 'P0002';
    END IF;

    SELECT *
      INTO v_entry
      FROM public.ledger_entries
     WHERE company_id = p_company_id
       AND source_type = 'rental_payment'
       AND source_id = v_existing_payment.id;

    SELECT id, data
      INTO v_cash_id, v_cash_data
      FROM public.cash_movements
     WHERE company_id = p_company_id
       AND data->>'source_type' = 'rental_payment'
       AND data->>'source_id' = v_existing_payment.id;

    IF v_entry IS NULL OR v_cash_id IS NULL THEN
      RAISE EXCEPTION 'Existing rental payment is missing ledger or cash movement';
    END IF;

    IF v_cash_data->>'ledger_entry_id' IS DISTINCT FROM v_entry.id::text
       OR v_cash_data->>'source_id' IS DISTINCT FROM v_existing_payment.id
       OR v_cash_data->>'source_type' IS DISTINCT FROM 'rental_payment'
       OR COALESCE((v_cash_data->>'amount')::numeric, NULL) IS DISTINCT FROM
          COALESCE((v_existing_payment.data->>'amount')::numeric, NULL)
       OR v_cash_data->>'currency' IS DISTINCT FROM v_entry.currency THEN
      RAISE EXCEPTION 'Existing rental payment cash movement is inconsistent';
    END IF;

    RETURN jsonb_build_object(
      'payment_id', v_existing_payment.id,
      'rental_id', v_rental.id,
      'payment', v_existing_payment.data,
      'rental', v_rental.data,
      'ledger_entry_id', v_entry.id,
      'cash_movement_id', v_cash_id,
      'idempotent', true
    );
  END IF;

  SELECT *
    INTO v_rental
    FROM public.rentals
   WHERE company_id = p_company_id
     AND id = btrim(p_rental_id)
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Rental not found' USING ERRCODE = 'P0002';
  END IF;

  IF lower(COALESCE(v_rental.data->>'status', '')) IN ('cancelled', 'returned') THEN
    RAISE EXCEPTION 'Closed or cancelled rental cannot receive payments'
      USING ERRCODE = '55000';
  END IF;

  v_total := COALESCE((v_rental.data->>'totalAmount')::numeric, 0);
  v_advance := COALESCE((v_rental.data->>'advance')::numeric, 0);

  SELECT COALESCE(SUM((data->>'amount')::numeric), 0)
    INTO v_paid_amount
    FROM public.rental_payments
   WHERE company_id = p_company_id
     AND data->>'rentalId' = btrim(p_rental_id);

  v_remaining := GREATEST(0, v_total - v_advance - v_paid_amount);

  IF p_amount > v_remaining THEN
    RAISE EXCEPTION 'Payment exceeds the remaining rental balance'
      USING ERRCODE = '22003';
  END IF;

  v_payment_data := COALESCE(p_metadata, '{}'::jsonb) || jsonb_build_object(
    'rentalId', btrim(p_rental_id),
    'amount', p_amount,
    'date', p_payment_date,
    'currency', v_currency,
    'method', v_method,
    'status', 'posted',
    'idempotency_key', v_idempotency_key
  );

  INSERT INTO public.rental_payments (id, company_id, data)
  VALUES (btrim(p_payment_id), p_company_id, v_payment_data)
  ON CONFLICT (company_id, id) DO NOTHING;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment id already exists' USING ERRCODE = '23505';
  END IF;

  UPDATE public.rentals
     SET data = v_rental.data || jsonb_build_object(
       'paidAmount', v_paid_amount + p_amount,
       'remaining', v_remaining - p_amount
     )
   WHERE company_id = p_company_id
     AND id = btrim(p_rental_id);

  INSERT INTO public.ledger_entries (
    company_id, source_module, source_type, source_id, cash_account_id,
    direction, amount, currency, occurred_at, status, idempotency_key,
    description, metadata, created_by
  )
  VALUES (
    p_company_id,
    'vehicles',
    'rental_payment',
    btrim(p_payment_id),
    v_method,
    'in',
    p_amount,
    v_currency,
    p_payment_date::timestamptz,
    'posted',
    'vehicle-rental-payment:' || v_idempotency_key,
    'Paiement location — ' || COALESCE(v_rental.data->>'customer', btrim(p_rental_id)),
    jsonb_build_object('rental_id', btrim(p_rental_id), 'payment_id', btrim(p_payment_id)),
    auth.uid()
  )
  ON CONFLICT (company_id, idempotency_key) DO NOTHING
  RETURNING * INTO v_entry;

  IF NOT FOUND THEN
    SELECT *
      INTO v_entry
      FROM public.ledger_entries
     WHERE company_id = p_company_id
       AND idempotency_key = 'vehicle-rental-payment:' || v_idempotency_key;
  END IF;

  IF v_entry IS NULL THEN
    RAISE EXCEPTION 'Unable to create or retrieve rental payment ledger entry';
  END IF;

  v_cash_id := 'vehicle-rental-payment:' || v_entry.id::text;

  INSERT INTO public.cash_movements (id, company_id, data)
  VALUES (
    v_cash_id,
    p_company_id,
    jsonb_build_object(
      'type', 'in',
      'label', 'Paiement location — ' || COALESCE(v_rental.data->>'customer', btrim(p_rental_id)),
      'amount', p_amount,
      'date', p_payment_date,
      'currency', v_currency,
      'source', v_method,
      'ledger_entry_id', v_entry.id,
      'source_module', 'vehicles',
      'source_type', 'rental_payment',
      'source_id', btrim(p_payment_id),
      'rental_id', btrim(p_rental_id),
      'idempotency_key', v_idempotency_key
    )
  )
  ON CONFLICT (company_id, id) DO UPDATE
    SET data = public.cash_movements.data
  RETURNING data INTO v_cash_data;

  IF v_cash_data->>'ledger_entry_id' IS DISTINCT FROM v_entry.id::text
     OR v_cash_data->>'source_id' IS DISTINCT FROM btrim(p_payment_id)
     OR v_cash_data->>'source_type' IS DISTINCT FROM 'rental_payment'
     OR COALESCE((v_cash_data->>'amount')::numeric, NULL) IS DISTINCT FROM p_amount
     OR v_cash_data->>'currency' IS DISTINCT FROM v_currency THEN
    RAISE EXCEPTION 'Existing rental payment cash movement is inconsistent';
  END IF;

  RETURN jsonb_build_object(
    'payment_id', btrim(p_payment_id),
    'rental_id', btrim(p_rental_id),
    'payment', v_payment_data,
    'rental', v_rental.data || jsonb_build_object(
      'paidAmount', v_paid_amount + p_amount,
      'remaining', v_remaining - p_amount
    ),
    'ledger_entry_id', v_entry.id,
    'cash_movement_id', v_cash_id,
    'idempotent', false
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.record_rental_payment(
  uuid, text, text, numeric, date, text, text, text, jsonb
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.record_rental_payment(
  uuid, text, text, numeric, date, text, text, text, jsonb
) TO authenticated;
