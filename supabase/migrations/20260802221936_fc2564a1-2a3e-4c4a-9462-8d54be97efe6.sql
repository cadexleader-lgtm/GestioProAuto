-- ============ ROLES ============
CREATE TYPE public.app_role AS ENUM ('patron', 'manager', 'terrain');

-- ============ UPDATED_AT HELPER ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============ COMPANIES ============
CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sector text NOT NULL DEFAULT 'commerce',
  sub_sector text,
  currency text NOT NULL DEFAULT 'XOF',
  phone text,
  address text,
  logo_url text,
  owner_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ MEMBERSHIPS ============
CREATE TABLE public.company_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.app_role NOT NULL DEFAULT 'terrain',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_members TO authenticated;
GRANT ALL ON public.company_members TO service_role;
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;

-- ============ SECURITY DEFINER HELPERS ============
CREATE OR REPLACE FUNCTION public.is_company_member(_company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.company_members m
                 WHERE m.company_id = _company_id AND m.user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.company_role(_company_id uuid)
RETURNS public.app_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.role FROM public.company_members m
  WHERE m.company_id = _company_id AND m.user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.company_role_at_least(_company_id uuid, _min public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE public.company_role(_company_id)
    WHEN 'patron' THEN true
    WHEN 'manager' THEN _min <> 'patron'
    WHEN 'terrain' THEN _min = 'terrain'
    ELSE false END;
$$;

-- ============ CORE POLICIES ============
CREATE POLICY "members read company" ON public.companies FOR SELECT TO authenticated
  USING (public.is_company_member(id));
CREATE POLICY "users create own company" ON public.companies FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY "patron updates company" ON public.companies FOR UPDATE TO authenticated
  USING (public.company_role_at_least(id, 'patron')) WITH CHECK (public.company_role_at_least(id, 'patron'));
CREATE POLICY "owner deletes company" ON public.companies FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "members read memberships" ON public.company_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_company_member(company_id));
CREATE POLICY "bootstrap own membership" ON public.company_members FOR INSERT TO authenticated
  WITH CHECK (
    (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_id = auth.uid()))
    OR public.company_role_at_least(company_id, 'patron')
  );
CREATE POLICY "patron updates memberships" ON public.company_members FOR UPDATE TO authenticated
  USING (public.company_role_at_least(company_id, 'patron')) WITH CHECK (public.company_role_at_least(company_id, 'patron'));
CREATE POLICY "patron removes members" ON public.company_members FOR DELETE TO authenticated
  USING (public.company_role_at_least(company_id, 'patron') AND user_id <> auth.uid());

CREATE TRIGGER trg_companies_updated BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_members_updated BEFORE UPDATE ON public.company_members FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ BUSINESS TABLES (tenant-scoped jsonb documents) ============
DO $do$
DECLARE t text;
DECLARE tables text[] := ARRAY[
  'suppliers','employees','expenses','cash_movements','vehicles','vehicle_credits','rentals',
  'appliances','warranties','pro_invoices','appliance_credits','attendance','payslips',
  'reservations','serials','maintenance','promotions','inventories','categories',
  'vehicle_maintenances','vehicle_payments','vehicle_sales','products','customers','sales','documents'
];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format($f$
      CREATE TABLE public.%I (
        id text NOT NULL,
        company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
        data jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (company_id, id)
      );
      GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated;
      GRANT ALL ON public.%I TO service_role;
      ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;
      CREATE POLICY "members read" ON public.%I FOR SELECT TO authenticated
        USING (public.is_company_member(company_id));
      CREATE POLICY "members insert" ON public.%I FOR INSERT TO authenticated
        WITH CHECK (public.is_company_member(company_id));
      CREATE POLICY "members update" ON public.%I FOR UPDATE TO authenticated
        USING (public.is_company_member(company_id)) WITH CHECK (public.is_company_member(company_id));
      CREATE POLICY "managers delete" ON public.%I FOR DELETE TO authenticated
        USING (public.company_role_at_least(company_id, 'manager'));
      CREATE TRIGGER trg_%I_updated BEFORE UPDATE ON public.%I
        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
    $f$, t, t, t, t, t, t, t, t, t, t);
  END LOOP;
END
$do$;