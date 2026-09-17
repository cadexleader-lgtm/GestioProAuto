ALTER TABLE public.payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members insert" ON public.payslips;
DROP POLICY IF EXISTS "members update" ON public.payslips;
DROP POLICY IF EXISTS "managers delete" ON public.payslips;

REVOKE INSERT, UPDATE, DELETE ON public.payslips FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.payslips FROM PUBLIC;
GRANT SELECT ON public.payslips TO authenticated;

DROP POLICY IF EXISTS "managers insert expenses" ON public.expenses;
DROP POLICY IF EXISTS "managers update expenses" ON public.expenses;
DROP POLICY IF EXISTS "managers delete expenses" ON public.expenses;

CREATE POLICY "managers insert non-payroll expenses"
  ON public.expenses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    private.company_role_at_least(company_id, 'manager'::public.app_role)
    AND COALESCE(data->>'source', '') <> 'payroll'
  );

CREATE POLICY "managers update non-payroll expenses"
  ON public.expenses
  FOR UPDATE
  TO authenticated
  USING (
    private.company_role_at_least(company_id, 'manager'::public.app_role)
    AND COALESCE(data->>'source', '') <> 'payroll'
  )
  WITH CHECK (
    private.company_role_at_least(company_id, 'manager'::public.app_role)
    AND COALESCE(data->>'source', '') <> 'payroll'
  );

CREATE POLICY "managers delete non-payroll expenses"
  ON public.expenses
  FOR DELETE
  TO authenticated
  USING (
    private.company_role_at_least(company_id, 'manager'::public.app_role)
    AND COALESCE(data->>'source', '') <> 'payroll'
  );

DROP POLICY IF EXISTS "managers insert cash movements" ON public.cash_movements;
DROP POLICY IF EXISTS "managers update cash movements" ON public.cash_movements;
DROP POLICY IF EXISTS "managers delete cash movements" ON public.cash_movements;

CREATE POLICY "managers insert non-payroll cash movements"
  ON public.cash_movements
  FOR INSERT
  TO authenticated
  WITH CHECK (
    private.company_role_at_least(company_id, 'manager'::public.app_role)
    AND COALESCE(data->>'source_type', '') <> 'payroll_payment'
  );

CREATE POLICY "managers update non-payroll cash movements"
  ON public.cash_movements
  FOR UPDATE
  TO authenticated
  USING (
    private.company_role_at_least(company_id, 'manager'::public.app_role)
    AND COALESCE(data->>'source_type', '') <> 'payroll_payment'
  )
  WITH CHECK (
    private.company_role_at_least(company_id, 'manager'::public.app_role)
    AND COALESCE(data->>'source_type', '') <> 'payroll_payment'
  );

CREATE POLICY "managers delete non-payroll cash movements"
  ON public.cash_movements
  FOR DELETE
  TO authenticated
  USING (
    private.company_role_at_least(company_id, 'manager'::public.app_role)
    AND COALESCE(data->>'source_type', '') <> 'payroll_payment'
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_movements TO authenticated;
GRANT ALL ON public.payslips TO service_role;
GRANT ALL ON public.expenses TO service_role;
GRANT ALL ON public.cash_movements TO service_role;

NOTIFY pgrst, 'reload schema';
