CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.company_role(_company_id uuid)
RETURNS app_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT m.role FROM public.company_members m WHERE m.company_id = _company_id AND m.user_id = auth.uid(); $$;

CREATE OR REPLACE FUNCTION private.company_role_at_least(_company_id uuid, _min app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT CASE private.company_role(_company_id)
  WHEN 'patron' THEN true
  WHEN 'manager' THEN _min <> 'patron'
  WHEN 'terrain' THEN _min = 'terrain'
  ELSE false END; $$;

CREATE OR REPLACE FUNCTION private.is_company_member(_company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT EXISTS (SELECT 1 FROM public.company_members m WHERE m.company_id = _company_id AND m.user_id = auth.uid()); $$;

REVOKE ALL ON FUNCTION private.company_role(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.company_role_at_least(uuid, app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_company_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.company_role(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.company_role_at_least(uuid, app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_company_member(uuid) TO authenticated, service_role;

DO $do$
DECLARE p record; q text; w text; pol_roles text; stmt text;
BEGIN
  FOR p IN
    SELECT pol.schemaname, pol.tablename, pol.policyname, pol.permissive, pol.roles AS r, pol.cmd, pol.qual, pol.with_check
    FROM pg_policies pol
    WHERE pol.schemaname = 'public'
      AND (COALESCE(pol.qual,'') || COALESCE(pol.with_check,'')) ~ '(company_role|company_role_at_least|is_company_member)\('
  LOOP
    q := p.qual; w := p.with_check;
    q := regexp_replace(q, '(^|[^.\w])(is_company_member|company_role_at_least|company_role)\(', '\1private.\2(', 'g');
    w := regexp_replace(w, '(^|[^.\w])(is_company_member|company_role_at_least|company_role)\(', '\1private.\2(', 'g');
    q := replace(q, 'private.private.', 'private.');
    w := replace(w, 'private.private.', 'private.');
    pol_roles := array_to_string(p.r, ', ');
    EXECUTE format('DROP POLICY %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
    stmt := format('CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s',
                   p.policyname, p.schemaname, p.tablename,
                   CASE WHEN p.permissive = 'PERMISSIVE' THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
                   p.cmd, pol_roles);
    IF q IS NOT NULL THEN stmt := stmt || ' USING (' || q || ')'; END IF;
    IF w IS NOT NULL THEN stmt := stmt || ' WITH CHECK (' || w || ')'; END IF;
    EXECUTE stmt;
  END LOOP;
END
$do$;

DROP FUNCTION IF EXISTS public.company_role_at_least(uuid, app_role);
DROP FUNCTION IF EXISTS public.is_company_member(uuid);
DROP FUNCTION IF EXISTS public.company_role(uuid);