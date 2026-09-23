-- Gestion avancee employes (item 21, phase 4/4) : annulation controlee d'une
-- paie deja postee (erreur de saisie, employe paye deux fois par erreur...).
-- Ne supprime jamais rien (aucune trace comptable perdue) : chaque ecriture
-- de ledger annulee est marquee 'cancelled' et compensee par une ecriture
-- inverse (colonnes reversal_of/status prevues des la creation de la table
-- mais jamais utilisees jusqu'ici, cf. 20260904153136_add_ledger_entries.sql).
-- Reservee au patron (au-dela de manage.payroll qui suffit a PAYER) : annuler
-- un salaire deja verse est plus sensible que le payer.

-- Un mois annule doit pouvoir etre repaye : l'unicite (company, employeeId,
-- month) ne doit plus compter les bulletins annules.
DROP INDEX IF EXISTS public.payslips_company_employee_month_idx;
CREATE UNIQUE INDEX payslips_company_employee_month_idx
  ON public.payslips (
    company_id,
    (data->>'employeeId'),
    (data->>'month')
  )
  WHERE NULLIF(data->>'employeeId', '') IS NOT NULL
    AND NULLIF(data->>'month', '') IS NOT NULL
    AND COALESCE(data->>'status', '') <> 'cancelled';

CREATE OR REPLACE FUNCTION public.cancel_payroll_payment(
  p_company_id uuid,
  p_payslip_id text,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $function$
DECLARE
  v_payslip public.payslips;
  v_items jsonb;
  v_item jsonb;
  v_orig_entry public.ledger_entries;
  v_reversal_entry public.ledger_entries;
  v_item_expense_id text;
  v_item_amount numeric;
  v_total_reversed numeric := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  IF p_company_id IS NULL OR NOT private.is_company_member(p_company_id) THEN
    RAISE EXCEPTION 'User is not a member of this company' USING ERRCODE = '42501';
  END IF;

  IF NOT private.company_role_at_least(p_company_id, 'patron'::public.app_role) THEN
    RAISE EXCEPTION 'Insufficient permissions to cancel a payroll payment'
      USING ERRCODE = '42501';
  END IF;

  IF NULLIF(btrim(COALESCE(p_reason, '')), '') IS NULL THEN
    RAISE EXCEPTION 'A cancellation reason is required' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_payslip FROM public.payslips
   WHERE company_id = p_company_id AND id = btrim(COALESCE(p_payslip_id, ''))
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payslip not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_payslip.data->>'status' NOT IN ('posted', 'partial') THEN
    RAISE EXCEPTION 'Only a posted or partially paid payslip can be cancelled'
      USING ERRCODE = '55000';
  END IF;

  v_items := CASE
    WHEN v_payslip.data ? 'installments' THEN v_payslip.data->'installments'
    ELSE jsonb_build_array(jsonb_build_object(
      'amount', v_payslip.data->>'net',
      'ledgerEntryId', v_payslip.data->>'ledgerEntryId',
      'expenseId', v_payslip.data->>'expenseId',
      'cashMovementId', v_payslip.data->>'cashMovementId'
    ))
  END;

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items) LOOP
    IF NULLIF(v_item->>'ledgerEntryId', '') IS NULL THEN
      CONTINUE;
    END IF;

    SELECT * INTO v_orig_entry FROM public.ledger_entries
     WHERE company_id = p_company_id AND id = (v_item->>'ledgerEntryId')::uuid
     FOR UPDATE;

    IF NOT FOUND OR v_orig_entry.status <> 'posted' THEN
      CONTINUE;
    END IF;

    UPDATE public.ledger_entries SET status = 'cancelled' WHERE id = v_orig_entry.id;

    INSERT INTO public.ledger_entries (
      company_id, source_module, source_type, source_id, cash_account_id,
      direction, amount, currency, occurred_at, status, idempotency_key,
      description, metadata, created_by, reversal_of
    )
    VALUES (
      p_company_id, 'payroll', 'payroll_payment_reversal',
      v_orig_entry.source_id || ':reversal', v_orig_entry.cash_account_id,
      CASE WHEN v_orig_entry.direction = 'out' THEN 'in' ELSE 'out' END,
      v_orig_entry.amount, v_orig_entry.currency, now(), 'posted',
      v_orig_entry.idempotency_key || ':cancel',
      'Annulation — ' || v_orig_entry.description,
      jsonb_build_object('payslip_id', v_payslip.id, 'reversal_of', v_orig_entry.id),
      auth.uid(), v_orig_entry.id
    )
    RETURNING * INTO v_reversal_entry;

    INSERT INTO public.cash_movements (id, company_id, data)
    VALUES (
      'payroll-cash-reversal:' || v_orig_entry.id::text, p_company_id,
      jsonb_build_object(
        'type', v_reversal_entry.direction, 'label', v_reversal_entry.description,
        'amount', v_reversal_entry.amount, 'date', v_reversal_entry.occurred_at,
        'currency', v_reversal_entry.currency, 'source', v_reversal_entry.cash_account_id,
        'source_type', 'payroll_payment_reversal', 'source_id', v_reversal_entry.source_id,
        'ledger_entry_id', v_reversal_entry.id, 'payslipId', v_payslip.id
      )
    )
    ON CONFLICT (company_id, id) DO NOTHING;

    v_item_expense_id := v_item->>'expenseId';
    IF v_item_expense_id IS NOT NULL THEN
      UPDATE public.expenses
         SET data = data || jsonb_build_object('status', 'cancelled', 'cancelledAt', now())
       WHERE company_id = p_company_id AND id = v_item_expense_id;
    END IF;

    v_item_amount := COALESCE(NULLIF(v_item->>'amount', '')::numeric, 0);
    v_total_reversed := v_total_reversed + v_item_amount;
  END LOOP;

  UPDATE public.payslips
     SET data = data || jsonb_build_object(
       'status', 'cancelled',
       'cancelledAt', now(),
       'cancelReason', btrim(p_reason),
       'cancelledBy', auth.uid()::text
     )
   WHERE company_id = p_company_id AND id = v_payslip.id
   RETURNING * INTO v_payslip;

  IF NULLIF(v_payslip.data->>'documentId', '') IS NOT NULL THEN
    UPDATE public.documents
       SET data = data || jsonb_build_object('status', 'cancelled')
     WHERE company_id = p_company_id AND id = v_payslip.data->>'documentId';
  END IF;

  RETURN jsonb_build_object(
    'payslip_id', v_payslip.id,
    'payslip', v_payslip.data,
    'total_reversed', v_total_reversed
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.cancel_payroll_payment(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_payroll_payment(uuid, text, text) TO authenticated;
