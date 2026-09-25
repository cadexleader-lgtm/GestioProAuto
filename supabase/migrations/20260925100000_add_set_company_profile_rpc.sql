-- Corrige une regression introduite par le durcissement de company_settings
-- (20260924180000_add_feature_flags.sql, "REVOKE INSERT, UPDATE, DELETE ...
-- FROM authenticated") : le profil "Identite & documents" (logo, signature,
-- cachet, coordonnees legales/bancaires, articles de contrats) est ecrit
-- directement par le client via db.upsert("settings", ...) dans
-- company-profile.ts, qui vise la MEME table company_settings (ligne
-- id='profile'). Depuis ce durcissement, chaque "Enregistrer" echoue
-- silencieusement cote serveur (permission refusee), alors que l'etat local
-- de l'onglet se met a jour quand meme de facon optimiste -- l'utilisateur
-- croit avoir enregistre, mais rien n'atteint jamais la base. Symptome
-- rapporte : les modifications faites sur un appareil sont invisibles sur un
-- autre appareil connecte au meme compte entreprise.
--
-- Meme patron que set_feature_flags (meme migration) : RPC SECURITY DEFINER
-- dediee plutot que de rouvrir l'ecriture directe.
CREATE OR REPLACE FUNCTION public.set_company_profile(
  p_company_id uuid,
  p_profile jsonb
)
RETURNS public.company_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $function$
DECLARE
  v_row public.company_settings;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  IF p_company_id IS NULL OR NOT private.is_company_member(p_company_id) THEN
    RAISE EXCEPTION 'User is not a member of this company' USING ERRCODE = '42501';
  END IF;

  -- Meme niveau que le reste de la page Parametres (can(role, "manage.settings")
  -- cote client) : manager+ peut modifier l'identite/les documents de
  -- l'entreprise, terrain ne voit meme pas la page (bloquee plus haut).
  IF NOT private.company_role_at_least(p_company_id, 'manager'::public.app_role) THEN
    RAISE EXCEPTION 'Insufficient permissions to update company profile'
      USING ERRCODE = '42501';
  END IF;

  IF p_profile IS NULL OR jsonb_typeof(p_profile) <> 'object' THEN
    RAISE EXCEPTION 'Profile must be a JSON object' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.company_settings (id, company_id, data)
  VALUES ('profile', p_company_id, p_profile)
  ON CONFLICT (company_id, id) DO UPDATE
    SET data = EXCLUDED.data
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$function$;

REVOKE ALL ON FUNCTION public.set_company_profile(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_company_profile(uuid, jsonb) TO authenticated;
