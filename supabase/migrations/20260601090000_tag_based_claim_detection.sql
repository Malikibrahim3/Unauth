BEGIN;

CREATE TABLE IF NOT EXISTS public.merchant_claim_tag_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES public.merchants(id) ON DELETE RESTRICT,
  helpdesk_platform text NOT NULL CHECK (helpdesk_platform IN ('gorgias', 'zendesk', 'freshdesk', 'intercom', 'reamaze', 'helpscout')),
  claim_trigger_tags text[] NOT NULL DEFAULT '{}',
  outcome_tags jsonb NOT NULL DEFAULT '{}'::jsonb,
  void_tags text[] NOT NULL DEFAULT '{}',
  keyword_fallback_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT merchant_claim_tag_configs_merchant_platform_unique
    UNIQUE (merchant_id, helpdesk_platform)
);

ALTER TABLE public.merchant_claim_tag_configs
  DROP CONSTRAINT IF EXISTS merchant_claim_tag_configs_merchant_id_fkey;
ALTER TABLE public.merchant_claim_tag_configs
  ADD CONSTRAINT merchant_claim_tag_configs_merchant_id_fkey
  FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE RESTRICT;

ALTER TABLE public.merchant_claim_tag_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_only_merchant_claim_tag_configs_all"
  ON public.merchant_claim_tag_configs;
CREATE POLICY "service_role_only_merchant_claim_tag_configs_all"
  ON public.merchant_claim_tag_configs
  FOR ALL
  TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "merchant_claim_tag_configs_select_own"
  ON public.merchant_claim_tag_configs;
CREATE POLICY "merchant_claim_tag_configs_select_own"
  ON public.merchant_claim_tag_configs
  FOR SELECT
  TO authenticated
  USING (
    merchant_id IN (SELECT id FROM public.merchants WHERE user_id = auth.uid())
    OR merchant_id IN (
      SELECT merchant_id FROM public.merchant_members
      WHERE user_id = auth.uid() AND invite_status = 'active'
    )
  );

DROP POLICY IF EXISTS "merchant_claim_tag_configs_write_own"
  ON public.merchant_claim_tag_configs;
CREATE POLICY "merchant_claim_tag_configs_write_own"
  ON public.merchant_claim_tag_configs
  FOR ALL
  TO authenticated
  USING (
    merchant_id IN (SELECT id FROM public.merchants WHERE user_id = auth.uid())
    OR merchant_id IN (
      SELECT merchant_id FROM public.merchant_members
      WHERE user_id = auth.uid() AND invite_status = 'active'
    )
  )
  WITH CHECK (
    merchant_id IN (SELECT id FROM public.merchants WHERE user_id = auth.uid())
    OR merchant_id IN (
      SELECT merchant_id FROM public.merchant_members
      WHERE user_id = auth.uid() AND invite_status = 'active'
    )
  );

CREATE INDEX IF NOT EXISTS merchant_claim_tag_configs_merchant_idx
  ON public.merchant_claim_tag_configs (merchant_id);

ALTER TABLE public.support_case_intake
  ADD COLUMN IF NOT EXISTS detection_method text NOT NULL DEFAULT 'keyword_fallback',
  ADD COLUMN IF NOT EXISTS trigger_tag text,
  ADD COLUMN IF NOT EXISTS trigger_tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS requires_merchant_review boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS keyword_matched text;

ALTER TABLE public.support_case_intake
  DROP CONSTRAINT IF EXISTS support_case_intake_detection_method_check;
ALTER TABLE public.support_case_intake
  ADD CONSTRAINT support_case_intake_detection_method_check
  CHECK (detection_method IN ('tag', 'keyword_fallback', 'manual', 'shopify_dispute'));

ALTER TABLE public.merchant_claims
  ADD COLUMN IF NOT EXISTS detection_method text NOT NULL DEFAULT 'keyword_fallback',
  ADD COLUMN IF NOT EXISTS trigger_tag text,
  ADD COLUMN IF NOT EXISTS trigger_tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS requires_merchant_review boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS merchant_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS refund_type text;

ALTER TABLE public.merchant_claims
  DROP CONSTRAINT IF EXISTS merchant_claims_detection_method_check;
UPDATE public.merchant_claims
SET detection_method = 'keyword_fallback'
WHERE detection_method IS NULL OR detection_method = 'keyword';
ALTER TABLE public.merchant_claims
  ADD CONSTRAINT merchant_claims_detection_method_check
  CHECK (detection_method IN ('tag', 'keyword_fallback', 'manual', 'shopify_dispute'));

