-- Billing: subscriptions, product analytics events

CREATE TABLE subscriptions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id           UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  tier                  TEXT NOT NULL
                          CHECK (tier IN ('free', 'pro', 'growth', 'scale', 'enterprise')),
  status                TEXT NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'trialing', 'past_due', 'canceled')),
  current_period_start  TIMESTAMPTZ NOT NULL DEFAULT date_trunc('month', now() AT TIME ZONE 'UTC'),
  current_period_end    TIMESTAMPTZ,
  provider_ref          TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_subscriptions_one_active_per_merchant
  ON subscriptions (merchant_id)
  WHERE status IN ('active', 'trialing');

CREATE INDEX idx_subscriptions_merchant ON subscriptions (merchant_id);

CREATE TABLE analytics_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id  UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  event        TEXT NOT NULL,
  props        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_analytics_events_merchant_created ON analytics_events (merchant_id, created_at DESC);
CREATE INDEX idx_analytics_events_event_created ON analytics_events (event, created_at DESC);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY subscriptions_select_own_merchant ON subscriptions
  FOR SELECT USING (
    merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
  );

CREATE POLICY analytics_events_select_own_merchant ON analytics_events
  FOR SELECT USING (
    merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
  );

-- Writes via service role (billing webhooks, metering, instrumentation)
REVOKE ALL ON subscriptions FROM authenticated, anon;
REVOKE ALL ON analytics_events FROM authenticated, anon;

GRANT SELECT ON subscriptions TO authenticated;
GRANT SELECT ON analytics_events TO authenticated;
GRANT ALL ON subscriptions TO service_role;
GRANT ALL ON analytics_events TO service_role;

-- Seed free tier for existing merchants without a subscription row
INSERT INTO subscriptions (merchant_id, tier, status, current_period_start)
SELECT m.id, 'free', 'active', date_trunc('month', now() AT TIME ZONE 'UTC')
FROM merchants m
WHERE NOT EXISTS (
  SELECT 1 FROM subscriptions s
  WHERE s.merchant_id = m.id AND s.status IN ('active', 'trialing')
);
