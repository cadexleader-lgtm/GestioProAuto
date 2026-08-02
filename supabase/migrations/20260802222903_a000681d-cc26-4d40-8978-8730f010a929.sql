DO $do$
DECLARE t text;
DECLARE tables text[] := ARRAY['dishes','resto_tables','orders'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('CREATE TABLE IF NOT EXISTS public.%I (id text NOT NULL, company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE, data jsonb NOT NULL DEFAULT ''{}''::jsonb, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (company_id, id))', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "members read" ON public.%I', t);
    EXECUTE format('CREATE POLICY "members read" ON public.%I FOR SELECT TO authenticated USING (public.is_company_member(company_id))', t);
    EXECUTE format('DROP POLICY IF EXISTS "members insert" ON public.%I', t);
    EXECUTE format('CREATE POLICY "members insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_company_member(company_id))', t);
    EXECUTE format('DROP POLICY IF EXISTS "members update" ON public.%I', t);
    EXECUTE format('CREATE POLICY "members update" ON public.%I FOR UPDATE TO authenticated USING (public.is_company_member(company_id)) WITH CHECK (public.is_company_member(company_id))', t);
    EXECUTE format('DROP POLICY IF EXISTS "managers delete" ON public.%I', t);
    EXECUTE format('CREATE POLICY "managers delete" ON public.%I FOR DELETE TO authenticated USING (public.company_role_at_least(company_id, ''manager''))', t);
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER trg_%I_updated BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', t, t);
  END LOOP;
END
$do$;

NOTIFY pgrst, 'reload schema';