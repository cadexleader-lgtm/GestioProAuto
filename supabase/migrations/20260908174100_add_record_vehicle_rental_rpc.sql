CREATE UNIQUE INDEX IF NOT EXISTS rentals_company_idempotency_key_idx
  ON public.rentals (company_id, ((data->>'idempotency_key')))
  WHERE NULLIF(data->>'idempotency_key', '') IS NOT NULL;

CREATE OR REPLACE FUNCTION public.record_vehicle_rental(
  p_company_id uuid,
  p_rental_id text,
  p_vehicle_id text,
  p_customer text,
  p_phone text,
  p_address text,
  p_id_document text,
  p_license_number text,
  p_start_date date,
  p_end_date date,
  p_start_time text,
  p_end_time text,
  p_daily_rate numeric,
  p_deposit numeric,
  p_advance numeric,
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
  v_existing_rental public.rentals;
  v_existing_cash_data jsonb;
  v_vehicle_data jsonb;
  v_rental_data jsonb;
  v_entry public.ledger_entries;
  v_days integer;
  v_total_amount numeric;
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
    RAISE EXCEPTION 'Insufficient permissions to record a vehicle rental'
      USING ERRCODE = '42501';
  END IF;

  IF NULLIF(btrim(COALESCE(p_rental_id, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Rental id must not be empty' USING ERRCODE = '22023';
  END IF;
  IF NULLIF(btrim(COALESCE(p_vehicle_id, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Vehicle id must not be empty' USING ERRCODE = '22023';
  END IF;
  IF NULLIF(btrim(COALESCE(p_customer, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Customer must not be empty' USING ERRCODE = '22023';
  END IF;
  IF p_start_date IS NULL OR p_end_date IS NULL OR p_end_date < p_start_date THEN
    RAISE EXCEPTION 'Rental dates are invalid' USING ERRCODE = '22023';
  END IF;
  IF p_daily_rate IS NULL OR p_daily_rate <= 0 THEN
    RAISE EXCEPTION 'Daily rate must be greater than zero' USING ERRCODE = '22003';
  END IF;
  IF p_deposit IS NULL OR p_deposit < 0 THEN
    RAISE EXCEPTION 'Deposit must not be negative' USING ERRCODE = '22003';
  END IF;
  IF p_advance IS NULL OR p_advance < 0 THEN
    RAISE EXCEPTION 'Advance must not be negative' USING ERRCODE = '22003';
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

  v_days := (p_end_date - p_start_date) + 1;
  v_total_amount := v_days * p_daily_rate;
  v_remaining := v_total_amount - p_advance;

  IF p_advance > v_total_amount THEN
    RAISE EXCEPTION 'Advance exceeds the rental total' USING ERRCODE = '22003';
  END IF;

  SELECT *
    INTO v_existing_rental
    FROM public.rentals
   WHERE company_id = p_company_id
     AND data->>'idempotency_key' = v_idempotency_key
   FOR UPDATE;

  IF FOUND THEN
    IF v_existing_rental.id IS DISTINCT FROM btrim(p_rental_id)
       OR v_existing_rental.data->>'vehicleId' IS DISTINCT FROM btrim(p_vehicle_id) THEN
      RAISE EXCEPTION 'Idempotency key is already used by another vehicle rental'
        USING ERRCODE = '23505';
    END IF;

    IF COALESCE((v_existing_rental.data->>'advance')::numeric, 0) > 0 THEN
      SELECT *
        INTO v_entry
        FROM public.ledger_entries
       WHERE company_id = p_company_id
         AND source_type = 'rental_advance'
         AND source_id = v_existing_rental.id;

      SELECT id, data
        INTO v_cash_id, v_existing_cash_data
        FROM public.cash_movements
       WHERE company_id = p_company_id
         AND data->>'source_type' = 'rental_advance'
         AND data->>'source_id' = v_existing_rental.id;

      IF v_entry IS NULL OR v_cash_id IS NULL THEN
        RAISE EXCEPTION 'Existing rental advance is missing its ledger or cash movement';
      END IF;

      IF v_existing_cash_data->>'ledger_entry_id' IS DISTINCT FROM v_entry.id::text
         OR v_existing_cash_data->>'source_id' IS DISTINCT FROM v_existing_rental.id
         OR v_existing_cash_data->>'source_type' IS DISTINCT FROM 'rental_advance'
         OR COALESCE((v_existing_cash_data->>'amount')::numeric, NULL) IS DISTINCT FROM
            COALESCE((v_existing_rental.data->>'advance')::numeric, NULL)
         OR (
           v_existing_cash_data ? 'currency'
           AND v_existing_cash_data->>'currency' IS DISTINCT FROM v_entry.currency
         ) THEN
        RAISE EXCEPTION 'Existing rental advance cash movement is inconsistent';
      END IF;
    ELSE
      SELECT *
        INTO v_entry
        FROM public.ledger_entries
       WHERE company_id = p_company_id
         AND source_type = 'rental_advance'
         AND source_id = v_existing_rental.id;

      SELECT id
        INTO v_cash_id
        FROM public.cash_movements
       WHERE company_id = p_company_id
         AND data->>'source_type' = 'rental_advance'
         AND data->>'source_id' = v_existing_rental.id;

      IF v_entry IS NOT NULL OR v_cash_id IS NOT NULL THEN
        RAISE EXCEPTION 'Zero-advance rental has unexpected financial entries';
      END IF;
    END IF;

    RETURN jsonb_build_object(
      'rental_id', v_existing_rental.id,
      'rental', v_existing_rental.data,
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

  IF lower(COALESCE(v_vehicle_data->>'status', '')) <> 'available' THEN
    RAISE EXCEPTION 'Vehicle is not available' USING ERRCODE = '55000';
  END IF;

  v_rental_data := COALESCE(p_metadata, '{}'::jsonb) || jsonb_build_object(
    'vehicleId', btrim(p_vehicle_id),
    'customer', btrim(p_customer),
    'phone', btrim(COALESCE(p_phone, '')),
    'address', btrim(COALESCE(p_address, '')),
    'idDocument', btrim(COALESCE(p_id_document, '')),
    'licenseNumber', btrim(COALESCE(p_license_number, '')),
    'startDate', p_start_date,
    'endDate', p_end_date,
    'startTime', btrim(COALESCE(p_start_time, '')),
    'endTime', btrim(COALESCE(p_end_time, '')),
    'dailyRate', p_daily_rate,
    'deposit', p_deposit,
    'advance', p_advance,
    'totalAmount', v_total_amount,
    'remaining', v_remaining,
    'status', 'active',
    'idempotency_key', v_idempotency_key
  );

  INSERT INTO public.rentals (id, company_id, data)
  VALUES (btrim(p_rental_id), p_company_id, v_rental_data)
  ON CONFLICT (company_id, id) DO NOTHING;

  IF NOT FOUND THEN
    SELECT *
      INTO v_existing_rental
      FROM public.rentals
     WHERE company_id = p_company_id
       AND id = btrim(p_rental_id);

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Unable to create or retrieve rental';
    END IF;

    IF v_existing_rental.data->>'idempotency_key' IS DISTINCT FROM v_idempotency_key THEN
      RAISE EXCEPTION 'Rental id is already used by another operation'
        USING ERRCODE = '23505';
    END IF;

    RETURN jsonb_build_object(
      'rental_id', v_existing_rental.id,
      'rental', v_existing_rental.data,
      'ledger_entry_id', NULL,
      'cash_movement_id', NULL,
      'idempotent', true
    );
  END IF;

  UPDATE public.vehicles
     SET data = v_vehicle_data || jsonb_build_object('status', 'rented')
   WHERE company_id = p_company_id
     AND id = btrim(p_vehicle_id);

  IF p_advance > 0 THEN
    INSERT INTO public.ledger_entries (
      company_id, source_module, source_type, source_id, cash_account_id,
      direction, amount, currency, occurred_at, status, idempotency_key,
      description, metadata, created_by
    )
    VALUES (
      p_company_id,
      'vehicles',
      'rental_advance',
      btrim(p_rental_id),
      v_method,
      'in',
      p_advance,
      v_currency,
      p_start_date::timestamptz,
      'posted',
      'vehicle-rental-advance:' || v_idempotency_key,
      'Avance location — ' || btrim(p_customer),
      jsonb_build_object(
        'rental_id', btrim(p_rental_id),
        'vehicle_id', btrim(p_vehicle_id),
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
         AND idempotency_key = 'vehicle-rental-advance:' || v_idempotency_key;
    END IF;

    IF v_entry IS NULL THEN
      RAISE EXCEPTION 'Unable to create or retrieve rental advance ledger entry';
    END IF;

    v_cash_id := 'vehicle-rental-advance:' || v_entry.id::text;

    INSERT INTO public.cash_movements (id, company_id, data)
    VALUES (
      v_cash_id,
      p_company_id,
      jsonb_build_object(
        'type', 'in',
        'label', 'Avance location — ' || btrim(p_customer),
        'amount', p_advance,
        'date', p_start_date,
        'source', v_method,
        'currency', v_currency,
        'ledger_entry_id', v_entry.id,
        'source_module', 'vehicles',
        'source_type', 'rental_advance',
        'source_id', btrim(p_rental_id),
        'rental_id', btrim(p_rental_id),
        'idempotency_key', v_idempotency_key
      )
    )
    ON CONFLICT (company_id, id) DO UPDATE
      SET data = public.cash_movements.data
    RETURNING id, data INTO v_cash_id, v_existing_cash_data;

    IF v_existing_cash_data->>'ledger_entry_id' IS DISTINCT FROM v_entry.id::text
       OR v_existing_cash_data->>'source_id' IS DISTINCT FROM btrim(p_rental_id)
       OR v_existing_cash_data->>'source_type' IS DISTINCT FROM 'rental_advance'
       OR COALESCE((v_existing_cash_data->>'amount')::numeric, NULL) IS DISTINCT FROM p_advance
       OR (
         v_existing_cash_data ? 'currency'
         AND v_existing_cash_data->>'currency' IS DISTINCT FROM v_currency
       ) THEN
      RAISE EXCEPTION 'Existing rental advance cash movement is inconsistent';
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'rental_id', btrim(p_rental_id),
    'rental', v_rental_data,
    'vehicle_id', btrim(p_vehicle_id),
    'vehicle_status', 'rented',
    'ledger_entry_id', CASE WHEN v_entry IS NULL THEN NULL ELSE v_entry.id END,
    'cash_movement_id', v_cash_id,
    'idempotent', false
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.record_vehicle_rental(
  uuid, text, text, text, text, text, text, text, date, date, text, text,
  numeric, numeric, numeric, text, text, text, jsonb
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.record_vehicle_rental(
  uuid, text, text, text, text, text, text, text, date, date, text, text,
  numeric, numeric, numeric, text, text, text, jsonb
) TO authenticated;
