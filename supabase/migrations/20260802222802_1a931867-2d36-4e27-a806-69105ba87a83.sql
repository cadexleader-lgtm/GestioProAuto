DROP POLICY IF EXISTS "members read company" ON public.companies;
CREATE POLICY "members read company" ON public.companies FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.is_company_member(id));