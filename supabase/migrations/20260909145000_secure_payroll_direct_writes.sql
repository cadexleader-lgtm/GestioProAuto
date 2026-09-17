-- Payroll records are created exclusively by the SECURITY DEFINER payroll RPC.
-- This migration changes access policies only; it does not modify existing rows.

ALTER TABLE public.payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;

-- Payslips are immutable accounting records from the client perspective.
DROP POLICY IF EXISTS "members insert" ON public.payslips;
DROP POLICY IF EXISTS "members update" ON public.payslips;
DROP POLICY IF EXISTS "managers delete" ON public.payslips;

REVOKE INSERT, UPDATE, DELETE ON public.payslips FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.payslips FROM PUBLIC;
GRANT SELECT ON public.payslips TO authenticated;

-- Keep direct non-payroll expenses available while reserving salary expenses
-- and any record linked to a payroll payment for the payroll RPC.
DROP POLICY IF EXISTS "managers insert expenses" ON public.expenses;
DROP POLICY IF EXISTS "managers update expenses" ON public.expenses;
DROP POLICY IF EXISTS "managers delete expenses" ON public.expenses;
DROP POLICY IF EXISTS "managers insert non-payroll expenses" ON public.expenses;
DROP POLICY IF EXISTS "managers update non-payroll expenses" ON public.expenses;
DROP POLICY IF EXISTS "managers delete non-payroll expenses" ON public.expenses;

CREATE POLICY "managers insert non-payroll expenses"
  ON public.expenses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    private.company_role_at_least(company_id, 'manager'::public.app_role)
    AND COALESCE(data->>'category', '') <> 'Salaires'
    AND lower(COALESCE(data->>'source', '')) <> 'payroll'
    AND NULLIF(data->>'payslipId', '') IS NULL
    AND NULLIF(data->>'paymentId', '') IS NULL
    AND NULLIF(data->>'payment_id', '') IS NULL
  );

CREATE POLICY "managers update non-payroll expenses"
  ON public.expenses
  FOR UPDATE
  TO authenticated
  USING (
    private.company_role_at_least(company_id, 'manager'::public.app_role)
    AND COALESCE(data->>'category', '') <> 'Salaires'
    AND lower(COALESCE(data->>'source', '')) <> 'payroll'
    AND NULLIF(data->>'payslipId', '') IS NULL
    AND NULLIF(data->>'paymentId', '') IS NULL
    AND NULLIF(data->>'payment_id', '') IS NULL
  )
  WITH CHECK (
    private.company_role_at_least(company_id, 'manager'::public.app_role)
    AND COALESCE(data->>'category', '') <> 'Salaires'
    AND lower(COALESCE(data->>'source', '')) <> 'payroll'
    AND NULLIF(data->>'payslipId', '') IS NULL
    AND NULLIF(data->>'paymentId', '') IS NULL
    AND NULLIF(data->>'payment_id', '') IS NULL
  );

CREATE POLICY "managers delete non-payroll expenses"
  ON public.expenses
  FOR DELETE
  TO authenticated
  USING (
    private.company_role_at_least(company_id, 'manager'::public.app_role)
    AND COALESCE(data->>'category', '') <> 'Salaires'
    AND lower(COALESCE(data->>'source', '')) <> 'payroll'
    AND NULLIF(data->>'payslipId', '') IS NULL
    AND NULLIF(data->>'paymentId', '') IS NULL
    AND NULLIF(data->>'payment_id', '') IS NULL
  );

-- Do not require source_type globally: restaurant and maintenance still have
-- legacy direct cash flows. Block only records identifiable as payroll.
DROP POLICY IF EXISTS "managers insert cash movements" ON public.cash_movements;
DROP POLICY IF EXISTS "managers update cash movements" ON public.cash_movements;
DROP POLICY IF EXISTS "managers delete cash movements" ON public.cash_movements;
DROP POLICY IF EXISTS "managers insert non-payroll cash movements" ON public.cash_movements;
DROP POLICY IF EXISTS "managers update non-payroll cash movements" ON public.cash_movements;
DROP POLICY IF EXISTS "managers delete non-payroll cash movements" ON public.cash_movements;

CREATE POLICY "managers insert non-payroll cash movements"
  ON public.cash_movements
  FOR INSERT
  TO authenticated
  WITH CHECK (
    private.company_role_at_least(company_id, 'manager'::public.app_role)
    AND COALESCE(data->>'source_type', '') <> 'payroll_payment'
    AND lower(COALESCE(data->>'source', '')) <> 'payroll'
    AND COALESCE(data->>'label', '') NOT LIKE 'Salaires %'
    AND NULLIF(data->>'payslipId', '') IS NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.payslips p
      WHERE p.company_id = cash_movements.company_id
        AND p.data->>'payment_id' IN (
          NULLIF(cash_movements.data->>'paymentId', ''),
          NULLIF(cash_movements.data->>'payment_id', ''),
          NULLIF(cash_movements.data->>'source_id', '')
        )
    )
  );

