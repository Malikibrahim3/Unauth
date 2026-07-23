-- Restore the context-credit / billing-lifecycle RPCs.
--
-- These functions were defined in 20260603200000_billing_lifecycle.sql but were
-- lost in the 2026-06-11 v2 schema rebuild (which replaced `public`): the tables
-- (merchant_credits, context_credit_events, credit_topup_log, merchant_subscriptions)
-- were recreated but these SECURITY DEFINER functions were not. Re-created verbatim
-- from that tested migration. Tables are unchanged, so this only (re)defines
-- functions — no DDL/data changes.

BEGIN;

-- Atomic credit deduction (top-up first, then monthly).
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

-- Add top-up credits (idempotent on payment intent).
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

-- Reset monthly credits on billing cycle.
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

-- Set monthly credits (upgrade proration / payment recovery).
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

-- Consume context credits via merchant_credits balances, recording a ledger row.
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

COMMIT;
