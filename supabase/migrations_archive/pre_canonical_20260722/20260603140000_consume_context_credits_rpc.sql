-- Atomic context-credit consumption (merchant-scoped, billing-period aware).

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
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_used INTEGER;
  v_remaining INTEGER;
BEGIN
  IF p_credits_to_spend < 0 THEN
    RAISE EXCEPTION 'p_credits_to_spend must be non-negative';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_merchant_id::text));

  SELECT COALESCE(SUM(credits_spent), 0)::INTEGER
    INTO v_used
  FROM context_credit_events
  WHERE merchant_id = p_merchant_id
    AND occurred_at >= p_period_start
    AND occurred_at < p_period_end;

  IF p_monthly_allowance IS NOT NULL THEN
    v_remaining := GREATEST(p_monthly_allowance - v_used, 0);
    IF p_credits_to_spend > v_remaining THEN
      RETURN jsonb_build_object(
        'ok', false,
        'used', v_used,
        'remaining', v_remaining,
        'credits_required', p_credits_to_spend
      );
    END IF;
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
    p_credits_to_spend,
    p_claim_id,
    p_ticket_ref,
    p_order_ref,
    p_customer_ref,
    p_reason,
    COALESCE(p_metadata, '{}'::jsonb)
  );

  v_used := v_used + p_credits_to_spend;

  IF p_monthly_allowance IS NULL THEN
    RETURN jsonb_build_object(
      'ok', true,
      'used', v_used,
      'remaining', NULL,
      'credits_spent', p_credits_to_spend
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'used', v_used,
    'remaining', GREATEST(p_monthly_allowance - v_used, 0),
    'credits_spent', p_credits_to_spend
  );
END;
$$;

REVOKE ALL ON FUNCTION consume_context_credits_if_available(
  UUID, UUID, TEXT, TEXT, INTEGER, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER,
  UUID, TEXT, TEXT, TEXT, TEXT, JSONB
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION consume_context_credits_if_available(
  UUID, UUID, TEXT, TEXT, INTEGER, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER,
  UUID, TEXT, TEXT, TEXT, TEXT, JSONB
) TO service_role;