CREATE POLICY "managers update non-payroll cash movements"
  ON public.cash_movements
  FOR UPDATE
  TO authenticated
  USING (
    private.company_role_at_least(company_id, 'manager'::public.app_role)
    AND COALESCE(data->>'source_type', '') <> 'payroll_payment'
    AND lower(COALESCE(data->>'source', '')) <> 'payroll'
    AND COALESCE(data->>'label', '') NOT LIKE 'Salaires %'
    AND NULLIF(data->>'payslipId', '') IS NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.payslips p
      WHERE p.company_id = cash_movements.company_id
        AND p.data->>'payment_id' IN (
          NULLIF(cash_movements.data->>'paymentId', ''),
          NULLIF(cash_movements.data->>'payment_id', ''),
          NULLIF(cash_movements.data->>'source_id', '')
        )
    )
  )
  WITH CHECK (
    private.company_role_at_least(company_id, 'manager'::public.app_role)
    AND COALESCE(data->>'source_type', '') <> 'payroll_payment'
    AND lower(COALESCE(data->>'source', '')) <> 'payroll'
    AND COALESCE(data->>'label', '') NOT LIKE 'Salaires %'
    AND NULLIF(data->>'payslipId', '') IS NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.payslips p
      WHERE p.company_id = cash_movements.company_id
        AND p.data->>'payment_id' IN (
          NULLIF(cash_movements.data->>'paymentId', ''),
          NULLIF(cash_movements.data->>'payment_id', ''),
          NULLIF(cash_movements.data->>'source_id', '')
        )
    )
  );

CREATE POLICY "managers delete non-payroll cash movements"
  ON public.cash_movements
  FOR DELETE
  TO authenticated
  USING (
    private.company_role_at_least(company_id, 'manager'::public.app_role)
    AND COALESCE(data->>'source_type', '') <> 'payroll_payment'
    AND lower(COALESCE(data->>'source', '')) <> 'payroll'
    AND COALESCE(data->>'label', '') NOT LIKE 'Salaires %'
    AND NULLIF(data->>'payslipId', '') IS NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.payslips p
      WHERE p.company_id = cash_movements.company_id
        AND p.data->>'payment_id' IN (
          NULLIF(cash_movements.data->>'paymentId', ''),
          NULLIF(cash_movements.data->>'payment_id', ''),
          NULLIF(cash_movements.data->>'source_id', '')
        )
    )
  );

-- Payroll bulletins are generated by the payroll RPC and cannot be changed
-- or deleted by the generic document UI or direct client requests.
DROP POLICY IF EXISTS "members insert" ON public.documents;
DROP POLICY IF EXISTS "members update" ON public.documents;
DROP POLICY IF EXISTS "managers delete" ON public.documents;

CREATE POLICY "members insert non-payroll documents"
  ON public.documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    private.is_company_member(company_id)
    AND COALESCE(data->>'type', '') <> 'bulletin'
    AND NULLIF(data->>'payslipId', '') IS NULL
  );

CREATE POLICY "members update non-payroll documents"
  ON public.documents
  FOR UPDATE
  TO authenticated
  USING (
    private.is_company_member(company_id)
    AND COALESCE(data->>'type', '') <> 'bulletin'
    AND NULLIF(data->>'payslipId', '') IS NULL
  )
  WITH CHECK (
    private.is_company_member(company_id)
    AND COALESCE(data->>'type', '') <> 'bulletin'
    AND NULLIF(data->>'payslipId', '') IS NULL
  );

CREATE POLICY "managers delete non-payroll documents"
  ON public.documents
  FOR DELETE
  TO authenticated
  USING (
    private.company_role_at_least(company_id, 'manager'::public.app_role)
    AND COALESCE(data->>'type', '') <> 'bulletin'
    AND NULLIF(data->>'payslipId', '') IS NULL
  );

-- Ledger entries are append-only for clients. Payroll entries are exclusively
-- written through record_payroll_payment; other manager inserts remain allowed.
DROP POLICY IF EXISTS "members insert ledger entries" ON public.ledger_entries;
DROP POLICY IF EXISTS "managers insert ledger entries" ON public.ledger_entries;

CREATE POLICY "managers insert non-payroll ledger entries"
  ON public.ledger_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    private.company_role_at_least(company_id, 'manager'::public.app_role)
    AND created_by = auth.uid()
    AND source_type <> 'payroll_payment'
    AND source_module <> 'payroll'
    AND NOT EXISTS (
      SELECT 1
      FROM public.payslips p
      WHERE p.company_id = ledger_entries.company_id
        AND p.data->>'payment_id' = ledger_entries.source_id
    )
  );

REVOKE UPDATE, DELETE ON public.ledger_entries FROM authenticated;
REVOKE UPDATE, DELETE ON public.ledger_entries FROM PUBLIC;
GRANT SELECT, INSERT ON public.ledger_entries TO authenticated;

GRANT ALL ON public.payslips TO service_role;
GRANT ALL ON public.expenses TO service_role;
GRANT ALL ON public.cash_movements TO service_role;
GRANT ALL ON public.documents TO service_role;
GRANT ALL ON public.ledger_entries TO service_role;

NOTIFY pgrst, 'reload schema';
