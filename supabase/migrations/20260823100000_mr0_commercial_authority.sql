-- MR0: canonical subscription intent and idempotent usage receipts.
-- A plan query parameter is only a proposal. Subscription state changes only
-- after a server-owned intent and (for paid plans) provider confirmation.

ALTER TABLE public.plans ALTER COLUMN price_gbp DROP NOT NULL;

INSERT INTO public.plans (plan_id, name, price_gbp, credits_monthly)
VALUES
  ('free', 'Free', 0, 100),
  ('pro', 'Pro', 249, 1000),
  ('growth', 'Growth', 599, 5000),
  ('scale', 'Enterprise', NULL, NULL)
ON CONFLICT (plan_id) DO UPDATE
SET name = EXCLUDED.name,
    price_gbp = EXCLUDED.price_gbp,
    credits_monthly = EXCLUDED.credits_monthly;

CREATE OR REPLACE FUNCTION public.ensure_free_billing_account(
  p_merchant_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_plan_id text;
  v_allowance integer;
  v_period_start timestamptz := date_trunc('month', now() AT TIME ZONE 'UTC');
  v_period_end timestamptz := date_trunc('month', now() AT TIME ZONE 'UTC') + interval '1 month';
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('billing-account:' || p_merchant_id::text));
  SELECT plan_id INTO v_plan_id
  FROM public.merchant_subscriptions
  WHERE merchant_id = p_merchant_id
    AND status IN ('active', 'grace_period', 'past_due', 'free')
  ORDER BY current_period_start DESC
  LIMIT 1;

  IF v_plan_id IS NULL THEN
    INSERT INTO public.merchant_subscriptions (
      merchant_id, plan_id, status, current_period_start, current_period_end,
      context_credits_monthly
    ) VALUES (
      p_merchant_id, 'free', 'free', v_period_start, v_period_end, 100
    );
    v_plan_id := 'free';
  END IF;

  SELECT credits_monthly INTO v_allowance
  FROM public.plans
  WHERE plan_id = v_plan_id;

  INSERT INTO public.merchant_credits (
    merchant_id, monthly_credits_remaining, topup_credits_remaining, cycle_reset_at
  ) VALUES (
    p_merchant_id, COALESCE(v_allowance, 0), 0, v_period_end
  ) ON CONFLICT (merchant_id) DO NOTHING;
END;
$function$;

REVOKE ALL ON FUNCTION public.ensure_free_billing_account(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_free_billing_account(uuid)
  TO service_role;

CREATE TABLE IF NOT EXISTS public.subscription_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  requested_plan_id text NOT NULL REFERENCES public.plans(plan_id),
  requested_by uuid,
  logical_operation_id text NOT NULL,
  source text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  checkout_session_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT subscription_intents_status_check CHECK (
    status IN ('pending', 'checkout_created', 'confirmed', 'cancelled', 'superseded')
  ),
  CONSTRAINT subscription_intents_source_check CHECK (
    source IN ('signup', 'pricing', 'onboarding', 'billing', 'stripe_webhook')
  ),
  CONSTRAINT subscription_intents_operation_check CHECK (length(trim(logical_operation_id)) >= 8)
);

CREATE UNIQUE INDEX IF NOT EXISTS subscription_intents_merchant_operation_idx
  ON public.subscription_intents(merchant_id, logical_operation_id);
CREATE UNIQUE INDEX IF NOT EXISTS subscription_intents_one_open_per_merchant_idx
  ON public.subscription_intents(merchant_id)
  WHERE status IN ('pending', 'checkout_created');
CREATE INDEX IF NOT EXISTS subscription_intents_merchant_created_idx
  ON public.subscription_intents(merchant_id, created_at DESC);

ALTER TABLE public.subscription_intents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS subscription_intents_select_own ON public.subscription_intents;
CREATE POLICY subscription_intents_select_own
  ON public.subscription_intents FOR SELECT TO authenticated
  USING (public.is_merchant_member(merchant_id));
REVOKE ALL ON public.subscription_intents FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.subscription_intents FROM authenticated;
GRANT SELECT ON public.subscription_intents TO authenticated;
GRANT ALL ON public.subscription_intents TO service_role;