ALTER TABLE public.merchant_claims
  DROP CONSTRAINT IF EXISTS merchant_claims_refund_type_check;
ALTER TABLE public.merchant_claims
  ADD CONSTRAINT merchant_claims_refund_type_check
  CHECK (refund_type IS NULL OR refund_type IN ('full', 'partial', 'unknown'));

ALTER TABLE public.shopify_refund_events
  ADD COLUMN IF NOT EXISTS refund_type text;

ALTER TABLE public.shopify_refund_events
  DROP CONSTRAINT IF EXISTS shopify_refund_events_refund_type_check;
ALTER TABLE public.shopify_refund_events
  ADD CONSTRAINT shopify_refund_events_refund_type_check
  CHECK (refund_type IS NULL OR refund_type IN ('full', 'partial', 'unknown'));

ALTER TABLE public.merchant_claims
  ALTER COLUMN merchant_id SET NOT NULL;

ALTER TABLE public.merchant_claims
  DROP CONSTRAINT IF EXISTS merchant_claims_order_identity_required;
ALTER TABLE public.merchant_claims
  ADD CONSTRAINT merchant_claims_order_identity_required
  CHECK (
    shopify_order_id IS NOT NULL
    OR order_ref IS NOT NULL
    OR audit_transaction_id IS NOT NULL
  );

DO $$
BEGIN
  ALTER TABLE public.merchant_claims
    ADD CONSTRAINT merchant_claims_unique_merchant_shopify_order
    UNIQUE (merchant_id, shopify_order_id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.merchant_claims
    ADD CONSTRAINT merchant_claims_unique_merchant_order_ref
    UNIQUE (merchant_id, order_ref);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.merchant_claims
    ADD CONSTRAINT merchant_claims_unique_merchant_audit_transaction
    UNIQUE (merchant_id, audit_transaction_id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.merchant_claims
  DROP CONSTRAINT IF EXISTS merchant_claims_status_check;
UPDATE public.merchant_claims
SET status = CASE
  WHEN status IN ('under_review', 'evidence_requested', 'unresolved_unreviewed') THEN 'open'
  WHEN status IN ('resolved', 'closed') THEN 'resolved_refunded'
  ELSE status
END;
ALTER TABLE public.merchant_claims
  ADD CONSTRAINT merchant_claims_status_check
  CHECK (status IN (
    'pending',
    'open',
    'escalated',
    'resolved_refunded',
    'resolved_won',
    'resolved_lost',
    'resolved_denied',
    'resolved_exchanged',
    'voided',
    'stale'
  ));

CREATE INDEX IF NOT EXISTS idx_merchant_claims_merchant_status
  ON public.merchant_claims (merchant_id, status);

CREATE INDEX IF NOT EXISTS idx_processed_webhooks_processed_at
  ON public.processed_webhooks (processed_at);

ALTER TABLE public.merchant_shopify_connections
  DROP CONSTRAINT IF EXISTS merchant_shopify_connections_pkey;
ALTER TABLE public.merchant_shopify_connections
  DROP CONSTRAINT IF EXISTS merchant_shopify_connections_merchant_id_fkey;
ALTER TABLE public.merchant_shopify_connections
  ADD CONSTRAINT merchant_shopify_connections_merchant_id_fkey
  FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE RESTRICT;
ALTER TABLE public.merchant_shopify_connections
  DROP CONSTRAINT IF EXISTS merchant_shopify_connections_shop_domain_fkey;
ALTER TABLE public.merchant_shopify_connections
  ADD CONSTRAINT merchant_shopify_connections_shop_domain_fkey
  FOREIGN KEY (shop_domain) REFERENCES public.shopify_merchants(shop_domain) ON DELETE RESTRICT;
ALTER TABLE public.merchant_shopify_connections
  ADD CONSTRAINT merchant_shopify_connections_pkey
  PRIMARY KEY (merchant_id, shop_domain);

ALTER TABLE public.claim_events
  ADD COLUMN IF NOT EXISTS from_state text,
  ADD COLUMN IF NOT EXISTS to_state text,
  ADD COLUMN IF NOT EXISTS triggered_by text,
  ADD COLUMN IF NOT EXISTS triggered_at timestamptz NOT NULL DEFAULT now();

UPDATE public.claim_events
SET
  from_state = COALESCE(from_state, previous_status),
  to_state = COALESCE(to_state, new_status),
  triggered_by = COALESCE(triggered_by, event_type),
  triggered_at = COALESCE(triggered_at, created_at);

COMMIT;
