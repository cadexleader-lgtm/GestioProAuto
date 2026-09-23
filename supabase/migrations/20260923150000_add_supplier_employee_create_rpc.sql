-- suppliers/employees n'avaient aucune RPC : creation en ecriture directe
-- (db.add), sans idempotency, GRANT INSERT/UPDATE/DELETE ouvert a tout membre.
-- Aucune UI n'edite ni ne supprime ces enregistrements (verifie), seule la
-- creation est necessaire.

CREATE OR REPLACE FUNCTION public.create_supplier(
  p_company_id uuid,
  p_supplier_id text,
  p_data jsonb
)
RETURNS public.suppliers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_row public.suppliers;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  IF p_company_id IS NULL OR NOT private.is_company_member(p_company_id) THEN
    RAISE EXCEPTION 'User is not a member of this company' USING ERRCODE = '42501';
  END IF;

  IF NULLIF(btrim(COALESCE(p_supplier_id, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Supplier id must not be empty' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.suppliers (id, company_id, data)
  VALUES (btrim(p_supplier_id), p_company_id, COALESCE(p_data, '{}'::jsonb))
  ON CONFLICT (company_id, id) DO NOTHING
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    SELECT * INTO v_row FROM public.suppliers
     WHERE company_id = p_company_id AND id = btrim(p_supplier_id);
  END IF;

  RETURN v_row;
END;
$function$;

REVOKE ALL ON FUNCTION public.create_supplier(uuid, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_supplier(uuid, text, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_employee(
  p_company_id uuid,
  p_employee_id text,
  p_data jsonb
)
RETURNS public.employees
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_row public.employees;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  IF p_company_id IS NULL OR NOT private.is_company_member(p_company_id) THEN
    RAISE EXCEPTION 'User is not a member of this company' USING ERRCODE = '42501';
  END IF;

  IF NULLIF(btrim(COALESCE(p_employee_id, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Employee id must not be empty' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.employees (id, company_id, data)
  VALUES (btrim(p_employee_id), p_company_id, COALESCE(p_data, '{}'::jsonb))
  ON CONFLICT (company_id, id) DO NOTHING
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    SELECT * INTO v_row FROM public.employees
     WHERE company_id = p_company_id AND id = btrim(p_employee_id);
  END IF;

  RETURN v_row;
END;
$function$;

REVOKE ALL ON FUNCTION public.create_employee(uuid, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_employee(uuid, text, jsonb) TO authenticated;

REVOKE INSERT, UPDATE, DELETE ON public.suppliers FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.suppliers FROM PUBLIC;
REVOKE INSERT, UPDATE, DELETE ON public.employees FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.employees FROM PUBLIC;
