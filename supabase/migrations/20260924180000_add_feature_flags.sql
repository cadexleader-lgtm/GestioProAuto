-- Feature Flags par organisation (item 22) : activer/masquer Ventes, Credit,
-- Locations, Maintenance, Paie, Documents, Rapports selon le modele
-- economique reel de chaque PME cliente (ex. un loueur pur n'a pas besoin du
-- module Ventes, un revendeur cash n'a pas besoin du Credit).
--
-- Reutilise la table generique company_settings (creee des le bootstrap
-- initial, 20260807081140_..., jamais exploitee depuis) plutot que d'ouvrir
-- une nouvelle table : meme forme (id text, company_id, data jsonb), il
-- suffit d'une ligne fixe id = 'feature-flags'. Elle etait restee en
-- ecriture directe ouverte a tout membre (INSERT/UPDATE/DELETE) depuis sa
-- creation — meme angle mort deja corrige sur suppliers/employees a l'item
-- 10 : on la durcit maintenant qu'elle sert a quelque chose de sensible
-- (decider quels modules metier existent pour toute l'equipe).

REVOKE INSERT, UPDATE, DELETE ON public.company_settings FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.company_settings FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.set_feature_flags(
  p_company_id uuid,
  p_flags jsonb
)
RETURNS public.company_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $function$
DECLARE
  v_row public.company_settings;
  v_allowed_keys text[] := ARRAY['sales', 'credit', 'rentals', 'maintenance', 'payroll', 'documents', 'reports'];
  v_key text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  IF p_company_id IS NULL OR NOT private.is_company_member(p_company_id) THEN
    RAISE EXCEPTION 'User is not a member of this company' USING ERRCODE = '42501';
  END IF;

  -- Reserve au patron : decider quels modules metier existent pour toute
  -- l'equipe est une decision d'organisation, pas une operation quotidienne.
  IF NOT private.company_role_at_least(p_company_id, 'patron'::public.app_role) THEN
    RAISE EXCEPTION 'Insufficient permissions to change feature flags'
      USING ERRCODE = '42501';
  END IF;

  IF p_flags IS NULL OR jsonb_typeof(p_flags) <> 'object' THEN
    RAISE EXCEPTION 'Flags must be a JSON object' USING ERRCODE = '22023';
  END IF;

  FOR v_key IN SELECT jsonb_object_keys(p_flags) LOOP
    IF NOT (v_key = ANY(v_allowed_keys)) THEN
      RAISE EXCEPTION 'Unknown feature flag: %', v_key USING ERRCODE = '22023';
    END IF;
    IF jsonb_typeof(p_flags->v_key) <> 'boolean' THEN
      RAISE EXCEPTION 'Feature flag % must be a boolean', v_key USING ERRCODE = '22023';
    END IF;
  END LOOP;

  INSERT INTO public.company_settings (id, company_id, data)
  VALUES ('feature-flags', p_company_id, p_flags)
  ON CONFLICT (company_id, id) DO UPDATE
    SET data = public.company_settings.data || EXCLUDED.data
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$function$;

REVOKE ALL ON FUNCTION public.set_feature_flags(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_feature_flags(uuid, jsonb) TO authenticated;