CREATE OR REPLACE FUNCTION public.upsert_subscription_intent(
  p_merchant_id uuid,
  p_requested_plan_id text,
  p_requested_by uuid,
  p_logical_operation_id text,
  p_source text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_intent public.subscription_intents%rowtype;
BEGIN
  IF length(trim(COALESCE(p_logical_operation_id, ''))) < 8 THEN
    RAISE EXCEPTION 'logical operation id is required';
  END IF;
  IF p_requested_plan_id NOT IN ('free', 'pro', 'growth', 'scale') THEN
    RAISE EXCEPTION 'unsupported plan id';
  END IF;
  IF p_source NOT IN ('signup', 'pricing', 'onboarding', 'billing', 'stripe_webhook') THEN
    RAISE EXCEPTION 'unsupported subscription intent source';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('subscription-intent:' || p_merchant_id::text));
  SELECT * INTO v_intent
  FROM public.subscription_intents
  WHERE merchant_id = p_merchant_id
    AND logical_operation_id = p_logical_operation_id
  LIMIT 1;

  IF v_intent.id IS NOT NULL THEN
    IF v_intent.requested_plan_id <> p_requested_plan_id THEN
      RAISE EXCEPTION 'logical operation id conflicts with an existing subscription intent';
    END IF;
    RETURN jsonb_build_object(
      'id', v_intent.id,
      'requested_plan_id', v_intent.requested_plan_id,
      'status', v_intent.status,
      'duplicate', true
    );
  END IF;

  UPDATE public.subscription_intents
  SET status = 'superseded', updated_at = now()
  WHERE merchant_id = p_merchant_id
    AND status IN ('pending', 'checkout_created');

  INSERT INTO public.subscription_intents (
    merchant_id, requested_plan_id, requested_by,
    logical_operation_id, source, status
  ) VALUES (
    p_merchant_id, p_requested_plan_id, p_requested_by,
    p_logical_operation_id, p_source,
    CASE WHEN p_requested_plan_id = 'free' THEN 'confirmed' ELSE 'pending' END
  ) RETURNING * INTO v_intent;

  RETURN jsonb_build_object(
    'id', v_intent.id,
    'requested_plan_id', v_intent.requested_plan_id,
    'status', v_intent.status,
    'duplicate', false
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.mark_subscription_intent_status(
  p_merchant_id uuid,
  p_requested_plan_id text,
  p_status text,
  p_checkout_session_id text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF p_status NOT IN ('pending', 'checkout_created', 'confirmed', 'cancelled', 'superseded') THEN
    RAISE EXCEPTION 'unsupported subscription intent status';
  END IF;
  UPDATE public.subscription_intents
  SET status = p_status,
      checkout_session_id = COALESCE(p_checkout_session_id, checkout_session_id),
      updated_at = now()
  WHERE id = (
    SELECT id FROM public.subscription_intents
    WHERE merchant_id = p_merchant_id
      AND requested_plan_id = p_requested_plan_id
      AND status IN ('pending', 'checkout_created')
    ORDER BY created_at DESC
    LIMIT 1
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.mark_subscription_intent_status_by_id(
  p_merchant_id uuid,
  p_intent_id uuid,
  p_status text,
  p_checkout_session_id text DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_changed integer;
BEGIN
  IF p_status NOT IN ('pending', 'checkout_created', 'confirmed', 'cancelled', 'superseded') THEN
    RAISE EXCEPTION 'unsupported subscription intent status';
  END IF;
  UPDATE public.subscription_intents
  SET status = p_status,
      checkout_session_id = COALESCE(p_checkout_session_id, checkout_session_id),
      updated_at = now()
  WHERE id = p_intent_id
    AND merchant_id = p_merchant_id
    AND status IN ('pending', 'checkout_created')
    AND (
      p_checkout_session_id IS NULL
      OR checkout_session_id IS NULL
      OR checkout_session_id = p_checkout_session_id
    );
  GET DIAGNOSTICS v_changed = ROW_COUNT;
  RETURN v_changed = 1;
END;
$function$;

REVOKE ALL ON FUNCTION public.upsert_subscription_intent(uuid, text, uuid, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_subscription_intent(uuid, text, uuid, text, text)
  TO service_role;
REVOKE ALL ON FUNCTION public.mark_subscription_intent_status(uuid, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_subscription_intent_status(uuid, text, text, text)
  TO service_role;
REVOKE ALL ON FUNCTION public.mark_subscription_intent_status_by_id(uuid, uuid, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_subscription_intent_status_by_id(uuid, uuid, text, text)
  TO service_role;

ALTER TABLE public.context_credit_events
  ADD COLUMN IF NOT EXISTS billable_event text,
  ADD COLUMN IF NOT EXISTS logical_operation_id text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'succeeded',
  ADD COLUMN IF NOT EXISTS source_object_type text,
  ADD COLUMN IF NOT EXISTS source_object_id text,
  ADD COLUMN IF NOT EXISTS monthly_credits_spent integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS topup_credits_spent integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refunded_credits integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reversed_at timestamptz;

ALTER TABLE public.context_credit_events
  DROP CONSTRAINT IF EXISTS context_credit_events_billable_event_check,
  ADD CONSTRAINT context_credit_events_billable_event_check CHECK (
    billable_event IS NULL OR billable_event IN (
      'context.basic', 'context.full', 'evidence.summary', 'api.enrichment'
    )
  ),
  DROP CONSTRAINT IF EXISTS context_credit_events_receipt_status_check,
  ADD CONSTRAINT context_credit_events_receipt_status_check CHECK (status IN ('succeeded', 'reversed')),
  DROP CONSTRAINT IF EXISTS context_credit_events_refund_check,
  ADD CONSTRAINT context_credit_events_refund_check CHECK (
    refunded_credits >= 0 AND refunded_credits <= credits_spent
  ),
  DROP CONSTRAINT IF EXISTS context_credit_events_spend_breakdown_check,
  ADD CONSTRAINT context_credit_events_spend_breakdown_check CHECK (
    monthly_credits_spent >= 0
    AND topup_credits_spent >= 0
    AND (
      billable_event IS NULL
      OR monthly_credits_spent + topup_credits_spent = credits_spent
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS context_credit_events_merchant_operation_idx
  ON public.context_credit_events(merchant_id, logical_operation_id)
  WHERE logical_operation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS context_credit_events_billable_event_idx
  ON public.context_credit_events(merchant_id, billable_event, occurred_at DESC)
  WHERE billable_event IS NOT NULL;

DROP FUNCTION IF EXISTS public.consume_context_credits_if_available(
  uuid, uuid, text, text, integer, timestamptz, timestamptz, integer,
  uuid, text, text, text, text, jsonb, boolean
);

CREATE OR REPLACE FUNCTION public.consume_context_credits_if_available(
  p_merchant_id uuid,
  p_user_id uuid,
  p_plan_tier text,
  p_context_type text,
  p_credits_to_spend integer,
  p_period_start timestamptz,
  p_period_end timestamptz,
  p_monthly_allowance integer,
  p_claim_id uuid DEFAULT NULL,
  p_ticket_ref text DEFAULT NULL,
  p_order_ref text DEFAULT NULL,
  p_customer_ref text DEFAULT NULL,
  p_reason text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_allow_soft_cap boolean DEFAULT false,
  p_billable_event text DEFAULT NULL,
  p_logical_operation_id text DEFAULT NULL,
  p_source_object_type text DEFAULT NULL,
  p_source_object_id text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_monthly integer;
  v_topup integer;
  v_total integer;
  v_soft_cap boolean;
  v_deduct jsonb;
  v_used integer;
  v_allowance integer;
  v_receipt_id uuid;
  v_existing public.context_credit_events%rowtype;
  v_from_monthly integer := 0;
  v_from_topup integer := 0;
BEGIN
  IF p_credits_to_spend < 0 THEN
    RAISE EXCEPTION 'p_credits_to_spend must be non-negative';
  END IF;
  IF p_billable_event IS NULL OR p_logical_operation_id IS NULL
    OR length(trim(p_logical_operation_id)) < 8 THEN
    RAISE EXCEPTION 'billable event and logical operation id are required';
  END IF;
  IF p_monthly_allowance IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false, 'error_code', 'allowance_required', 'used', 0,
      'remaining', 0, 'credits_required', p_credits_to_spend
    );
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('mc:' || p_merchant_id::text));

  SELECT * INTO v_existing
  FROM public.context_credit_events
  WHERE merchant_id = p_merchant_id
    AND logical_operation_id = p_logical_operation_id
  LIMIT 1;

  SELECT monthly_credits_remaining, topup_credits_remaining
    INTO v_monthly, v_topup
  FROM public.merchant_credits
  WHERE merchant_id = p_merchant_id
  FOR UPDATE;

  IF v_existing.id IS NOT NULL THEN
    IF v_existing.billable_event <> p_billable_event
      OR v_existing.credits_spent <> p_credits_to_spend THEN
      RAISE EXCEPTION 'logical operation id conflicts with an existing receipt';
    END IF;
    RETURN jsonb_build_object(
      'ok', true,
      'duplicate', true,
      'receipt_id', v_existing.id,
      'used', GREATEST(p_monthly_allowance - COALESCE(v_monthly, p_monthly_allowance), 0),
      'remaining', COALESCE(v_monthly, p_monthly_allowance) + COALESCE(v_topup, 0),
      'monthly_remaining', COALESCE(v_monthly, p_monthly_allowance),
      'topup_remaining', COALESCE(v_topup, 0),
      'credits_spent', 0
    );
  END IF;

  IF v_monthly IS NULL THEN
    INSERT INTO public.merchant_credits (
      merchant_id, monthly_credits_remaining, topup_credits_remaining, cycle_reset_at
    ) VALUES (p_merchant_id, p_monthly_allowance, 0, p_period_end)
    RETURNING monthly_credits_remaining, topup_credits_remaining INTO v_monthly, v_topup;
  END IF;

  v_total := v_monthly + v_topup;
  v_allowance := p_monthly_allowance;
  v_soft_cap := COALESCE(p_allow_soft_cap, false)
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
    v_deduct := public.deduct_merchant_credits(p_merchant_id, p_credits_to_spend);
    IF NOT (v_deduct->>'ok')::boolean THEN
      RETURN jsonb_build_object(
        'ok', false, 'used', v_allowance - v_monthly,
        'remaining', v_total, 'credits_required', p_credits_to_spend
      );
    END IF;
    v_from_monthly := COALESCE((v_deduct->>'from_monthly')::integer, 0);
    v_from_topup := COALESCE((v_deduct->>'from_topup')::integer, 0);
    v_monthly := (v_deduct->>'monthly_remaining')::integer;
    v_topup := (v_deduct->>'topup_remaining')::integer;
  END IF;

  INSERT INTO public.context_credit_events (
    merchant_id, user_id, plan_tier, context_type, credits_spent,
    claim_id, ticket_ref, order_ref, customer_ref, reason, metadata,
    billable_event, logical_operation_id, status,
    source_object_type, source_object_id,
    monthly_credits_spent, topup_credits_spent
  ) VALUES (
    p_merchant_id, p_user_id, p_plan_tier, p_context_type,
    CASE WHEN v_soft_cap THEN 0 ELSE p_credits_to_spend END,
    p_claim_id, p_ticket_ref, p_order_ref, p_customer_ref, p_reason,
    CASE WHEN v_soft_cap
      THEN COALESCE(p_metadata, '{}'::jsonb) || jsonb_build_object('soft_cap_exhausted', true)
      ELSE COALESCE(p_metadata, '{}'::jsonb)
    END,
    p_billable_event, p_logical_operation_id, 'succeeded',
    p_source_object_type, p_source_object_id,
    v_from_monthly, v_from_topup
  ) RETURNING id INTO v_receipt_id;

  v_used := v_allowance - v_monthly;
  RETURN jsonb_build_object(
    'ok', true, 'duplicate', false, 'receipt_id', v_receipt_id,
    'used', GREATEST(v_used, 0), 'remaining', v_monthly + v_topup,
    'monthly_remaining', v_monthly, 'topup_remaining', v_topup,
    'credits_spent', CASE WHEN v_soft_cap THEN 0 ELSE p_credits_to_spend END,
    'soft_cap', v_soft_cap
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.reverse_context_credit_receipt(
  p_merchant_id uuid,
  p_logical_operation_id text,
  p_reason text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_receipt public.context_credit_events%rowtype;
BEGIN
  IF length(trim(COALESCE(p_reason, ''))) < 3 THEN
    RAISE EXCEPTION 'reversal reason is required';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('mc:' || p_merchant_id::text));
  SELECT * INTO v_receipt
  FROM public.context_credit_events
  WHERE merchant_id = p_merchant_id
    AND logical_operation_id = p_logical_operation_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'receipt_not_found');
  END IF;
  IF v_receipt.status = 'reversed' THEN
    RETURN jsonb_build_object('ok', true, 'duplicate', true, 'receipt_id', v_receipt.id);
  END IF;

  UPDATE public.merchant_credits
  SET monthly_credits_remaining = monthly_credits_remaining + v_receipt.monthly_credits_spent,
      topup_credits_remaining = topup_credits_remaining + v_receipt.topup_credits_spent,
      updated_at = now()
  WHERE merchant_id = p_merchant_id;

  UPDATE public.context_credit_events
  SET status = 'reversed',
      refunded_credits = credits_spent,
      reversed_at = now(),
      metadata = metadata || jsonb_build_object('reversal_reason', p_reason)
  WHERE id = v_receipt.id;

  RETURN jsonb_build_object(
    'ok', true, 'duplicate', false, 'receipt_id', v_receipt.id,
    'credits_refunded', v_receipt.credits_spent
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.consume_context_credits_if_available(
  uuid, uuid, text, text, integer, timestamptz, timestamptz, integer,
  uuid, text, text, text, text, jsonb, boolean, text, text, text, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_context_credits_if_available(
  uuid, uuid, text, text, integer, timestamptz, timestamptz, integer,
  uuid, text, text, text, text, jsonb, boolean, text, text, text, text
) TO service_role;
REVOKE ALL ON FUNCTION public.reverse_context_credit_receipt(uuid, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reverse_context_credit_receipt(uuid, text, text)
  TO service_role;
