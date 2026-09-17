CREATE OR REPLACE FUNCTION public.record_manual_expense(
  p_company_id uuid,
  p_source_id text,
  p_cash_account_id text,
  p_amount numeric,
  p_currency text,
  p_occurred_at timestamptz,
  p_idempotency_key text,
  p_description text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS public.ledger_entries
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
DECLARE
  v_entry public.ledger_entries;
  v_cash_id text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '28000';
  END IF;

  IF p_company_id IS NULL
     OR NOT private.is_company_member(p_company_id) THEN
    RAISE EXCEPTION 'User is not a member of this company'
      USING ERRCODE = '42501';
  END IF;

  IF NOT private.company_role_at_least(p_company_id, 'manager'::public.app_role) THEN
    RAISE EXCEPTION 'Insufficient permissions to record an expense'
      USING ERRCODE = '42501';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Expense amount must be greater than zero'
      USING ERRCODE = '22003';
  END IF;

  IF p_idempotency_key IS NULL OR btrim(p_idempotency_key) = '' THEN
    RAISE EXCEPTION 'Idempotency key must not be empty'
      USING ERRCODE = '22023';
  END IF;

  IF p_source_id IS NULL OR btrim(p_source_id) = '' THEN
    RAISE EXCEPTION 'Source id must not be empty'
      USING ERRCODE = '22023';
  END IF;

  IF p_cash_account_id IS NULL OR btrim(p_cash_account_id) = '' THEN
    RAISE EXCEPTION 'Cash account id must not be empty'
      USING ERRCODE = '22023';
  END IF;

  IF p_currency IS NULL OR btrim(p_currency) = '' THEN
    RAISE EXCEPTION 'Currency must not be empty'
      USING ERRCODE = '22023';
  END IF;

  IF p_description IS NULL OR btrim(p_description) = '' THEN
    RAISE EXCEPTION 'Description must not be empty'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.ledger_entries (
    company_id,
    source_module,
    source_type,
    source_id,
    cash_account_id,
    direction,
    amount,
    currency,
    occurred_at,
    status,
    idempotency_key,
    description,
    metadata,
    created_by
  )
  VALUES (
    p_company_id,
    'finance',
    'manual_expense',
    btrim(p_source_id),
    btrim(p_cash_account_id),
    'out',
    p_amount,
    upper(btrim(p_currency)),
    COALESCE(p_occurred_at, now()),
    'posted',
    btrim(p_idempotency_key),
    btrim(p_description),
    COALESCE(p_metadata, '{}'::jsonb),
    auth.uid()
  )
  ON CONFLICT (company_id, idempotency_key) DO NOTHING
  RETURNING * INTO v_entry;

  IF NOT FOUND THEN
    SELECT *
      INTO v_entry
      FROM public.ledger_entries
     WHERE company_id = p_company_id
       AND idempotency_key = btrim(p_idempotency_key);
  END IF;

  IF v_entry IS NULL THEN
    RAISE EXCEPTION 'Unable to create or retrieve ledger entry';
  END IF;

  v_cash_id := 'manual-expense:' || v_entry.id::text;

  INSERT INTO public.cash_movements (
    id,
    company_id,
    data
  )
  VALUES (
    v_cash_id,
    p_company_id,
    jsonb_build_object(
      'type', 'out',
      'label', v_entry.description,
      'amount', v_entry.amount,
      'date', v_entry.occurred_at,
      'source', v_entry.cash_account_id,
      'ledger_entry_id', v_entry.id,
      'source_module', v_entry.source_module,
      'source_type', v_entry.source_type,
      'source_id', v_entry.source_id,
      'idempotency_key', v_entry.idempotency_key
    )
  )
  ON CONFLICT (company_id, id) DO NOTHING;

  RETURN v_entry;
END;
$function$;

REVOKE ALL ON FUNCTION public.record_manual_expense(
  uuid, text, text, numeric, text, timestamptz, text, text, jsonb
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.record_manual_expense(
  uuid, text, text, numeric, text, timestamptz, text, text, jsonb
) TO authenticated;
