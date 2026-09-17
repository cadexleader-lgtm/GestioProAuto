DROP POLICY IF EXISTS "members read" ON public.expenses;
DROP POLICY IF EXISTS "members insert" ON public.expenses;
DROP POLICY IF EXISTS "members update" ON public.expenses;
DROP POLICY IF EXISTS "managers delete" ON public.expenses;

CREATE POLICY "members read expenses"
  ON public.expenses
  FOR SELECT
  TO authenticated
  USING (private.is_company_member(company_id));

CREATE POLICY "managers insert expenses"
  ON public.expenses
  FOR INSERT
  TO authenticated
  WITH CHECK (private.company_role_at_least(company_id, 'manager'::public.app_role));

CREATE POLICY "managers update expenses"
  ON public.expenses
  FOR UPDATE
  TO authenticated
  USING (private.company_role_at_least(company_id, 'manager'::public.app_role))
  WITH CHECK (private.company_role_at_least(company_id, 'manager'::public.app_role));

CREATE POLICY "managers delete expenses"
  ON public.expenses
  FOR DELETE
  TO authenticated
  USING (private.company_role_at_least(company_id, 'manager'::public.app_role));

DROP POLICY IF EXISTS "members read" ON public.cash_movements;
DROP POLICY IF EXISTS "members insert" ON public.cash_movements;
DROP POLICY IF EXISTS "members update" ON public.cash_movements;
DROP POLICY IF EXISTS "managers delete" ON public.cash_movements;

CREATE POLICY "members read cash movements"
  ON public.cash_movements
  FOR SELECT
  TO authenticated
  USING (private.is_company_member(company_id));

CREATE POLICY "managers insert cash movements"
  ON public.cash_movements
  FOR INSERT
  TO authenticated
  WITH CHECK (private.company_role_at_least(company_id, 'manager'::public.app_role));

CREATE POLICY "managers update cash movements"
  ON public.cash_movements
  FOR UPDATE
  TO authenticated
  USING (private.company_role_at_least(company_id, 'manager'::public.app_role))
  WITH CHECK (private.company_role_at_least(company_id, 'manager'::public.app_role));

CREATE POLICY "managers delete cash movements"
  ON public.cash_movements
  FOR DELETE
  TO authenticated
  USING (private.company_role_at_least(company_id, 'manager'::public.app_role));

DROP POLICY IF EXISTS "members read ledger entries" ON public.ledger_entries;
DROP POLICY IF EXISTS "members insert ledger entries" ON public.ledger_entries;

CREATE POLICY "members read ledger entries"
  ON public.ledger_entries
  FOR SELECT
  TO authenticated
  USING (private.is_company_member(company_id));

CREATE POLICY "managers insert ledger entries"
  ON public.ledger_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    private.company_role_at_least(company_id, 'manager'::public.app_role)
    AND created_by = auth.uid()
  );
