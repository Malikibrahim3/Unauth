-- Harden rule_evaluations for claim decision audit traceability and deduplication.

ALTER TABLE public.rule_evaluations
  ADD COLUMN IF NOT EXISTS source_ticket_id uuid REFERENCES public.source_tickets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS evaluation_source text,
  ADD COLUMN IF NOT EXISTS signals_hash text,
  ADD COLUMN IF NOT EXISTS context_hash text,
  ADD COLUMN IF NOT EXISTS rules_hash text,
  ADD COLUMN IF NOT EXISTS justification_summary text,
  ADD COLUMN IF NOT EXISTS dedupe_key text;

CREATE INDEX IF NOT EXISTS rule_evaluations_dedupe_key_evaluated
  ON public.rule_evaluations (merchant_id, dedupe_key, evaluated_at DESC)
  WHERE dedupe_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS rule_evaluations_source_ticket
  ON public.rule_evaluations (merchant_id, source_ticket_id)
  WHERE source_ticket_id IS NOT NULL;

-- Idempotent auto-attached delivery evidence (one row per claim).
CREATE UNIQUE INDEX IF NOT EXISTS claim_evidence_fulfillment_sync_uniq
  ON public.claim_evidence (claim_id)
  WHERE (metadata->>'auto_source') = 'fulfillment_sync';
