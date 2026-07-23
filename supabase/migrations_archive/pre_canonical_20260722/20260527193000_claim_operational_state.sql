-- Persist operational inbox state for claims.
-- Additive/idempotent so existing pilot data can migrate safely.

ALTER TABLE public.merchant_claims
  ADD COLUMN IF NOT EXISTS first_viewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS first_viewed_by uuid,
  ADD COLUMN IF NOT EXISTS assigned_to uuid,
  ADD COLUMN IF NOT EXISTS assigned_at timestamptz,
  ADD COLUMN IF NOT EXISTS snoozed_until timestamptz,
  ADD COLUMN IF NOT EXISTS snooze_reason text,
  ADD COLUMN IF NOT EXISTS last_customer_response_text text,
  ADD COLUMN IF NOT EXISTS last_customer_response_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_customer_response_by uuid;

CREATE INDEX IF NOT EXISTS idx_merchant_claims_viewed
  ON public.merchant_claims (merchant_id, first_viewed_at);

CREATE INDEX IF NOT EXISTS idx_merchant_claims_assignment
  ON public.merchant_claims (merchant_id, assigned_to, status);

CREATE INDEX IF NOT EXISTS idx_merchant_claims_snoozed
  ON public.merchant_claims (merchant_id, snoozed_until, status);

ALTER TABLE public.claim_events
  DROP CONSTRAINT IF EXISTS claim_events_event_type_check;

ALTER TABLE public.claim_events
  ADD CONSTRAINT claim_events_event_type_check
  CHECK (event_type in (
    'claim_created',
    'claim_updated',
    'claim_viewed',
    'claim_assigned',
    'claim_unassigned',
    'claim_snoozed',
    'claim_unsnoozed',
    'note_added',
    'evidence_added',
    'outcome_added',
    'status_changed',
    'claim_resolved',
    'claim_reopened',
    'decision_reversed',
    'customer_response_copied',
    'customer_response_saved',
    'escalation_added'
  ));

INSERT INTO public.claim_events (
  claim_id,
  merchant_id,
  shop_domain,
  event_type,
  actor_user_id,
  metadata,
  created_at
)
SELECT
  e.claim_id,
  c.merchant_id,
  c.shop_domain,
  'evidence_added',
  e.actor_user_id::text,
  jsonb_build_object(
    'backfilled', true,
    'evidence_id', e.id,
    'evidence_type', e.evidence_type,
    'source', e.source
  ),
  COALESCE(e.created_at, now())
FROM public.claim_evidence_items e
JOIN public.merchant_claims c ON c.id = e.claim_id
WHERE NOT EXISTS (
  SELECT 1
  FROM public.claim_events ce
  WHERE ce.claim_id = e.claim_id
    AND ce.event_type = 'evidence_added'
    AND ce.metadata->>'evidence_id' = e.id::text
);
