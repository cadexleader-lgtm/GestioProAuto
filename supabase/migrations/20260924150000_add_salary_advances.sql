-- Gestion avancee employes (item 21, phase 2/4) : avances sur salaire.
-- Nouvelle table generique (meme forme que les autres tables tenant-scoped),
-- RPC-only des la creation (aucune ecriture directe ouverte) — lecon retenue
-- de 20260923150000 (suppliers/employees avaient ete ouvertes en direct puis
-- durcies apres coup).

CREATE TABLE public.salary_advances (
  id text NOT NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (company_id, id)
);

GRANT SELECT ON public.salary_advances TO authenticated;
GRANT ALL ON public.salary_advances TO service_role;
ALTER TABLE public.salary_advances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read salary advances" ON public.salary_advances FOR SELECT TO authenticated
  USING (private.is_company_member(company_id));

CREATE TRIGGER trg_salary_advances_updated BEFORE UPDATE ON public.salary_advances
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE UNIQUE INDEX salary_advances_company_idempotency_key_idx
  ON public.salary_advances (company_id, (data->>'idempotency_key'))
  WHERE NULLIF(data->>'idempotency_key', '') IS NOT NULL;

CREATE INDEX salary_advances_company_employee_idx
  ON public.salary_advances (company_id, (data->>'employeeId'));

