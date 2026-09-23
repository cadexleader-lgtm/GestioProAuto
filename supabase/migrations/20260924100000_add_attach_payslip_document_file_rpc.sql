-- Les bulletins de paie ("documents".data->>'type' = 'bulletin') sont
-- volontairement verrouilles en ecriture directe cote client depuis
-- 20260909145000_secure_payroll_direct_writes.sql : seule la RPC
-- record_payroll_payment peut creer/modifier ces lignes. Or aucun PDF n'est
-- jamais genere pour un bulletin (item 6 roadmap) -- le coffre-fort liste le
-- bulletin mais le telechargement echoue toujours (aucun storagePath).
--
-- Cette RPC narrow ouvre un seul geste supplementaire, strictement borne aux
-- documents deja de type 'bulletin' : attacher le fichier PDF (deja televerse
-- cote client dans Storage, meme convention que uploadPrivateDocument) a la
-- ligne existante. Aucune autre colonne du document n'est modifiable via
-- cette fonction.

CREATE OR REPLACE FUNCTION public.attach_payslip_document_file(
  p_company_id uuid,
  p_document_id text,
  p_storage_bucket text,
  p_storage_path text,
  p_mime_type text,
  p_size bigint,
  p_original_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_type text;
  v_data jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  IF NOT private.company_role_at_least(p_company_id, 'manager'::public.app_role) THEN
    RAISE EXCEPTION 'Insufficient role' USING ERRCODE = '42501';
  END IF;

  SELECT data->>'type' INTO v_type
    FROM public.documents
   WHERE company_id = p_company_id AND id = p_document_id
   FOR UPDATE;

  IF v_type IS NULL THEN
    RAISE EXCEPTION 'Document not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_type <> 'bulletin' THEN
    RAISE EXCEPTION 'Only payslip documents can be attached through this function' USING ERRCODE = '42501';
  END IF;

  UPDATE public.documents
     SET data = data || jsonb_build_object(
       'storageBucket', p_storage_bucket,
       'storagePath', p_storage_path,
       'mimeType', p_mime_type,
       'size', p_size,
       'originalName', p_original_name
     )
   WHERE company_id = p_company_id AND id = p_document_id
  RETURNING data INTO v_data;

  RETURN v_data;
END;
$$;

REVOKE ALL ON FUNCTION public.attach_payslip_document_file(uuid, text, text, text, text, bigint, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.attach_payslip_document_file(uuid, text, text, text, text, bigint, text) TO authenticated;
