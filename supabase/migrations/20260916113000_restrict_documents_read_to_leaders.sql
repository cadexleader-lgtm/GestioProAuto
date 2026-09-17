-- Phase P0: centralized document archives are confidential by default.
-- This deliberately does not address attachments embedded in vehicles, vehicle_sales,
-- rentals, or any other JSONB dataUrl fields.

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members read" ON public.documents;

CREATE POLICY "leaders read documents"
  ON public.documents
  FOR SELECT
  TO authenticated
  USING (
    private.company_role_at_least(company_id, 'manager'::public.app_role)
  );

-- Existing write policies are intentionally unchanged. In particular,
-- record_payroll_payment remains the SECURITY DEFINER path that creates payroll documents.
