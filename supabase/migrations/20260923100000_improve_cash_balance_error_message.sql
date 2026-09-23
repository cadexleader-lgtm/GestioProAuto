-- Message d'erreur plus explicite quand le solde d'un compte est insuffisant :
-- indique le solde disponible, le montant demande, et suggere de faire un
-- virement depuis un autre compte avant de retenter la sortie.

CREATE OR REPLACE FUNCTION public.record_cash_movement(
  p_company_id uuid,
  p_movement_id text,
  p_type text,
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
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_entry public.ledger_entries;
  v_cash_id text;
  v_balance numeric;
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
    RAISE EXCEPTION 'Insufficient permissions to record a cash movement'
      USING ERRCODE = '42501';
  END IF;

  IF p_type IS NULL OR p_type NOT IN ('in', 'out') THEN
    RAISE EXCEPTION 'Movement type must be in or out'
      USING ERRCODE = '22023';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than zero'
      USING ERRCODE = '22003';
  END IF;

  IF p_idempotency_key IS NULL OR btrim(p_idempotency_key) = '' THEN
    RAISE EXCEPTION 'Idempotency key must not be empty'
      USING ERRCODE = '22023';
  END IF;

  IF p_movement_id IS NULL OR btrim(p_movement_id) = '' THEN
    RAISE EXCEPTION 'Movement id must not be empty'
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

  IF NOT EXISTS (
    SELECT 1 FROM public.ledger_entries
     WHERE company_id = p_company_id AND idempotency_key = btrim(p_idempotency_key)
  ) AND p_type = 'out' THEN
    v_balance := private.cash_account_balance(p_company_id, p_cash_account_id);
    IF v_balance < p_amount THEN
      RAISE EXCEPTION 'Solde insuffisant sur %', private.normalize_cash_account(p_cash_account_id)
        USING ERRCODE = '23514',
              DETAIL = format(
                'Disponible : %s FCFA. Montant demandé : %s FCFA.',
                to_char(v_balance, 'FM999G999G999G999'),
                to_char(p_amount, 'FM999G999G999G999')
              ),
              HINT = format(
                'Faites d''abord un virement vers %s depuis un autre compte (Caisse principale, Wave, Orange Money, Banque), puis réessayez cette sortie.',
                private.normalize_cash_account(p_cash_account_id)
              );
    END IF;
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
    'manual_cash_movement',
    btrim(p_movement_id),
    btrim(p_cash_account_id),
    p_type,
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

  v_cash_id := 'manual-cash:' || v_entry.id::text;

  INSERT INTO public.cash_movements (
    id,
    company_id,
    data
  )
  VALUES (
    v_cash_id,
    p_company_id,
    jsonb_build_object(
      'type', v_entry.direction,
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

CREATE OR REPLACE FUNCTION public.record_cash_transfer(
  p_company_id uuid,
  p_transfer_id text,
  p_source_account_id text,
  p_destination_account_id text,
  p_amount numeric,
  p_currency text,
  p_occurred_at timestamptz,
  p_idempotency_key text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_out_entry public.ledger_entries;
  v_in_entry public.ledger_entries;
  v_out_key text;
  v_in_key text;
  v_out_cash_id text;
  v_in_cash_id text;
  v_balance numeric;
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
    RAISE EXCEPTION 'Insufficient permissions to record a cash transfer'
      USING ERRCODE = '42501';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than zero'
      USING ERRCODE = '22003';
  END IF;

  IF p_idempotency_key IS NULL OR btrim(p_idempotency_key) = '' THEN
    RAISE EXCEPTION 'Idempotency key must not be empty'
      USING ERRCODE = '22023';
  END IF;

  IF p_transfer_id IS NULL OR btrim(p_transfer_id) = '' THEN
    RAISE EXCEPTION 'Transfer id must not be empty'
      USING ERRCODE = '22023';
  END IF;

  IF p_source_account_id IS NULL OR btrim(p_source_account_id) = ''
     OR p_destination_account_id IS NULL OR btrim(p_destination_account_id) = '' THEN
    RAISE EXCEPTION 'Source and destination accounts must not be empty'
      USING ERRCODE = '22023';
  END IF;

  IF private.normalize_cash_account(p_source_account_id) = private.normalize_cash_account(p_destination_account_id) THEN
    RAISE EXCEPTION 'Source and destination accounts must differ'
      USING ERRCODE = '22023';
  END IF;

  IF p_currency IS NULL OR btrim(p_currency) = '' THEN
    RAISE EXCEPTION 'Currency must not be empty'
      USING ERRCODE = '22023';
  END IF;

  v_out_key := btrim(p_idempotency_key) || ':out';
  v_in_key := btrim(p_idempotency_key) || ':in';

  IF NOT EXISTS (
    SELECT 1 FROM public.ledger_entries WHERE company_id = p_company_id AND idempotency_key = v_out_key
  ) THEN
    v_balance := private.cash_account_balance(p_company_id, p_source_account_id);
    IF v_balance < p_amount THEN
      RAISE EXCEPTION 'Solde insuffisant sur %', private.normalize_cash_account(p_source_account_id)
        USING ERRCODE = '23514',
              DETAIL = format(
                'Disponible : %s FCFA. Montant demandé : %s FCFA.',
                to_char(v_balance, 'FM999G999G999G999'),
                to_char(p_amount, 'FM999G999G999G999')
              ),
              HINT = format(
                'Faites d''abord un virement vers %s depuis un autre compte (Caisse principale, Wave, Orange Money, Banque), puis réessayez.',
                private.normalize_cash_account(p_source_account_id)
              );
    END IF;
  END IF;

  INSERT INTO public.ledger_entries (
    company_id, source_module, source_type, source_id, cash_account_id,
    direction, amount, currency, occurred_at, status, idempotency_key,
    description, metadata, created_by
  )
  VALUES (
    p_company_id, 'finance', 'manual_cash_transfer', btrim(p_transfer_id) || ':out',
    btrim(p_source_account_id), 'out', p_amount, upper(btrim(p_currency)),
    COALESCE(p_occurred_at, now()), 'posted', v_out_key,
    'Transfert vers ' || btrim(p_destination_account_id),
    COALESCE(p_metadata, '{}'::jsonb) || jsonb_build_object('transferId', btrim(p_transfer_id)),
    auth.uid()
  )
  ON CONFLICT (company_id, idempotency_key) DO NOTHING
  RETURNING * INTO v_out_entry;

  IF NOT FOUND THEN
    SELECT * INTO v_out_entry FROM public.ledger_entries
     WHERE company_id = p_company_id AND idempotency_key = v_out_key;
  END IF;

  INSERT INTO public.ledger_entries (
    company_id, source_module, source_type, source_id, cash_account_id,
    direction, amount, currency, occurred_at, status, idempotency_key,
    description, metadata, created_by
  )
  VALUES (
    p_company_id, 'finance', 'manual_cash_transfer', btrim(p_transfer_id) || ':in',
    btrim(p_destination_account_id), 'in', p_amount, upper(btrim(p_currency)),
    COALESCE(p_occurred_at, now()), 'posted', v_in_key,
    'Transfert depuis ' || btrim(p_source_account_id),
    COALESCE(p_metadata, '{}'::jsonb) || jsonb_build_object('transferId', btrim(p_transfer_id)),
    auth.uid()
  )
  ON CONFLICT (company_id, idempotency_key) DO NOTHING
  RETURNING * INTO v_in_entry;

  IF NOT FOUND THEN
    SELECT * INTO v_in_entry FROM public.ledger_entries
     WHERE company_id = p_company_id AND idempotency_key = v_in_key;
  END IF;

  IF v_out_entry IS NULL OR v_in_entry IS NULL THEN
    RAISE EXCEPTION 'Unable to create or retrieve transfer ledger entries';
  END IF;

  v_out_cash_id := 'manual-cash:' || v_out_entry.id::text;
  v_in_cash_id := 'manual-cash:' || v_in_entry.id::text;

  INSERT INTO public.cash_movements (id, company_id, data)
  VALUES (
    v_out_cash_id, p_company_id,
    jsonb_build_object(
      'type', 'out', 'label', v_out_entry.description, 'amount', v_out_entry.amount,
      'date', v_out_entry.occurred_at, 'source', v_out_entry.cash_account_id,
      'ledger_entry_id', v_out_entry.id, 'source_module', v_out_entry.source_module,
      'source_type', v_out_entry.source_type, 'source_id', v_out_entry.source_id,
      'idempotency_key', v_out_entry.idempotency_key
    )
  )
  ON CONFLICT (company_id, id) DO NOTHING;

  INSERT INTO public.cash_movements (id, company_id, data)
  VALUES (
    v_in_cash_id, p_company_id,
    jsonb_build_object(
      'type', 'in', 'label', v_in_entry.description, 'amount', v_in_entry.amount,
      'date', v_in_entry.occurred_at, 'source', v_in_entry.cash_account_id,
      'ledger_entry_id', v_in_entry.id, 'source_module', v_in_entry.source_module,
      'source_type', v_in_entry.source_type, 'source_id', v_in_entry.source_id,
      'idempotency_key', v_in_entry.idempotency_key
    )
  )
  ON CONFLICT (company_id, id) DO NOTHING;

  RETURN jsonb_build_object(
    'out', to_jsonb(v_out_entry),
    'in', to_jsonb(v_in_entry)
  );
END;
$function$;
