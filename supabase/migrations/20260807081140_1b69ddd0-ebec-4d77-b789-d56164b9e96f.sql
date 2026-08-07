CREATE TABLE public.company_settings (
  id text NOT NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (company_id, id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_settings TO authenticated;
GRANT ALL ON public.company_settings TO service_role;

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read" ON public.company_settings FOR SELECT TO authenticated
  USING (private.is_company_member(company_id));
CREATE POLICY "members insert" ON public.company_settings FOR INSERT TO authenticated
  WITH CHECK (private.is_company_member(company_id));
CREATE POLICY "members update" ON public.company_settings FOR UPDATE TO authenticated
  USING (private.is_company_member(company_id)) WITH CHECK (private.is_company_member(company_id));
CREATE POLICY "managers delete" ON public.company_settings FOR DELETE TO authenticated
  USING (private.company_role_at_least(company_id, 'manager'::app_role));

CREATE TRIGGER trg_company_settings_updated BEFORE UPDATE ON public.company_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();