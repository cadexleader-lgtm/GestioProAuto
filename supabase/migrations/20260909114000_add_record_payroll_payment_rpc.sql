CREATE UNIQUE INDEX IF NOT EXISTS payslips_company_employee_month_idx
  ON public.payslips (
    company_id,
    (data->>'employeeId'),
    (data->>'month')
  )
  WHERE NULLIF(data->>'employeeId', '') IS NOT NULL
    AND NULLIF(data->>'month', '') IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS payslips_company_idempotency_key_idx
  ON public.payslips (company_id, (data->>'idempotency_key'))
  WHERE NULLIF(data->>'idempotency_key', '') IS NOT NULL;

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
SET search_path = public, pg_temp
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
       AND data->>'status' = 'posted'
  ) THEN
    RAISE EXCEPTION 'Employee payroll for this month already exists'
      USING ERRCODE = '23505';
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
