CREATE TABLE context_credit_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id   UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  user_id       UUID,
  plan_tier     TEXT NOT NULL
                  CHECK (plan_tier IN ('free', 'pro', 'growth', 'scale', 'enterprise')),
  context_type  TEXT NOT NULL
                  CHECK (context_type IN ('basic_context', 'full_context', 'evidence_summary', 'api_enrichment')),
  credits_spent INTEGER NOT NULL CHECK (credits_spent >= 0),
  claim_id      UUID,
  ticket_ref    TEXT,
  order_ref     TEXT,
  customer_ref  TEXT,
  reason        TEXT
                  CHECK (reason IN ('item_not_received', 'damaged_item', 'chargeback_dispute', 'return_abuse_review', 'delivery_dispute', 'other')),
  metadata      JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_context_credit_events_merchant_period
  ON context_credit_events (merchant_id, occurred_at DESC);

CREATE INDEX idx_context_credit_events_claim
  ON context_credit_events (claim_id)
  WHERE claim_id IS NOT NULL;

ALTER TABLE context_credit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY context_credit_events_select_own_merchant ON context_credit_events
  FOR SELECT USING (
    merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
  );

REVOKE ALL ON context_credit_events FROM authenticated, anon;
GRANT SELECT ON context_credit_events TO authenticated;
GRANT ALL ON context_credit_events TO service_role;
