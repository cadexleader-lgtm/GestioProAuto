CREATE UNIQUE INDEX IF NOT EXISTS rentals_company_return_idempotency_key_idx
  ON public.rentals (company_id, ((data->>'return_idempotency_key')))
  WHERE NULLIF(data->>'return_idempotency_key', '') IS NOT NULL;

CREATE OR REPLACE FUNCTION public.record_vehicle_rental_return(
  p_company_id uuid,
  p_rental_id text,
  p_return_date date,
  p_return_km numeric,
  p_fuel_level text,
  p_condition_note text,
  p_payment_id text,
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
  v_vehicle_data jsonb;
  v_existing_payment public.rental_payments;
  v_payment_data jsonb;
  v_cash_data jsonb;
  v_entry public.ledger_entries;
  v_total numeric;
  v_advance numeric;
  v_paid_amount numeric;
  v_remaining numeric;
  v_return_payment_id text;
  v_cash_id text;
  v_currency text := upper(btrim(COALESCE(p_currency, '')));
  v_method text := btrim(COALESCE(p_method, ''));
  v_idempotency_key text := btrim(COALESCE(p_idempotency_key, ''));
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  IF p_company_id IS NULL OR NOT private.is_company_member(p_company_id) THEN
    RAISE EXCEPTION 'User is not a member of this company' USING ERRCODE = '42501';
  END IF;

  IF NOT private.company_role_at_least(p_company_id, 'manager'::public.app_role) THEN
    RAISE EXCEPTION 'Insufficient permissions to record a rental return'
      USING ERRCODE = '42501';
  END IF;

  IF NULLIF(btrim(COALESCE(p_rental_id, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Rental id must not be empty' USING ERRCODE = '22023';
  END IF;
  IF p_return_date IS NULL THEN
    RAISE EXCEPTION 'Return date must not be empty' USING ERRCODE = '22023';
  END IF;
  IF p_return_km IS NULL OR p_return_km < 0 OR p_return_km <> trunc(p_return_km) THEN
    RAISE EXCEPTION 'Return mileage is invalid' USING ERRCODE = '22023';
  END IF;
  IF v_idempotency_key = '' THEN
    RAISE EXCEPTION 'Idempotency key must not be empty' USING ERRCODE = '22023';
  END IF;

  SELECT *
    INTO v_rental
    FROM public.rentals
   WHERE company_id = p_company_id
     AND data->>'return_idempotency_key' = v_idempotency_key
   FOR UPDATE;

  IF FOUND THEN
    IF v_rental.id IS DISTINCT FROM btrim(p_rental_id) THEN
      RAISE EXCEPTION 'Return idempotency key is already used by another rental'
        USING ERRCODE = '23505';
    END IF;

    SELECT data
      INTO v_vehicle_data
      FROM public.vehicles
     WHERE company_id = p_company_id
       AND id = v_rental.data->>'vehicleId'
     FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Vehicle not found for existing rental return'
        USING ERRCODE = 'P0002';
    END IF;

    v_return_payment_id := v_rental.data->>'returnPaymentId';
    IF v_return_payment_id IS NOT NULL THEN
      SELECT *
        INTO v_existing_payment
        FROM public.rental_payments
       WHERE company_id = p_company_id
         AND id = v_return_payment_id
       FOR UPDATE;

      SELECT *
        INTO v_entry
        FROM public.ledger_entries
       WHERE company_id = p_company_id
         AND source_type = 'rental_return_payment'
         AND source_id = v_return_payment_id;

      SELECT id, data
        INTO v_cash_id, v_cash_data
        FROM public.cash_movements
       WHERE company_id = p_company_id
         AND data->>'source_type' = 'rental_return_payment'
         AND data->>'source_id' = v_return_payment_id;

      IF v_existing_payment IS NULL OR v_entry IS NULL OR v_cash_id IS NULL THEN
        RAISE EXCEPTION 'Existing rental return is missing payment, ledger or cash movement';
      END IF;

      IF v_cash_data->>'ledger_entry_id' IS DISTINCT FROM v_entry.id::text
         OR v_cash_data->>'source_id' IS DISTINCT FROM v_return_payment_id
         OR v_cash_data->>'source_type' IS DISTINCT FROM 'rental_return_payment'
         OR COALESCE((v_cash_data->>'amount')::numeric, NULL) IS DISTINCT FROM
            COALESCE((v_existing_payment.data->>'amount')::numeric, NULL)
         OR v_cash_data->>'currency' IS DISTINCT FROM v_entry.currency
         OR v_cash_data->>'currency' IS DISTINCT FROM v_existing_payment.data->>'currency' THEN
        RAISE EXCEPTION 'Existing rental return cash movement is inconsistent';
      END IF;
    END IF;

    RETURN jsonb_build_object(
      'rental_id', v_rental.id,
      'rental', v_rental.data,
      'payment_id', v_return_payment_id,
      'payment', CASE WHEN v_existing_payment IS NULL THEN NULL ELSE v_existing_payment.data END,
      'ledger_entry_id', CASE WHEN v_entry IS NULL THEN NULL ELSE v_entry.id END,
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

  IF lower(COALESCE(v_rental.data->>'status', '')) NOT IN ('active', 'overdue') THEN
    RAISE EXCEPTION 'Only active or overdue rentals can be returned'
      USING ERRCODE = '55000';
  END IF;

  IF p_return_date < NULLIF(v_rental.data->>'startDate', '')::date THEN
    RAISE EXCEPTION 'Return date cannot be before rental start date'
      USING ERRCODE = '22007';
  END IF;

  SELECT data
    INTO v_vehicle_data
    FROM public.vehicles
   WHERE company_id = p_company_id
     AND id = v_rental.data->>'vehicleId'
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vehicle not found' USING ERRCODE = 'P0002';
  END IF;

  PERFORM 1
    FROM public.rental_payments
   WHERE company_id = p_company_id
     AND data->>'rentalId' = v_rental.id
   FOR UPDATE;

  v_total := (
    NULLIF(v_rental.data->>'endDate', '')::date -
     NULLIF(v_rental.data->>'startDate', '')::date + 1
  ) * COALESCE((v_rental.data->>'dailyRate')::numeric, 0);
  v_advance := COALESCE((v_rental.data->>'advance')::numeric, 0);

  SELECT COALESCE(SUM((data->>'amount')::numeric), 0)
    INTO v_paid_amount
    FROM public.rental_payments
   WHERE company_id = p_company_id
     AND data->>'rentalId' = v_rental.id;

  v_remaining := GREATEST(
    0,
    v_total - v_advance - v_paid_amount
  );

  IF v_remaining > 0 THEN
    IF NULLIF(btrim(COALESCE(p_payment_id, '')), '') IS NULL
       OR v_currency = ''
       OR v_method = '' THEN
      RAISE EXCEPTION 'Payment id, currency and payment method are required for the final balance'
        USING ERRCODE = '22023';
    END IF;

    v_return_payment_id := btrim(p_payment_id);
    v_payment_data := COALESCE(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'rentalId', v_rental.id,
      'amount', v_remaining,
      'date', p_return_date,
      'currency', v_currency,
      'method', v_method,
      'status', 'posted',
      'source_type', 'rental_return_payment',
      'idempotency_key', 'rental-return-payment:' || v_idempotency_key
    );

    INSERT INTO public.rental_payments (id, company_id, data)
    VALUES (v_return_payment_id, p_company_id, v_payment_data)
    ON CONFLICT (company_id, id) DO NOTHING;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Payment id already exists' USING ERRCODE = '23505';
    END IF;

    INSERT INTO public.ledger_entries (
      company_id, source_module, source_type, source_id, cash_account_id,
      direction, amount, currency, occurred_at, status, idempotency_key,
      description, metadata, created_by
    )
    VALUES (
      p_company_id,
      'vehicles',
      'rental_return_payment',
      v_return_payment_id,
      v_method,
      'in',
      v_remaining,
      v_currency,
      p_return_date::timestamptz,
      'posted',
      'vehicle-rental-return-payment:' || v_idempotency_key,
      'Solde retour location — ' || COALESCE(v_rental.data->>'customer', v_rental.id),
      jsonb_build_object('rental_id', v_rental.id, 'payment_id', v_return_payment_id),
      auth.uid()
    )
    ON CONFLICT (company_id, idempotency_key) DO NOTHING
    RETURNING * INTO v_entry;

    IF NOT FOUND THEN
      SELECT *
        INTO v_entry
        FROM public.ledger_entries
       WHERE company_id = p_company_id
         AND idempotency_key = 'vehicle-rental-return-payment:' || v_idempotency_key;
    END IF;

    IF v_entry IS NULL THEN
      RAISE EXCEPTION 'Unable to create or retrieve rental return ledger entry';
    END IF;

    v_cash_id := 'vehicle-rental-return-payment:' || v_entry.id::text;

    INSERT INTO public.cash_movements (id, company_id, data)
    VALUES (
      v_cash_id,
      p_company_id,
      jsonb_build_object(
        'type', 'in',
        'label', 'Solde retour location — ' || COALESCE(v_rental.data->>'customer', v_rental.id),
        'amount', v_remaining,
        'date', p_return_date,
        'currency', v_currency,
        'source', v_method,
        'ledger_entry_id', v_entry.id,
        'source_module', 'vehicles',
        'source_type', 'rental_return_payment',
        'source_id', v_return_payment_id,
        'rental_id', v_rental.id,
        'idempotency_key', v_idempotency_key
      )
    )
    ON CONFLICT (company_id, id) DO NOTHING
    RETURNING data INTO v_cash_data;

    IF NOT FOUND THEN
      SELECT data
        INTO v_cash_data
        FROM public.cash_movements
       WHERE company_id = p_company_id
         AND id = v_cash_id
       FOR UPDATE;
    END IF;

    IF v_cash_data IS NULL THEN
      RAISE EXCEPTION 'Unable to create or retrieve rental return cash movement';
    END IF;

    IF v_cash_data->>'ledger_entry_id' IS DISTINCT FROM v_entry.id::text
       OR v_cash_data->>'source_id' IS DISTINCT FROM v_return_payment_id
       OR v_cash_data->>'source_type' IS DISTINCT FROM 'rental_return_payment'
       OR COALESCE((v_cash_data->>'amount')::numeric, NULL) IS DISTINCT FROM v_remaining
       OR v_cash_data->>'currency' IS DISTINCT FROM v_currency THEN
      RAISE EXCEPTION 'Existing rental return cash movement is inconsistent';
    END IF;
  END IF;

  UPDATE public.rentals
     SET data = v_rental.data || COALESCE(p_metadata, '{}'::jsonb) || jsonb_build_object(
       'status', 'returned',
       'returnedAt', p_return_date,
       'returnKm', p_return_km,
       'fuelLevel', btrim(COALESCE(p_fuel_level, '')),
       'conditionNote', btrim(COALESCE(p_condition_note, '')),
       'paidAmount', v_paid_amount + v_remaining,
       'remaining', 0,
       'return_idempotency_key', v_idempotency_key,
       'returnPaymentId', v_return_payment_id
     )
   WHERE company_id = p_company_id
     AND id = v_rental.id;

  UPDATE public.vehicles
     SET data = v_vehicle_data || jsonb_build_object(
       'status', 'available',
       'mileageKm', p_return_km
     )
   WHERE company_id = p_company_id
     AND id = v_rental.data->>'vehicleId';

  RETURN jsonb_build_object(
    'rental_id', v_rental.id,
    'rental', v_rental.data || COALESCE(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'status', 'returned',
      'returnedAt', p_return_date,
      'returnKm', p_return_km,
      'fuelLevel', btrim(COALESCE(p_fuel_level, '')),
      'conditionNote', btrim(COALESCE(p_condition_note, '')),
      'paidAmount', v_paid_amount + v_remaining,
      'remaining', 0,
      'return_idempotency_key', v_idempotency_key,
      'returnPaymentId', v_return_payment_id
    ),
    'payment_id', v_return_payment_id,
    'ledger_entry_id', CASE WHEN v_entry IS NULL THEN NULL ELSE v_entry.id END,
    'cash_movement_id', v_cash_id,
    'idempotent', false
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.record_vehicle_rental_return(
  uuid, text, date, numeric, text, text, text, text, text, text, jsonb
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.record_vehicle_rental_return(
  uuid, text, date, numeric, text, text, text, text, text, text, jsonb
) TO authenticated;
