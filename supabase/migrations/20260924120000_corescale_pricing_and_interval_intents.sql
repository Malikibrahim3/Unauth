-- Core / Scale / Enterprise public offer and requested payment frequency.
-- Existing plan IDs, subscriptions, allowances, and completed intents are retained.

ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS annual_price_gbp numeric(10, 2);

INSERT INTO public.plans (plan_id, name, price_gbp, annual_price_gbp, credits_monthly)
VALUES
  ('core', 'Core', 499, 4990, NULL),
  ('scale_2026', 'Scale', 999, 9990, NULL),
  ('enterprise_2026', 'Enterprise', NULL, NULL, NULL)
ON CONFLICT (plan_id) DO UPDATE
SET name = EXCLUDED.name,
    price_gbp = EXCLUDED.price_gbp,
    annual_price_gbp = EXCLUDED.annual_price_gbp,
    credits_monthly = EXCLUDED.credits_monthly;

ALTER TABLE public.subscription_intents
  ADD COLUMN IF NOT EXISTS billing_interval text NOT NULL DEFAULT 'monthly';

ALTER TABLE public.subscription_intents
  DROP CONSTRAINT IF EXISTS subscription_intents_billing_interval_check;
ALTER TABLE public.subscription_intents
  ADD CONSTRAINT subscription_intents_billing_interval_check
  CHECK (billing_interval IN ('monthly', 'annual'));

CREATE OR REPLACE FUNCTION public.upsert_subscription_intent(
  p_merchant_id uuid,
  p_requested_plan_id text,
  p_requested_by uuid,
  p_logical_operation_id text,
  p_source text,
  p_billing_interval text
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
  IF p_requested_plan_id IS NULL OR p_requested_plan_id NOT IN (
    'free', 'pro', 'growth', 'scale', 'core', 'scale_2026', 'enterprise_2026'
  ) THEN
    RAISE EXCEPTION 'unsupported plan id';
  END IF;
  IF p_source NOT IN ('signup', 'pricing', 'onboarding', 'billing', 'stripe_webhook') THEN
    RAISE EXCEPTION 'unsupported subscription intent source';
  END IF;
  IF p_billing_interval IS NULL OR p_billing_interval NOT IN ('monthly', 'annual') THEN
    RAISE EXCEPTION 'unsupported billing interval';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('subscription-intent:' || p_merchant_id::text));
  SELECT * INTO v_intent
  FROM public.subscription_intents
  WHERE merchant_id = p_merchant_id
    AND logical_operation_id = p_logical_operation_id
  LIMIT 1;

  IF v_intent.id IS NOT NULL THEN
    IF v_intent.requested_plan_id <> p_requested_plan_id
      OR v_intent.billing_interval <> p_billing_interval THEN
      RAISE EXCEPTION 'logical operation id conflicts with an existing subscription intent';
    END IF;
    RETURN jsonb_build_object(
      'id', v_intent.id,
      'requested_plan_id', v_intent.requested_plan_id,
      'billing_interval', v_intent.billing_interval,
      'status', v_intent.status,
      'duplicate', true
    );
  END IF;

  UPDATE public.subscription_intents
  SET status = 'superseded', updated_at = now()
  WHERE merchant_id = p_merchant_id
    AND status IN ('pending', 'checkout_created');

  INSERT INTO public.subscription_intents (
    merchant_id, requested_plan_id, billing_interval, requested_by,
    logical_operation_id, source, status
  ) VALUES (
    p_merchant_id, p_requested_plan_id, p_billing_interval, p_requested_by,
    p_logical_operation_id, p_source,
    CASE WHEN p_requested_plan_id = 'free' THEN 'confirmed' ELSE 'pending' END
  ) RETURNING * INTO v_intent;

  RETURN jsonb_build_object(
    'id', v_intent.id,
    'requested_plan_id', v_intent.requested_plan_id,
    'billing_interval', v_intent.billing_interval,
    'status', v_intent.status,
    'duplicate', false
  );
END;
$function$;

-- Keep old clients functional while they roll forward; their requests default
-- to monthly because they do not send a payment interval.
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
BEGIN
  RETURN public.upsert_subscription_intent(
    p_merchant_id,
    p_requested_plan_id,
    p_requested_by,
    p_logical_operation_id,
    p_source,
    'monthly'
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.upsert_subscription_intent(uuid, text, uuid, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_subscription_intent(uuid, text, uuid, text, text, text)
  TO service_role;
REVOKE ALL ON FUNCTION public.upsert_subscription_intent(uuid, text, uuid, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_subscription_intent(uuid, text, uuid, text, text)
  TO service_role;