CREATE OR REPLACE FUNCTION public.grant_salary_advance(
  p_company_id uuid,
  p_advance_id text,
  p_employee_id text,
  p_amount numeric,
  p_currency text,
  p_method text,
  p_granted_at timestamptz,
  p_note text,
  p_idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $function$
DECLARE
  v_employee public.employees;
  v_existing public.salary_advances;
  v_entry public.ledger_entries;
  v_cash_data jsonb;
  v_advance_data jsonb;
  v_advance_id text := btrim(COALESCE(p_advance_id, ''));
  v_employee_id text := btrim(COALESCE(p_employee_id, ''));
  v_currency text := upper(btrim(COALESCE(p_currency, '')));
  v_method text := btrim(COALESCE(p_method, ''));
  v_idempotency_key text := btrim(COALESCE(p_idempotency_key, ''));
  v_cash_id text;
  v_name text;
  v_balance numeric;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  IF p_company_id IS NULL OR NOT private.is_company_member(p_company_id) THEN
    RAISE EXCEPTION 'User is not a member of this company' USING ERRCODE = '42501';
  END IF;

  IF NOT private.company_role_at_least(p_company_id, 'manager'::public.app_role) THEN
    RAISE EXCEPTION 'Insufficient permissions to grant a salary advance'
      USING ERRCODE = '42501';
  END IF;

  IF v_advance_id = '' OR v_employee_id = '' THEN
    RAISE EXCEPTION 'Advance id and employee id must not be empty' USING ERRCODE = '22023';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than zero' USING ERRCODE = '22003';
  END IF;
  IF v_currency = '' OR v_method = '' OR v_idempotency_key = '' THEN
    RAISE EXCEPTION 'Currency, payment method and idempotency key must not be empty'
      USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_existing FROM public.salary_advances
   WHERE company_id = p_company_id AND data->>'idempotency_key' = v_idempotency_key;

  IF FOUND THEN
    RETURN jsonb_build_object('advance_id', v_existing.id, 'advance', v_existing.data, 'idempotent', true);
  END IF;

  SELECT * INTO v_employee FROM public.employees
   WHERE company_id = p_company_id AND id = v_employee_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Employee not found' USING ERRCODE = 'P0002';
  END IF;
  IF COALESCE(v_employee.data->>'status', '') = 'inactive' THEN
    RAISE EXCEPTION 'Cannot grant an advance to an inactive employee' USING ERRCODE = '55000';
  END IF;

  v_balance := private.cash_account_balance(p_company_id, v_method);
  IF v_balance < p_amount THEN
    RAISE EXCEPTION 'Solde insuffisant sur %', private.normalize_cash_account(v_method)
      USING ERRCODE = '23514',
            DETAIL = format('Disponible : %s FCFA. Avance demandee : %s FCFA.', to_char(v_balance, 'FM999G999G999G999'), to_char(p_amount, 'FM999G999G999G999')),
            HINT = format('Faites d''abord un virement vers %s, puis reessayez cette avance.', private.normalize_cash_account(v_method));
  END IF;

  v_name := btrim(COALESCE(v_employee.data->>'firstName', '') || ' ' || COALESCE(v_employee.data->>'lastName', ''));
  v_cash_id := 'advance-cash:' || v_advance_id;

  INSERT INTO public.ledger_entries (
    company_id, source_module, source_type, source_id, cash_account_id,
    direction, amount, currency, occurred_at, status, idempotency_key,
    description, metadata, created_by
  )
  VALUES (
    p_company_id, 'hr', 'salary_advance', v_advance_id, v_method,
    'out', p_amount, v_currency, COALESCE(p_granted_at, now()), 'posted',
    'salary-advance:' || v_idempotency_key,
    'Avance sur salaire — ' || v_name,
    jsonb_build_object('employee_id', v_employee_id, 'advance_id', v_advance_id),
    auth.uid()
  )
  RETURNING * INTO v_entry;

  INSERT INTO public.cash_movements (id, company_id, data)
  VALUES (
    v_cash_id, p_company_id,
    jsonb_build_object(
      'type', 'out', 'label', 'Avance sur salaire — ' || v_name, 'amount', p_amount,
      'date', v_entry.occurred_at, 'currency', v_currency, 'source', v_method,
      'source_type', 'salary_advance', 'source_id', v_advance_id,
      'employeeId', v_employee_id, 'ledger_entry_id', v_entry.id,
      'idempotency_key', v_idempotency_key
    )
  )
  RETURNING data INTO v_cash_data;

  v_advance_data := jsonb_build_object(
    'employeeId', v_employee_id,
    'amount', p_amount,
    'remainingAmount', p_amount,
    'currency', v_currency,
    'method', v_method,
    'grantedAt', v_entry.occurred_at,
    'note', COALESCE(btrim(p_note), ''),
    'status', 'outstanding',
    'ledgerEntryId', v_entry.id,
    'cashMovementId', v_cash_id,
    'idempotency_key', v_idempotency_key
  );

  INSERT INTO public.salary_advances (id, company_id, data)
  VALUES (v_advance_id, p_company_id, v_advance_data);

  RETURN jsonb_build_object(
    'advance_id', v_advance_id,
    'advance', v_advance_data,
    'cash_movement_id', v_cash_id,
    'cash', v_cash_data,
    'ledger_entry_id', v_entry.id,
    'idempotent', false
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.grant_salary_advance(
  uuid, text, text, numeric, text, text, timestamptz, text, text
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grant_salary_advance(
  uuid, text, text, numeric, text, text, timestamptz, text, text
) TO authenticated;

-- Rattache les avances en cours d'un employe a un bulletin qui vient d'etre
-- pose, pour eviter de les rededuire au mois suivant. N'effectue aucun
-- mouvement de caisse (l'argent est deja sorti au moment de l'avance) —
-- purement une mise a jour de statut comptable.
CREATE OR REPLACE FUNCTION public.settle_salary_advances(
  p_company_id uuid,
  p_advance_ids text[],
  p_payslip_id text
)
RETURNS SETOF public.salary_advances
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  IF p_company_id IS NULL OR NOT private.is_company_member(p_company_id) THEN
    RAISE EXCEPTION 'User is not a member of this company' USING ERRCODE = '42501';
  END IF;

  IF NOT private.company_role_at_least(p_company_id, 'manager'::public.app_role) THEN
    RAISE EXCEPTION 'Insufficient permissions to settle salary advances'
      USING ERRCODE = '42501';
  END IF;

  IF p_advance_ids IS NULL OR array_length(p_advance_ids, 1) IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  UPDATE public.salary_advances
     SET data = data || jsonb_build_object(
       'status', 'settled',
       'remainingAmount', 0,
       'settledInPayslipId', btrim(COALESCE(p_payslip_id, '')),
       'settledAt', now()
     )
   WHERE company_id = p_company_id
     AND id = ANY(p_advance_ids)
     AND data->>'status' = 'outstanding'
   RETURNING *;
END;
$function$;

REVOKE ALL ON FUNCTION public.settle_salary_advances(uuid, text[], text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.settle_salary_advances(uuid, text[], text) TO authenticated;
