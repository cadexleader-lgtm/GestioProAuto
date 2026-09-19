-- P1: private document center foundation.
-- This migration prepares secure storage and business relations for future uploads.
-- It does not migrate, delete, or rewrite existing Base64 data embedded in JSONB rows.

CREATE OR REPLACE FUNCTION private.storage_company_id_from_object_name(_name text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_first_segment text;
BEGIN
  v_first_segment := split_part(COALESCE(_name, ''), '/', 1);

  IF v_first_segment !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN NULL;
  END IF;

  RETURN v_first_segment::uuid;
END;
$$;

REVOKE ALL ON FUNCTION private.storage_company_id_from_object_name(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.storage_company_id_from_object_name(text) TO authenticated, service_role;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-documents',
  'company-documents',
  false,
  10485760,
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE TABLE IF NOT EXISTS public.document_relations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  document_id text NOT NULL,
  entity_type text NOT NULL CHECK (
    entity_type IN (
      'vehicle',
      'customer',
      'sale',
      'credit',
      'rental',
      'contract',
      'maintenance',
      'payment',
      'employee',
      'expense',
      'cash_movement',
      'ledger_entry',
      'company'
    )
  ),
  entity_id text NOT NULL,
  relation_type text NOT NULL DEFAULT 'attachment',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT document_relations_document_fkey
    FOREIGN KEY (company_id, document_id)
    REFERENCES public.documents(company_id, id)
    ON DELETE CASCADE,
  CONSTRAINT document_relations_unique
    UNIQUE (company_id, document_id, entity_type, entity_id, relation_type)
);

CREATE INDEX IF NOT EXISTS document_relations_company_entity_idx
  ON public.document_relations (company_id, entity_type, entity_id);

CREATE INDEX IF NOT EXISTS document_relations_company_document_idx
  ON public.document_relations (company_id, document_id);

CREATE INDEX IF NOT EXISTS documents_company_type_idx
  ON public.documents (company_id, ((data->>'type')));

CREATE INDEX IF NOT EXISTS documents_company_storage_path_idx
  ON public.documents (company_id, ((data->>'storagePath')))
  WHERE NULLIF(data->>'storagePath', '') IS NOT NULL;

DROP TRIGGER IF EXISTS trg_document_relations_updated ON public.document_relations;
CREATE TRIGGER trg_document_relations_updated
  BEFORE UPDATE ON public.document_relations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.document_relations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leaders read document relations" ON public.document_relations;
DROP POLICY IF EXISTS "leaders insert document relations" ON public.document_relations;
DROP POLICY IF EXISTS "leaders update document relations" ON public.document_relations;
DROP POLICY IF EXISTS "leaders delete document relations" ON public.document_relations;

CREATE POLICY "leaders read document relations"
  ON public.document_relations
  FOR SELECT
  TO authenticated
  USING (
    private.company_role_at_least(company_id, 'manager'::public.app_role)
  );

CREATE POLICY "leaders insert document relations"
  ON public.document_relations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    private.company_role_at_least(company_id, 'manager'::public.app_role)
  );

CREATE POLICY "leaders update document relations"
  ON public.document_relations
  FOR UPDATE
  TO authenticated
  USING (
    private.company_role_at_least(company_id, 'manager'::public.app_role)
  )
  WITH CHECK (
    private.company_role_at_least(company_id, 'manager'::public.app_role)
  );

CREATE POLICY "leaders delete document relations"
  ON public.document_relations
  FOR DELETE
  TO authenticated
  USING (
    private.company_role_at_least(company_id, 'manager'::public.app_role)
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_relations TO authenticated;
GRANT ALL ON public.document_relations TO service_role;

-- Storage object convention:
-- company-documents/{company_id}/{document_id}/{filename}
DROP POLICY IF EXISTS "leaders read company document objects" ON storage.objects;
DROP POLICY IF EXISTS "leaders insert company document objects" ON storage.objects;
DROP POLICY IF EXISTS "leaders update company document objects" ON storage.objects;
DROP POLICY IF EXISTS "leaders delete company document objects" ON storage.objects;

CREATE POLICY "leaders read company document objects"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'company-documents'
    AND private.company_role_at_least(
      private.storage_company_id_from_object_name(name),
      'manager'::public.app_role
    )
  );

CREATE POLICY "leaders insert company document objects"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'company-documents'
    AND private.company_role_at_least(
      private.storage_company_id_from_object_name(name),
      'manager'::public.app_role
    )
  );

CREATE POLICY "leaders update company document objects"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'company-documents'
    AND private.company_role_at_least(
      private.storage_company_id_from_object_name(name),
      'manager'::public.app_role
    )
  )
  WITH CHECK (
    bucket_id = 'company-documents'
    AND private.company_role_at_least(
      private.storage_company_id_from_object_name(name),
      'manager'::public.app_role
    )
  );

CREATE POLICY "leaders delete company document objects"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'company-documents'
    AND private.company_role_at_least(
      private.storage_company_id_from_object_name(name),
      'manager'::public.app_role
    )
  );

COMMENT ON TABLE public.document_relations IS
  'Links private centralized documents to business entities. Existing Base64 data in JSONB rows is intentionally not migrated here.';

COMMENT ON COLUMN public.documents.data IS
  'For private files, store metadata such as storageBucket, storagePath, mimeType, size, checksum, sensitivity, and display fields. Do not store new Base64 dataUrl payloads.';
