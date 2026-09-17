CREATE TABLE public.ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  source_module text NOT NULL,
  source_type text NOT NULL,
  source_id text NOT NULL,
  cash_account_id text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('in', 'out')),
  amount numeric(20, 0) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'XOF',
  occurred_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'posted'
    CHECK (status IN ('pending', 'posted', 'cancelled')),
  idempotency_key text NOT NULL,
  reversal_of uuid REFERENCES public.ledger_entries(id),
  description text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ledger_entries_company_idempotency_key_key
    UNIQUE (company_id, idempotency_key),
  CONSTRAINT ledger_entries_reversal_not_self
    CHECK (reversal_of IS NULL OR reversal_of <> id)
);

CREATE INDEX ledger_entries_company_occurred_at_idx
  ON public.ledger_entries (company_id, occurred_at);

CREATE INDEX ledger_entries_company_source_idx
  ON public.ledger_entries (company_id, source_module, source_type, source_id);

CREATE INDEX ledger_entries_company_cash_account_idx
  ON public.ledger_entries (company_id, cash_account_id);

GRANT SELECT, INSERT ON public.ledger_entries TO authenticated;
GRANT ALL ON public.ledger_entries TO service_role;

ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read ledger entries"
  ON public.ledger_entries
  FOR SELECT
  TO authenticated
  USING (private.is_company_member(company_id));

CREATE POLICY "members insert ledger entries"
  ON public.ledger_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    private.is_company_member(company_id)
    AND created_by = auth.uid()
  );
