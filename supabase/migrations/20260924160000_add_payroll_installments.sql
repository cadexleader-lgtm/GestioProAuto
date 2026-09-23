-- Gestion avancee employes (item 21, phase 3/4) : paiements partiels de
-- salaire (acompte puis solde). Le bulletin reste un document unique par
-- employe/mois (index deja en place, payslips_company_employee_month_idx) ;
-- chaque versement ajoute une ligne dans data->'installments' et cree ses
-- propres ecritures financieres (depense/mouvement de caisse/ledger), jusqu'a
-- ce que le solde restant atteigne zero et que le statut passe a 'posted'.

CREATE OR REPLACE FUNCTION public.record_payroll_installment(
  p_company_id uuid,
  p_payment_id text,
  p_employee_id text,
  p_month text,
  p_base_salary numeric,
  p_bonuses numeric,
  p_deductions numeric,
  p_advances numeric,
  p_amount numeric,
  p_currency text,
  p_method text,
  p_paid_at timestamptz,
  p_idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $function$
DECLARE
  v_employee public.employees;
  v_payslip public.payslips;
  v_installments jsonb;
  v_existing_installment jsonb;
  v_net_due numeric;
  v_remaining numeric;
  v_paid_so_far numeric;
  v_new_status text;
  v_entry public.ledger_entries;
  v_expense_id text;
  v_cash_id text;
  v_expense_data jsonb;
  v_cash_data jsonb;
  v_document_id text;
  v_document_data jsonb;
  v_currency text := upper(btrim(COALESCE(p_currency, '')));
  v_method text := btrim(COALESCE(p_method, ''));
  v_month text := btrim(COALESCE(p_month, ''));
  v_idempotency_key text := btrim(COALESCE(p_idempotency_key, ''));
  v_payment_id text := btrim(COALESCE(p_payment_id, ''));
  v_employee_id text := btrim(COALESCE(p_employee_id, ''));
  v_payslip_id text;
  v_name text;
  v_balance numeric;
  v_is_first boolean := false;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  IF p_company_id IS NULL OR NOT private.is_company_member(p_company_id) THEN
    RAISE EXCEPTION 'User is not a member of this company' USING ERRCODE = '42501';
  END IF;

  IF NOT private.company_role_at_least(p_company_id, 'manager'::public.app_role) THEN
    RAISE EXCEPTION 'Insufficient permissions to record payroll' USING ERRCODE = '42501';
  END IF;

  IF v_payment_id = '' OR v_employee_id = '' THEN
    RAISE EXCEPTION 'Payment id and employee id must not be empty' USING ERRCODE = '22023';
  END IF;
  IF v_month !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' THEN
    RAISE EXCEPTION 'Payroll month must use YYYY-MM format' USING ERRCODE = '22023';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Installment amount must be greater than zero' USING ERRCODE = '22003';
  END IF;
  IF v_currency = '' OR v_method = '' OR v_idempotency_key = '' THEN
    RAISE EXCEPTION 'Currency, payment method and idempotency key must not be empty'
      USING ERRCODE = '22023';
  END IF;

  v_payslip_id := 'payroll-payslip:' || v_employee_id || ':' || v_month;

  SELECT * INTO v_payslip FROM public.payslips
   WHERE company_id = p_company_id AND id = v_payslip_id
   FOR UPDATE;

  IF FOUND THEN
    IF v_payslip.data->>'status' NOT IN ('partial') THEN
      RAISE EXCEPTION 'Ce mois n''est pas en paiement partiel (deja pose ou annule)'
        USING ERRCODE = '55000';
    END IF;

    -- Rejeu idempotent d'un versement deja traite.
    SELECT value INTO v_existing_installment
      FROM jsonb_array_elements(COALESCE(v_payslip.data->'installments', '[]'::jsonb))
     WHERE value->>'idempotency_key' = v_idempotency_key;

    IF v_existing_installment IS NOT NULL THEN
      RETURN jsonb_build_object(
        'payslip_id', v_payslip.id,
        'payslip', v_payslip.data,
        'installment', v_existing_installment,
        'idempotent', true
      );
    END IF;

    v_net_due := (v_payslip.data->>'netDue')::numeric;
    v_paid_so_far := (v_payslip.data->>'paidAmount')::numeric;
    v_remaining := v_net_due - v_paid_so_far;

    IF p_amount > v_remaining THEN
      RAISE EXCEPTION 'Le montant depasse le solde restant a payer (% FCFA)', v_remaining
        USING ERRCODE = '22003';
    END IF;
  ELSE
    v_is_first := true;

    SELECT * INTO v_employee FROM public.employees
     WHERE company_id = p_company_id AND id = v_employee_id
     FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Employee not found' USING ERRCODE = 'P0002';
    END IF;
    IF COALESCE(v_employee.data->>'status', '') NOT IN ('present', 'absent', 'leave') THEN
      RAISE EXCEPTION 'Employee is not active for payroll' USING ERRCODE = '55000';
    END IF;

    IF p_base_salary IS NULL OR p_base_salary < 0
       OR p_bonuses IS NULL OR p_bonuses < 0
       OR p_deductions IS NULL OR p_deductions < 0
       OR p_advances IS NULL OR p_advances < 0 THEN
      RAISE EXCEPTION 'Salary components must not be negative' USING ERRCODE = '22003';
    END IF;

    v_net_due := p_base_salary + p_bonuses - p_deductions - p_advances;
    IF v_net_due <= 0 THEN
      RAISE EXCEPTION 'Payroll net amount must be greater than zero' USING ERRCODE = '22003';
    END IF;
    IF p_amount > v_net_due THEN
      RAISE EXCEPTION 'Le premier versement ne peut pas depasser le net a payer (% FCFA)', v_net_due
        USING ERRCODE = '22003';
    END IF;

    v_paid_so_far := 0;
    v_remaining := v_net_due;
  END IF;

  v_balance := private.cash_account_balance(p_company_id, v_method);
  IF v_balance < p_amount THEN
    RAISE EXCEPTION 'Solde insuffisant sur %', private.normalize_cash_account(v_method)
      USING ERRCODE = '23514',
            DETAIL = format('Disponible : %s FCFA. Versement : %s FCFA.', to_char(v_balance, 'FM999G999G999G999'), to_char(p_amount, 'FM999G999G999G999')),
            HINT = format('Faites d''abord un virement vers %s, puis reessayez ce versement.', private.normalize_cash_account(v_method));
  END IF;

  IF v_is_first THEN
    v_name := btrim(COALESCE(v_employee.data->>'firstName', '') || ' ' || COALESCE(v_employee.data->>'lastName', ''));
  ELSE
    SELECT btrim(COALESCE(data->>'firstName', '') || ' ' || COALESCE(data->>'lastName', ''))
      INTO v_name FROM public.employees WHERE company_id = p_company_id AND id = v_employee_id;
  END IF;

  v_expense_id := 'payroll-expense:' || v_payment_id;
  v_cash_id := 'payroll-cash:' || v_payment_id;

  INSERT INTO public.ledger_entries (
    company_id, source_module, source_type, source_id, cash_account_id,
    direction, amount, currency, occurred_at, status, idempotency_key,
    description, metadata, created_by
  )
  VALUES (
    p_company_id, 'payroll', 'payroll_payment', v_payment_id, v_method,
    'out', p_amount, v_currency, COALESCE(p_paid_at, now()), 'posted',
    'payroll-payment:' || v_idempotency_key,
    'Salaire ' || v_month || ' (acompte) — ' || v_name,
    jsonb_build_object('employee_id', v_employee_id, 'payslip_id', v_payslip_id, 'payment_id', v_payment_id),
    auth.uid()
  )
  RETURNING * INTO v_entry;

  INSERT INTO public.expenses (id, company_id, data)
  VALUES (
    v_expense_id, p_company_id,
    jsonb_build_object(
      'category', 'Salaires', 'label', 'Salaire ' || v_month || ' (acompte) — ' || v_name,
      'amount', p_amount, 'date', v_entry.occurred_at, 'paymentMethod', v_method,
      'source', 'payroll', 'employeeId', v_employee_id, 'payslipId', v_payslip_id,
      'paymentId', v_payment_id, 'idempotency_key', v_idempotency_key
    )
  );

  INSERT INTO public.cash_movements (id, company_id, data)
  VALUES (
    v_cash_id, p_company_id,
    jsonb_build_object(
      'type', 'out', 'label', 'Salaire ' || v_month || ' (acompte) — ' || v_name, 'amount', p_amount,
      'date', v_entry.occurred_at, 'currency', v_currency, 'source', v_method,
      'source_type', 'payroll_payment', 'source_id', v_payment_id, 'employeeId', v_employee_id,
      'payslipId', v_payslip_id, 'ledger_entry_id', v_entry.id, 'idempotency_key', v_idempotency_key
    )
  )
  RETURNING data INTO v_cash_data;

  v_paid_so_far := v_paid_so_far + p_amount;
  v_remaining := v_net_due - v_paid_so_far;
  v_new_status := CASE WHEN v_remaining <= 0 THEN 'posted' ELSE 'partial' END;

  v_existing_installment := jsonb_build_object(
    'amount', p_amount, 'paidAt', v_entry.occurred_at, 'method', v_method,
    'paymentId', v_payment_id, 'ledgerEntryId', v_entry.id, 'expenseId', v_expense_id,
    'cashMovementId', v_cash_id, 'idempotency_key', v_idempotency_key
  );

  IF v_is_first THEN
    v_installments := jsonb_build_array(v_existing_installment);

    INSERT INTO public.payslips (id, company_id, data)
    VALUES (
      v_payslip_id, p_company_id,
      jsonb_build_object(
        'employeeId', v_employee_id, 'month', v_month, 'baseSalary', p_base_salary,
        'bonuses', p_bonuses, 'deductions', p_deductions, 'advances', p_advances,
        'net', v_net_due, 'netDue', v_net_due, 'paidAmount', v_paid_so_far,
        'remaining', v_remaining, 'currency', v_currency, 'status', v_new_status,
        'paidAt', CASE WHEN v_new_status = 'posted' THEN v_entry.occurred_at ELSE NULL END,
        'installments', v_installments, 'payment_id', v_payment_id
      )
    )
    RETURNING data INTO v_payslip.data;
  ELSE
    v_installments := COALESCE(v_payslip.data->'installments', '[]'::jsonb) || v_existing_installment;

    UPDATE public.payslips
       SET data = data || jsonb_build_object(
         'paidAmount', v_paid_so_far, 'remaining', v_remaining, 'status', v_new_status,
         'installments', v_installments,
         'paidAt', CASE WHEN v_new_status = 'posted' THEN v_entry.occurred_at ELSE v_payslip.data->'paidAt' END
       )
     WHERE company_id = p_company_id AND id = v_payslip_id
     RETURNING data INTO v_payslip.data;
  END IF;

  -- Le versement qui solde le mois genere le document "bulletin" (comme le
  -- paiement complet en un coup) : c'est la derniere tranche qui rend le
  -- bulletin telechargeable/archivable, pas chaque acompte individuellement.
  IF v_new_status = 'posted' THEN
    v_document_id := 'payroll-document:' || v_payment_id;
    v_document_data := jsonb_build_object(
      'type', 'bulletin',
      'title', 'Bulletin de paie ' || v_month || ' — ' || v_name,
      'relatedTo', v_name,
      'amount', v_net_due,
      'entityType', 'employee',
      'entityId', v_employee_id,
      'entityLabel', v_name,
      'payslipId', v_payslip_id,
      'employeeId', v_employee_id,
      'paymentId', v_payment_id,
      'month', v_month,
      'payload', v_payslip.data
    );

    INSERT INTO public.documents (id, company_id, data)
    VALUES (v_document_id, p_company_id, v_document_data)
    RETURNING data INTO v_document_data;

    UPDATE public.payslips
       SET data = data || jsonb_build_object('documentId', v_document_id)
     WHERE company_id = p_company_id AND id = v_payslip_id
     RETURNING data INTO v_payslip.data;
  END IF;

  RETURN jsonb_build_object(
    'payslip_id', v_payslip_id,
    'payslip', v_payslip.data,
    'installment', v_existing_installment,
    'expense_id', v_expense_id,
    'cash_movement_id', v_cash_id,
    'ledger_entry_id', v_entry.id,
    'status', v_new_status,
    'remaining', v_remaining,
    'document_id', v_document_id,
    'document', v_document_data,
    'idempotent', false
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.record_payroll_installment(
  uuid, text, text, text, numeric, numeric, numeric, numeric, numeric, text, text, timestamptz, text
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_payroll_installment(
  uuid, text, text, text, numeric, numeric, numeric, numeric, numeric, text, text, timestamptz, text
) TO authenticated;

-- record_payroll_payment (paiement complet en un coup) doit desormais aussi
-- refuser un mois deja engage en paiement partiel, pas seulement deja pose.
-- Redefinition complete (corps inchange sinon) car on ne modifie jamais une
-- migration deja appliquee.
CREATE OR REPLACE FUNCTION public.record_payroll_payment(
  p_company_id uuid,
  p_payment_id text,
  p_employee_id text,
  p_month text,
  p_base_salary numeric,
  p_bonuses numeric,
  p_deductions numeric,
  p_advances numeric,
  p_currency text,
  p_method text,
  p_paid_at timestamptz,
  p_idempotency_key text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $function$
DECLARE
  v_employee public.employees;
  v_payslip public.payslips;
  v_existing_payslip public.payslips;
  v_payslip_data jsonb;
  v_expense_data jsonb;
  v_cash_data jsonb;
  v_document_data jsonb;
  v_entry public.ledger_entries;
  v_net numeric;
  v_balance numeric;
  v_currency text := upper(btrim(COALESCE(p_currency, '')));
  v_method text := btrim(COALESCE(p_method, ''));
  v_month text := btrim(COALESCE(p_month, ''));
  v_idempotency_key text := btrim(COALESCE(p_idempotency_key, ''));
  v_payment_id text := btrim(COALESCE(p_payment_id, ''));
  v_payslip_id text;
  v_expense_id text;
  v_cash_id text;
  v_document_id text;
  v_name text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  IF p_company_id IS NULL OR NOT private.is_company_member(p_company_id) THEN
    RAISE EXCEPTION 'User is not a member of this company' USING ERRCODE = '42501';
  END IF;

  IF NOT private.company_role_at_least(p_company_id, 'manager'::public.app_role) THEN
    RAISE EXCEPTION 'Insufficient permissions to record payroll'
      USING ERRCODE = '42501';
  END IF;

  IF v_payment_id = '' OR NULLIF(btrim(COALESCE(p_employee_id, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Payment id and employee id must not be empty' USING ERRCODE = '22023';
  END IF;
  IF v_month !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' THEN
    RAISE EXCEPTION 'Payroll month must use YYYY-MM format' USING ERRCODE = '22023';
  END IF;
  IF p_base_salary IS NULL OR p_base_salary < 0
     OR p_bonuses IS NULL OR p_bonuses < 0
     OR p_deductions IS NULL OR p_deductions < 0
     OR p_advances IS NULL OR p_advances < 0 THEN
    RAISE EXCEPTION 'Salary components must not be negative' USING ERRCODE = '22003';
  END IF;
  IF v_currency = '' OR v_method = '' OR v_idempotency_key = '' THEN
    RAISE EXCEPTION 'Currency, payment method and idempotency key must not be empty'
      USING ERRCODE = '22023';
  END IF;
  IF p_paid_at IS NULL THEN
    RAISE EXCEPTION 'Paid at must not be empty' USING ERRCODE = '22023';
  END IF;

  v_net := p_base_salary + p_bonuses - p_deductions - p_advances;
  IF v_net <= 0 THEN
    RAISE EXCEPTION 'Payroll net amount must be greater than zero'
      USING ERRCODE = '22003';
  END IF;

  SELECT *
    INTO v_existing_payslip
    FROM public.payslips
   WHERE company_id = p_company_id
     AND data->>'idempotency_key' = v_idempotency_key
   FOR UPDATE;

  IF FOUND THEN
    IF v_existing_payslip.data->>'employeeId' IS DISTINCT FROM btrim(p_employee_id)
       OR v_existing_payslip.data->>'month' IS DISTINCT FROM v_month
       OR COALESCE((v_existing_payslip.data->>'net')::numeric, NULL) IS DISTINCT FROM v_net
       OR v_existing_payslip.data->>'currency' IS DISTINCT FROM v_currency
       OR v_existing_payslip.data->>'payment_id' IS DISTINCT FROM v_payment_id THEN
      RAISE EXCEPTION 'Existing payroll payment does not match the retry payload'
        USING ERRCODE = '23505';
    END IF;

    v_payslip_id := v_existing_payslip.id;
    v_expense_id := v_existing_payslip.data->>'expenseId';
    v_cash_id := v_existing_payslip.data->>'cashMovementId';
    v_document_id := v_existing_payslip.data->>'documentId';

    SELECT *
      INTO v_entry
      FROM public.ledger_entries
     WHERE company_id = p_company_id
       AND source_type = 'payroll_payment'
       AND source_id = v_payment_id;

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

    SELECT data
      INTO v_document_data
      FROM public.documents
     WHERE company_id = p_company_id
       AND id = v_document_id;

    IF v_entry IS NULL OR v_expense_data IS NULL OR v_cash_data IS NULL OR v_document_data IS NULL THEN
      RAISE EXCEPTION 'Existing payroll payment is incomplete';
    END IF;

    IF v_entry.id::text IS DISTINCT FROM v_existing_payslip.data->>'ledgerEntryId'
       OR v_entry.source_id IS DISTINCT FROM v_payment_id
       OR v_entry.amount IS DISTINCT FROM v_net
       OR v_entry.currency IS DISTINCT FROM v_currency
       OR v_expense_data->>'payslipId' IS DISTINCT FROM v_payslip_id
       OR v_expense_data->>'paymentId' IS DISTINCT FROM v_payment_id
       OR COALESCE((v_expense_data->>'amount')::numeric, NULL) IS DISTINCT FROM v_net
       OR v_cash_data->>'ledger_entry_id' IS DISTINCT FROM v_entry.id::text
       OR v_cash_data->>'source_id' IS DISTINCT FROM v_payment_id
       OR COALESCE((v_cash_data->>'amount')::numeric, NULL) IS DISTINCT FROM v_net
       OR v_cash_data->>'currency' IS DISTINCT FROM v_currency
       OR v_document_data->>'payslipId' IS DISTINCT FROM v_payslip_id
       OR v_document_data->>'employeeId' IS DISTINCT FROM btrim(p_employee_id)
       OR v_document_data->>'paymentId' IS DISTINCT FROM v_payment_id
       OR v_document_data->>'month' IS DISTINCT FROM v_month THEN
      RAISE EXCEPTION 'Existing payroll payment references are inconsistent';
    END IF;

    RETURN jsonb_build_object(
      'payment_id', v_payment_id,
      'payslip_id', v_payslip_id,
      'expense_id', v_expense_id,
      'ledger_entry_id', v_entry.id,
      'cash_movement_id', v_cash_id,
      'document_id', v_document_id,
      'payslip', v_existing_payslip.data,
      'expense', v_expense_data,
      'cash', v_cash_data,
      'document', v_document_data,
      'idempotent', true
    );
  END IF;

  SELECT *
    INTO v_employee
    FROM public.employees
   WHERE company_id = p_company_id
     AND id = btrim(p_employee_id)
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Employee not found' USING ERRCODE = 'P0002';
  END IF;
  IF COALESCE(v_employee.data->>'status', '') NOT IN ('present', 'absent', 'leave') THEN
    RAISE EXCEPTION 'Employee is not active for payroll' USING ERRCODE = '55000';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.payslips
     WHERE company_id = p_company_id
       AND data->>'employeeId' = btrim(p_employee_id)
       AND data->>'month' = v_month
       AND data->>'status' IN ('posted', 'partial')
  ) THEN
    RAISE EXCEPTION 'Employee payroll for this month already exists'
      USING ERRCODE = '23505';
  END IF;

  v_balance := private.cash_account_balance(p_company_id, v_method);
  IF v_balance < v_net THEN
    RAISE EXCEPTION 'Solde insuffisant sur %', private.normalize_cash_account(v_method)
      USING ERRCODE = '23514',
            DETAIL = format('Disponible : %s FCFA. Montant du salaire : %s FCFA.', to_char(v_balance, 'FM999G999G999G999'), to_char(v_net, 'FM999G999G999G999')),
            HINT = format('Faites d''abord un virement vers %s depuis un autre compte (Caisse principale, Wave, Orange Money, Banque), puis réessayez ce paiement.', private.normalize_cash_account(v_method));
  END IF;

  v_name := btrim(COALESCE(v_employee.data->>'firstName', '') || ' ' ||
                  COALESCE(v_employee.data->>'lastName', ''));
  v_payslip_id := 'payroll-payslip:' || v_payment_id;
  v_expense_id := 'payroll-expense:' || v_payment_id;
  v_cash_id := 'payroll-cash:' || v_payment_id;
  v_document_id := 'payroll-document:' || v_payment_id;

  v_payslip_data := COALESCE(p_metadata, '{}'::jsonb) || jsonb_build_object(
    'employeeId', btrim(p_employee_id),
    'month', v_month,
    'baseSalary', p_base_salary,
    'bonuses', p_bonuses,
    'deductions', p_deductions,
    'advances', p_advances,
    'net', v_net,
    'currency', v_currency,
    'paymentMethod', v_method,
    'paidAt', p_paid_at,
    'status', 'posted',
    'payment_id', v_payment_id,
    'idempotency_key', v_idempotency_key
  );

  INSERT INTO public.payslips (id, company_id, data)
  VALUES (v_payslip_id, p_company_id, v_payslip_data);

  INSERT INTO public.expenses (id, company_id, data)
  VALUES (
    v_expense_id,
    p_company_id,
    jsonb_build_object(
      'category', 'Salaires',
      'label', 'Salaire ' || v_month || ' — ' || v_name,
      'amount', v_net,
      'date', p_paid_at,
      'paymentMethod', v_method,
      'source', 'payroll',
      'employeeId', btrim(p_employee_id),
      'payslipId', v_payslip_id,
      'paymentId', v_payment_id,
      'idempotency_key', v_idempotency_key
    )
  );

  INSERT INTO public.ledger_entries (
    company_id, source_module, source_type, source_id, cash_account_id,
    direction, amount, currency, occurred_at, status, idempotency_key,
    description, metadata, created_by
  )
  VALUES (
    p_company_id,
    'payroll',
    'payroll_payment',
    v_payment_id,
    v_method,
    'out',
    v_net,
    v_currency,
    p_paid_at,
    'posted',
    'payroll-payment:' || v_idempotency_key,
    'Salaire ' || v_month || ' — ' || v_name,
    jsonb_build_object(
      'employee_id', btrim(p_employee_id),
      'payslip_id', v_payslip_id,
      'payment_id', v_payment_id
    ),
    auth.uid()
  )
  RETURNING * INTO v_entry;

  INSERT INTO public.cash_movements (id, company_id, data)
  VALUES (
    v_cash_id,
    p_company_id,
    jsonb_build_object(
      'type', 'out',
      'label', 'Salaire ' || v_month || ' — ' || v_name,
      'amount', v_net,
      'date', p_paid_at,
      'currency', v_currency,
      'source', v_method,
      'source_type', 'payroll_payment',
      'source_id', v_payment_id,
      'employeeId', btrim(p_employee_id),
      'payslipId', v_payslip_id,
      'ledger_entry_id', v_entry.id,
      'idempotency_key', v_idempotency_key
    )
  )
  RETURNING data INTO v_cash_data;

  v_document_data := jsonb_build_object(
    'type', 'bulletin',
    'title', 'Bulletin de paie ' || v_month || ' — ' || v_name,
    'relatedTo', v_name,
    'amount', v_net,
    'entityType', 'employee',
    'entityId', btrim(p_employee_id),
    'entityLabel', v_name,
    'payslipId', v_payslip_id,
    'employeeId', btrim(p_employee_id),
    'paymentId', v_payment_id,
    'month', v_month,
    'payload', v_payslip_data
  );

  INSERT INTO public.documents (id, company_id, data)
  VALUES (v_document_id, p_company_id, v_document_data)
  RETURNING data INTO v_document_data;

  UPDATE public.payslips
     SET data = data || jsonb_build_object(
       'expenseId', v_expense_id,
       'ledgerEntryId', v_entry.id,
       'cashMovementId', v_cash_id,
       'documentId', v_document_id
     )
   WHERE company_id = p_company_id
     AND id = v_payslip_id;

  v_payslip_data := v_payslip_data || jsonb_build_object(
    'expenseId', v_expense_id,
    'ledgerEntryId', v_entry.id,
    'cashMovementId', v_cash_id,
    'documentId', v_document_id
  );

  RETURN jsonb_build_object(
    'payment_id', v_payment_id,
    'payslip_id', v_payslip_id,
    'expense_id', v_expense_id,
    'ledger_entry_id', v_entry.id,
    'cash_movement_id', v_cash_id,
    'document_id', v_document_id,
    'payslip', v_payslip_data,
    'expense', jsonb_build_object(
      'category', 'Salaires',
      'label', 'Salaire ' || v_month || ' — ' || v_name,
      'amount', v_net,
      'date', p_paid_at,
      'paymentMethod', v_method,
      'source', 'payroll',
      'employeeId', btrim(p_employee_id),
      'payslipId', v_payslip_id,
      'paymentId', v_payment_id,
      'idempotency_key', v_idempotency_key
    ),
    'cash', v_cash_data,
    'document', v_document_data,
    'idempotent', false
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.record_payroll_payment(
  uuid, text, text, text, numeric, numeric, numeric, numeric,
  text, text, timestamptz, text, jsonb
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.record_payroll_payment(
  uuid, text, text, text, numeric, numeric, numeric, numeric,
  text, text, timestamptz, text, jsonb
) TO authenticated;
