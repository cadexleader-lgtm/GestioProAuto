-- Gestion avancee employes (item 21, phase 1/4) : statut de sortie
-- (licenciement/demission/fin de contrat) + historique salarial. Les
-- ecritures directes sur employees sont revoquees depuis
-- 20260923150000_add_supplier_employee_create_rpc.sql (create-only) ; toute
-- mise a jour doit donc passer par une RPC dediee comme le reste du projet.

CREATE OR REPLACE FUNCTION public.terminate_employee(
  p_company_id uuid,
  p_employee_id text,
  p_reason text,
  p_terminated_at date DEFAULT CURRENT_DATE
)
RETURNS public.employees
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $function$
DECLARE
  v_employee public.employees;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  IF p_company_id IS NULL OR NOT private.is_company_member(p_company_id) THEN
    RAISE EXCEPTION 'User is not a member of this company' USING ERRCODE = '42501';
  END IF;

  IF NOT private.company_role_at_least(p_company_id, 'manager'::public.app_role) THEN
    RAISE EXCEPTION 'Insufficient permissions to change employee status'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_employee FROM public.employees
   WHERE company_id = p_company_id AND id = btrim(COALESCE(p_employee_id, ''))
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Employee not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_employee.data->>'status' = 'inactive' THEN
    RAISE EXCEPTION 'Employee is already inactive' USING ERRCODE = '55000';
  END IF;

  UPDATE public.employees
     SET data = data || jsonb_build_object(
       'status', 'inactive',
       'terminatedAt', to_char(COALESCE(p_terminated_at, CURRENT_DATE), 'YYYY-MM-DD'),
       'terminationReason', COALESCE(btrim(p_reason), '')
     )
   WHERE company_id = p_company_id AND id = v_employee.id
   RETURNING * INTO v_employee;

  RETURN v_employee;
END;
$function$;

REVOKE ALL ON FUNCTION public.terminate_employee(uuid, text, text, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.terminate_employee(uuid, text, text, date) TO authenticated;

CREATE OR REPLACE FUNCTION public.reactivate_employee(
  p_company_id uuid,
  p_employee_id text
)
RETURNS public.employees
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $function$
DECLARE
  v_employee public.employees;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  IF p_company_id IS NULL OR NOT private.is_company_member(p_company_id) THEN
    RAISE EXCEPTION 'User is not a member of this company' USING ERRCODE = '42501';
  END IF;

  IF NOT private.company_role_at_least(p_company_id, 'manager'::public.app_role) THEN
    RAISE EXCEPTION 'Insufficient permissions to change employee status'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_employee FROM public.employees
   WHERE company_id = p_company_id AND id = btrim(COALESCE(p_employee_id, ''))
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Employee not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_employee.data->>'status' <> 'inactive' THEN
    RAISE EXCEPTION 'Employee is not inactive' USING ERRCODE = '55000';
  END IF;

  UPDATE public.employees
     SET data = (data || jsonb_build_object('status', 'present'))
                 - 'terminatedAt' - 'terminationReason'
   WHERE company_id = p_company_id AND id = v_employee.id
   RETURNING * INTO v_employee;

  RETURN v_employee;
END;
$function$;

REVOKE ALL ON FUNCTION public.reactivate_employee(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reactivate_employee(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_employee_salary(
  p_company_id uuid,
  p_employee_id text,
  p_new_salary numeric,
  p_effective_at date,
  p_reason text DEFAULT ''
)
RETURNS public.employees
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $function$
DECLARE
  v_employee public.employees;
  v_previous numeric;
  v_history jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  IF p_company_id IS NULL OR NOT private.is_company_member(p_company_id) THEN
    RAISE EXCEPTION 'User is not a member of this company' USING ERRCODE = '42501';
  END IF;

  IF NOT private.company_role_at_least(p_company_id, 'manager'::public.app_role) THEN
    RAISE EXCEPTION 'Insufficient permissions to change salary'
      USING ERRCODE = '42501';
  END IF;

  IF p_new_salary IS NULL OR p_new_salary <= 0 THEN
    RAISE EXCEPTION 'New salary must be greater than zero' USING ERRCODE = '22003';
  END IF;

  SELECT * INTO v_employee FROM public.employees
   WHERE company_id = p_company_id AND id = btrim(COALESCE(p_employee_id, ''))
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Employee not found' USING ERRCODE = 'P0002';
  END IF;

  v_previous := COALESCE((v_employee.data->>'salary')::numeric, 0);

  IF v_previous = p_new_salary THEN
    RAISE EXCEPTION 'New salary is identical to the current salary' USING ERRCODE = '22023';
  END IF;

  v_history := COALESCE(v_employee.data->'salaryHistory', '[]'::jsonb);
  v_history := jsonb_build_array(jsonb_build_object(
    'previousSalary', v_previous,
    'newSalary', p_new_salary,
    'effectiveAt', to_char(COALESCE(p_effective_at, CURRENT_DATE), 'YYYY-MM-DD'),
    'reason', COALESCE(btrim(p_reason), ''),
    'changedAt', now()
  )) || v_history;

  UPDATE public.employees
     SET data = data || jsonb_build_object('salary', p_new_salary, 'salaryHistory', v_history)
   WHERE company_id = p_company_id AND id = v_employee.id
   RETURNING * INTO v_employee;

  RETURN v_employee;
END;
$function$;

REVOKE ALL ON FUNCTION public.update_employee_salary(uuid, text, numeric, date, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_employee_salary(uuid, text, numeric, date, text) TO authenticated;
