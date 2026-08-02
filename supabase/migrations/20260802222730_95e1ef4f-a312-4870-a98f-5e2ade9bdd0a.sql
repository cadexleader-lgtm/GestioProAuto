REVOKE ALL ON FUNCTION public.is_company_member(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.company_role(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.company_role_at_least(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.is_company_member(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.company_role(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.company_role_at_least(uuid, public.app_role) TO authenticated, service_role;