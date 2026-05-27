-- Claim operations foundation: immutable event history, operational statuses,
-- and legitimate outcome support. Additive/idempotent.

ALTER TABLE public.merchant_claims
  DROP CONSTRAINT IF EXISTS merchant_claims_status_check;

ALTER TABLE public.merchant_claims
  ADD CONSTRAINT merchant_claims_status_check
  CHECK (status in ('open','under_review','evidence_requested','pending','escalated','resolved','closed'));

ALTER TABLE public.merchant_case_outcomes
  DROP CONSTRAINT IF EXISTS merchant_case_outcomes_outcome_check;

ALTER TABLE public.merchant_case_outcomes
  ADD CONSTRAINT merchant_case_outcomes_outcome_check
  CHECK (outcome in ('loss','recovered','pending','chargeback_won','chargeback_lost','customer_verified','suspected_fraud','legitimate'));

CREATE TABLE IF NOT EXISTS public.claim_events (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.merchant_claims(id) on delete cascade,
  merchant_id uuid,
  shop_domain text,
  event_type text not null check (event_type in (
    'claim_created',
    'claim_updated',
    'note_added',
    'evidence_added',
    'outcome_added',
    'status_changed',
    'claim_resolved',
    'claim_reopened',
    'decision_reversed',
    'customer_response_copied',
    'escalation_added'
  )),
  previous_status text,
  new_status text,
  previous_decision text,
  new_decision text,
  previous_outcome text,
  new_outcome text,
  note text,
  actor_user_id text,
  actor_email_hash text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS idx_claim_events_claim_created
  ON public.claim_events (claim_id, created_at desc);

CREATE INDEX IF NOT EXISTS idx_claim_events_merchant_created
  ON public.claim_events (merchant_id, created_at desc);

CREATE INDEX IF NOT EXISTS idx_claim_events_type_created
  ON public.claim_events (event_type, created_at desc);

ALTER TABLE public.claim_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_only_claim_events_all" ON public.claim_events;
CREATE POLICY "service_role_only_claim_events_all"
ON public.claim_events
FOR ALL
TO public
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION public.prevent_claim_events_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'claim_events is append-only';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_claim_events_update ON public.claim_events;
CREATE TRIGGER trg_prevent_claim_events_update
BEFORE UPDATE ON public.claim_events
FOR EACH ROW EXECUTE FUNCTION public.prevent_claim_events_mutation();

DROP TRIGGER IF EXISTS trg_prevent_claim_events_delete ON public.claim_events;
CREATE TRIGGER trg_prevent_claim_events_delete
BEFORE DELETE ON public.claim_events
FOR EACH ROW EXECUTE FUNCTION public.prevent_claim_events_mutation();

INSERT INTO public.claim_events (
  claim_id,
  merchant_id,
  shop_domain,
  event_type,
  new_status,
  actor_user_id,
  metadata,
  created_at
)
SELECT
  c.id,
  c.merchant_id,
  c.shop_domain,
  'claim_created',
  c.status,
  c.actor_user_id::text,
  jsonb_build_object('backfilled', true),
  COALESCE(c.created_at, c.submitted_at, now())
FROM public.merchant_claims c
WHERE NOT EXISTS (
  SELECT 1
  FROM public.claim_events e
  WHERE e.claim_id = c.id
    AND e.event_type = 'claim_created'
    AND e.metadata->>'backfilled' = 'true'
);
