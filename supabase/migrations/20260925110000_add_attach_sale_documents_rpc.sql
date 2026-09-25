-- Meme classe de bug que set_company_profile (migration precedente) :
-- Documents.tsx (bouton "Migrer les anciens fichiers Base64") ecrit
-- directement via db.update("vehicleSales", saleId, { documents: ... }),
-- mais vehicle_sales est en ecriture RPC-only depuis
-- 20260907141500_harden_vehicle_cash_sale_writes.sql
-- ("REVOKE INSERT, UPDATE, DELETE ... FROM authenticated"). L'appel echoue
-- silencieusement cote serveur alors que l'UI affiche "N fichier(s) migre(s)"
-- (etat local optimiste) -- la migration Base64 -> coffre-fort prive ne
-- persistait jamais reellement le lien vers le nouveau document.
--
-- RPC etroite : ne touche QUE le champ documents (pas les champs financiers
-- de la vente, qui restent proteges par le durcissement d'origine).
CREATE OR REPLACE FUNCTION public.attach_sale_documents(
  p_company_id uuid,
  p_sale_id text,
  p_documents jsonb
)
RETURNS public.vehicle_sales
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $function$
DECLARE
  v_row public.vehicle_sales;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  IF p_company_id IS NULL OR NOT private.is_company_member(p_company_id) THEN
    RAISE EXCEPTION 'User is not a member of this company' USING ERRCODE = '42501';
  END IF;

  IF NOT private.company_role_at_least(p_company_id, 'manager'::public.app_role) THEN
    RAISE EXCEPTION 'Insufficient permissions to update sale documents'
      USING ERRCODE = '42501';
  END IF;

  IF p_documents IS NULL OR jsonb_typeof(p_documents) <> 'array' THEN
    RAISE EXCEPTION 'Documents must be a JSON array' USING ERRCODE = '22023';
  END IF;

  UPDATE public.vehicle_sales
  SET data = jsonb_set(data, '{documents}', p_documents)
  WHERE company_id = p_company_id AND id = p_sale_id
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Sale not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_row;
END;
$function$;

REVOKE ALL ON FUNCTION public.attach_sale_documents(uuid, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.attach_sale_documents(uuid, text, jsonb) TO authenticated;
