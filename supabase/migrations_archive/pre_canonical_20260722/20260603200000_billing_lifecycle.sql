-- Billing lifecycle: plans, merchant_subscriptions, merchant_credits, top-up log, webhook log.

-- ---------------------------------------------------------------------------
-- Plans catalog (Stripe price IDs synced from env at checkout; null in DB seed)
-- ---------------------------------------------------------------------------
CREATE TABLE plans (
  plan_id           TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  price_gbp         NUMERIC(10, 2) NOT NULL DEFAULT 0,
  credits_monthly   INTEGER,
  stripe_price_id   TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO plans (plan_id, name, price_gbp, credits_monthly, stripe_price_id) VALUES
  ('free',   'Free',   0,    100,  NULL),
  ('pro',    'Pro',    99,   1000, NULL),
  ('growth', 'Growth', 399,  5000, NULL),
  ('scale',  'Scale',  0,    NULL, NULL);

ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY plans_select_all ON plans FOR SELECT USING (true);
GRANT SELECT ON plans TO authenticated, anon;

-- ---------------------------------------------------------------------------
-- Merchant subscriptions (replaces subscriptions for billing lifecycle)
-- ---------------------------------------------------------------------------
CREATE TABLE merchant_subscriptions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id             UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  plan_id                 TEXT NOT NULL REFERENCES plans(plan_id),
  status                  TEXT NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active', 'past_due', 'grace_period', 'cancelled', 'free')),
  stripe_subscription_id  TEXT,
  stripe_customer_id      TEXT,
  current_period_start    TIMESTAMPTZ NOT NULL DEFAULT date_trunc('month', now() AT TIME ZONE 'UTC'),
  current_period_end      TIMESTAMPTZ,
  cancel_at_period_end    BOOLEAN NOT NULL DEFAULT false,
  downgrade_to_plan_id    TEXT REFERENCES plans(plan_id),
  grace_period_ends_at    TIMESTAMPTZ,
  context_credits_monthly INTEGER,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_merchant_subscriptions_one_live
  ON merchant_subscriptions (merchant_id)
  WHERE status IN ('active', 'grace_period', 'past_due', 'free');

CREATE INDEX idx_merchant_subscriptions_merchant ON merchant_subscriptions (merchant_id);
CREATE INDEX idx_merchant_subscriptions_stripe_sub ON merchant_subscriptions (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;
CREATE INDEX idx_merchant_subscriptions_stripe_customer ON merchant_subscriptions (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Merchant credits (monthly + top-up balances)
-- ---------------------------------------------------------------------------
CREATE TABLE merchant_credits (
  merchant_id                 UUID PRIMARY KEY REFERENCES merchants(id) ON DELETE CASCADE,
  monthly_credits_remaining   INTEGER NOT NULL DEFAULT 0 CHECK (monthly_credits_remaining >= 0),
  topup_credits_remaining     INTEGER NOT NULL DEFAULT 0 CHECK (topup_credits_remaining >= 0),
  cycle_reset_at              TIMESTAMPTZ NOT NULL,
  last_reset_at               TIMESTAMPTZ,
  usage_warning_sent_at       TIMESTAMPTZ,
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Top-up audit log
-- ---------------------------------------------------------------------------
CREATE TABLE credit_topup_log (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id               UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  credits_added             INTEGER NOT NULL CHECK (credits_added > 0),
  amount_gbp                NUMERIC(10, 2) NOT NULL,
  stripe_payment_intent_id  TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_credit_topup_log_merchant ON credit_topup_log (merchant_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Webhook / billing event log (idempotent via stripe_event_id)
-- ---------------------------------------------------------------------------
CREATE TABLE billing_events_log (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id      UUID REFERENCES merchants(id) ON DELETE SET NULL,
  event_type       TEXT NOT NULL,
  stripe_event_id  TEXT,
  payload          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_billing_events_stripe_event_id
  ON billing_events_log (stripe_event_id)
  WHERE stripe_event_id IS NOT NULL;

CREATE INDEX idx_billing_events_merchant ON billing_events_log (merchant_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- RLS: merchants read own rows; service role writes
-- ---------------------------------------------------------------------------
ALTER TABLE merchant_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_topup_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_events_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY merchant_subscriptions_select_own ON merchant_subscriptions
  FOR SELECT USING (
    merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
  );

CREATE POLICY merchant_credits_select_own ON merchant_credits
  FOR SELECT USING (
    merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
  );

CREATE POLICY credit_topup_log_select_own ON credit_topup_log
  FOR SELECT USING (
    merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
  );

CREATE POLICY billing_events_log_select_own ON billing_events_log
  FOR SELECT USING (
    merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
  );

REVOKE ALL ON merchant_subscriptions FROM authenticated, anon;
REVOKE ALL ON merchant_credits FROM authenticated, anon;
REVOKE ALL ON credit_topup_log FROM authenticated, anon;
REVOKE ALL ON billing_events_log FROM authenticated, anon;

GRANT SELECT ON merchant_subscriptions TO authenticated;
GRANT SELECT ON merchant_credits TO authenticated;
GRANT SELECT ON credit_topup_log TO authenticated;
GRANT SELECT ON billing_events_log TO authenticated;

GRANT ALL ON merchant_subscriptions TO service_role;
GRANT ALL ON merchant_credits TO service_role;
GRANT ALL ON credit_topup_log TO service_role;
GRANT ALL ON billing_events_log TO service_role;
GRANT ALL ON plans TO service_role;

-- ---------------------------------------------------------------------------
-- Migrate from legacy subscriptions table
-- ---------------------------------------------------------------------------
INSERT INTO merchant_subscriptions (
  merchant_id,
  plan_id,
  status,
  stripe_subscription_id,
  current_period_start,
  current_period_end,
  context_credits_monthly
)
SELECT
  s.merchant_id,
  CASE
    WHEN s.tier = 'enterprise' THEN 'scale'
    ELSE s.tier
  END,
  CASE
    WHEN s.status = 'canceled' THEN 'cancelled'
    WHEN s.status = 'past_due' THEN 'past_due'
    WHEN s.tier = 'free' AND s.status = 'active' THEN 'free'
    ELSE 'active'
  END,
  s.provider_ref,
  s.current_period_start,
  s.current_period_end,
  s.context_credits_monthly
FROM subscriptions s
WHERE s.status IN ('active', 'trialing', 'past_due', 'canceled')
  AND NOT EXISTS (
    SELECT 1 FROM merchant_subscriptions ms WHERE ms.merchant_id = s.merchant_id
  );

INSERT INTO merchant_credits (merchant_id, monthly_credits_remaining, topup_credits_remaining, cycle_reset_at, last_reset_at)
SELECT
  ms.merchant_id,
  GREATEST(
    COALESCE(
      CASE
        WHEN ms.plan_id = 'free' THEN 100
        WHEN ms.plan_id = 'pro' THEN 1000
        WHEN ms.plan_id = 'growth' THEN 5000
        WHEN ms.context_credits_monthly IS NOT NULL THEN ms.context_credits_monthly
        ELSE 100
      END,
      0
    ) - COALESCE(usage.used, 0),
    0
  ),
  0,
  COALESCE(ms.current_period_end, date_trunc('month', now() AT TIME ZONE 'UTC') + interval '1 month'),
  ms.current_period_start
FROM merchant_subscriptions ms
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(cce.credits_spent), 0)::INTEGER AS used
  FROM context_credit_events cce
  WHERE cce.merchant_id = ms.merchant_id
    AND cce.occurred_at >= ms.current_period_start
    AND (ms.current_period_end IS NULL OR cce.occurred_at < ms.current_period_end)
) usage ON true
WHERE NOT EXISTS (
  SELECT 1 FROM merchant_credits mc WHERE mc.merchant_id = ms.merchant_id
);

-- Seed merchants without any subscription row
INSERT INTO merchant_subscriptions (merchant_id, plan_id, status, current_period_start)
SELECT m.id, 'free', 'free', date_trunc('month', now() AT TIME ZONE 'UTC')
FROM merchants m
WHERE NOT EXISTS (
  SELECT 1 FROM merchant_subscriptions ms WHERE ms.merchant_id = m.id
);

INSERT INTO merchant_credits (merchant_id, monthly_credits_remaining, topup_credits_remaining, cycle_reset_at)
SELECT
  ms.merchant_id,
  100,
  0,
  date_trunc('month', now() AT TIME ZONE 'UTC') + interval '1 month'
FROM merchant_subscriptions ms
WHERE ms.plan_id = 'free'
  AND NOT EXISTS (SELECT 1 FROM merchant_credits mc WHERE mc.merchant_id = ms.merchant_id);

-- ---------------------------------------------------------------------------
-- Atomic credit deduction (top-up first, then monthly)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION deduct_merchant_credits(
  p_merchant_id UUID,
  p_credits INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_monthly INTEGER;
  v_topup INTEGER;
  v_from_topup INTEGER;
  v_from_monthly INTEGER;
BEGIN
  IF p_credits <= 0 THEN
    RAISE EXCEPTION 'p_credits must be positive';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('mc:' || p_merchant_id::text));

  SELECT monthly_credits_remaining, topup_credits_remaining
    INTO v_monthly, v_topup
  FROM merchant_credits
  WHERE merchant_id = p_merchant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'credits_not_found');
  END IF;

  IF (v_topup + v_monthly) < p_credits THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'insufficient_credits',
      'monthly_remaining', v_monthly,
      'topup_remaining', v_topup
    );
  END IF;

  v_from_topup := LEAST(v_topup, p_credits);
  v_from_monthly := p_credits - v_from_topup;

  UPDATE merchant_credits
  SET
    topup_credits_remaining = topup_credits_remaining - v_from_topup,
    monthly_credits_remaining = monthly_credits_remaining - v_from_monthly,
    updated_at = now()
  WHERE merchant_id = p_merchant_id;

  RETURN jsonb_build_object(
    'ok', true,
    'from_topup', v_from_topup,
    'from_monthly', v_from_monthly,
    'monthly_remaining', v_monthly - v_from_monthly,
    'topup_remaining', v_topup - v_from_topup
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Add top-up credits (idempotent on payment intent)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION add_merchant_topup_credits(
  p_merchant_id UUID,
  p_credits INTEGER,
  p_amount_gbp NUMERIC,
  p_stripe_payment_intent_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing UUID;
BEGIN
  IF p_credits <= 0 THEN
    RAISE EXCEPTION 'p_credits must be positive';
  END IF;

  IF p_stripe_payment_intent_id IS NOT NULL THEN
    SELECT id INTO v_existing
    FROM credit_topup_log
    WHERE stripe_payment_intent_id = p_stripe_payment_intent_id
    LIMIT 1;

    IF FOUND THEN
      RETURN jsonb_build_object('ok', true, 'duplicate', true);
    END IF;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('mc:' || p_merchant_id::text));

  INSERT INTO merchant_credits (merchant_id, monthly_credits_remaining, topup_credits_remaining, cycle_reset_at)
  SELECT p_merchant_id, 100, 0, date_trunc('month', now() AT TIME ZONE 'UTC') + interval '1 month'
  WHERE NOT EXISTS (SELECT 1 FROM merchant_credits WHERE merchant_id = p_merchant_id);

  UPDATE merchant_credits
  SET
    topup_credits_remaining = topup_credits_remaining + p_credits,
    updated_at = now()
  WHERE merchant_id = p_merchant_id;

  INSERT INTO credit_topup_log (merchant_id, credits_added, amount_gbp, stripe_payment_intent_id)
  VALUES (p_merchant_id, p_credits, p_amount_gbp, p_stripe_payment_intent_id);

  RETURN jsonb_build_object('ok', true, 'duplicate', false);
END;
$$;

-- ---------------------------------------------------------------------------
-- Reset monthly credits on billing cycle
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION reset_merchant_monthly_credits(
  p_merchant_id UUID,
  p_monthly_allowance INTEGER,
  p_cycle_reset_at TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('mc:' || p_merchant_id::text));

  INSERT INTO merchant_credits (merchant_id, monthly_credits_remaining, topup_credits_remaining, cycle_reset_at)
  VALUES (p_merchant_id, p_monthly_allowance, 0, p_cycle_reset_at)
  ON CONFLICT (merchant_id) DO UPDATE SET
    monthly_credits_remaining = EXCLUDED.monthly_credits_remaining,
    last_reset_at = now(),
    cycle_reset_at = EXCLUDED.cycle_reset_at,
    usage_warning_sent_at = NULL,
    updated_at = now();

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- ---------------------------------------------------------------------------
-- Set monthly credits (upgrade proration / payment recovery)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_merchant_monthly_credits(
  p_merchant_id UUID,
  p_monthly_credits INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('mc:' || p_merchant_id::text));

  UPDATE merchant_credits
  SET
    monthly_credits_remaining = GREATEST(p_monthly_credits, monthly_credits_remaining),
    updated_at = now()
  WHERE merchant_id = p_merchant_id;

  IF NOT FOUND THEN
    INSERT INTO merchant_credits (merchant_id, monthly_credits_remaining, topup_credits_remaining, cycle_reset_at)
    VALUES (
      p_merchant_id,
      p_monthly_credits,
      0,
      date_trunc('month', now() AT TIME ZONE 'UTC') + interval '1 month'
    );
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- ---------------------------------------------------------------------------
-- Consume context credits via merchant_credits balances
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION consume_context_credits_if_available(
  p_merchant_id UUID,
  p_user_id UUID,
  p_plan_tier TEXT,
  p_context_type TEXT,
  p_credits_to_spend INTEGER,
  p_period_start TIMESTAMPTZ,
  p_period_end TIMESTAMPTZ,
  p_monthly_allowance INTEGER,
  p_claim_id UUID DEFAULT NULL,
  p_ticket_ref TEXT DEFAULT NULL,
  p_order_ref TEXT DEFAULT NULL,
  p_customer_ref TEXT DEFAULT NULL,
  p_reason TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_allow_soft_cap BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_monthly INTEGER;
  v_topup INTEGER;
  v_total INTEGER;
  v_soft_cap BOOLEAN;
  v_deduct JSONB;
  v_used INTEGER;
  v_allowance INTEGER;
BEGIN
  IF p_credits_to_spend < 0 THEN
    RAISE EXCEPTION 'p_credits_to_spend must be non-negative';
  END IF;

  IF p_monthly_allowance IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'allowance_required',
      'used', 0,
      'remaining', 0,
      'credits_required', p_credits_to_spend
    );
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('mc:' || p_merchant_id::text));

  SELECT monthly_credits_remaining, topup_credits_remaining
    INTO v_monthly, v_topup
  FROM merchant_credits
  WHERE merchant_id = p_merchant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO merchant_credits (merchant_id, monthly_credits_remaining, topup_credits_remaining, cycle_reset_at)
    VALUES (p_merchant_id, p_monthly_allowance, 0, p_period_end)
    RETURNING monthly_credits_remaining, topup_credits_remaining INTO v_monthly, v_topup;
  END IF;

  v_total := v_monthly + v_topup;
  v_allowance := p_monthly_allowance;

  v_soft_cap := COALESCE(p_allow_soft_cap, FALSE)
    AND p_context_type = 'basic_context'
    AND p_credits_to_spend = 1
    AND v_total = 0;

  IF NOT v_soft_cap AND p_credits_to_spend > v_total THEN
    v_used := v_allowance - v_monthly;
    RETURN jsonb_build_object(
      'ok', false,
      'used', GREATEST(v_used, 0),
      'remaining', v_total,
      'credits_required', p_credits_to_spend
    );
  END IF;

  IF NOT v_soft_cap THEN
    v_deduct := deduct_merchant_credits(p_merchant_id, p_credits_to_spend);
    IF NOT (v_deduct->>'ok')::BOOLEAN THEN
      RETURN jsonb_build_object(
        'ok', false,
        'used', v_allowance - v_monthly,
        'remaining', v_total,
        'credits_required', p_credits_to_spend
      );
    END IF;
    SELECT monthly_credits_remaining, topup_credits_remaining
      INTO v_monthly, v_topup
    FROM merchant_credits
    WHERE merchant_id = p_merchant_id;
  END IF;

  INSERT INTO context_credit_events (
    merchant_id,
    user_id,
    plan_tier,
    context_type,
    credits_spent,
    claim_id,
    ticket_ref,
    order_ref,
    customer_ref,
    reason,
    metadata
  ) VALUES (
    p_merchant_id,
    p_user_id,
    p_plan_tier,
    p_context_type,
    CASE WHEN v_soft_cap THEN 0 ELSE p_credits_to_spend END,
    p_claim_id,
    p_ticket_ref,
    p_order_ref,
    p_customer_ref,
    p_reason,
    CASE
      WHEN v_soft_cap THEN COALESCE(p_metadata, '{}'::jsonb) || jsonb_build_object('soft_cap_exhausted', true)
      ELSE COALESCE(p_metadata, '{}'::jsonb)
    END
  );

  v_used := v_allowance - v_monthly;

  RETURN jsonb_build_object(
    'ok', true,
    'used', GREATEST(v_used, 0),
    'remaining', v_monthly + v_topup,
    'monthly_remaining', v_monthly,
    'topup_remaining', v_topup,
    'credits_spent', CASE WHEN v_soft_cap THEN 0 ELSE p_credits_to_spend END,
    'soft_cap', v_soft_cap
  );
END;
$$;

REVOKE ALL ON FUNCTION deduct_merchant_credits(UUID, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION add_merchant_topup_credits(UUID, INTEGER, NUMERIC, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION reset_merchant_monthly_credits(UUID, INTEGER, TIMESTAMPTZ) FROM PUBLIC;
REVOKE ALL ON FUNCTION set_merchant_monthly_credits(UUID, INTEGER) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION deduct_merchant_credits(UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION add_merchant_topup_credits(UUID, INTEGER, NUMERIC, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION reset_merchant_monthly_credits(UUID, INTEGER, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION set_merchant_monthly_credits(UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION consume_context_credits_if_available(
  UUID, UUID, TEXT, TEXT, INTEGER, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER,
  UUID, TEXT, TEXT, TEXT, TEXT, JSONB, BOOLEAN
) TO service_role;
