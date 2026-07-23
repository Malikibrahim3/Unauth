-- Helpdesk signal capture + claim intelligence (provider-agnostic).
--
-- Extends the existing provider-agnostic support intake (support_case_intake)
-- with richer fraud-relevant signals, and adds sibling tables for order context,
-- customer identity signals, a per-merchant claim summary rollup, cross-merchant
-- identity link candidates, and webhook delivery logs.
--
-- PII policy: matchable identifiers (email, phone, ip, address) are stored as
-- HMAC hashes only. No raw email / body / IP / payload is persisted. This mirrors
-- the existing support_case_intake design (see 20260528140000).

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. New signal columns on support_case_intake (the "ticket + claim" row)
-- ---------------------------------------------------------------------------
ALTER TABLE public.support_case_intake
  ADD COLUMN IF NOT EXISTS channel                            text,
  ADD COLUMN IF NOT EXISTS message_count                      int,
  ADD COLUMN IF NOT EXISTS customer_reply_count               int,
  ADD COLUMN IF NOT EXISTS was_reopened                       boolean,
  ADD COLUMN IF NOT EXISTS macros_used                        jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS sentiment_score                    numeric,
  ADD COLUMN IF NOT EXISTS chargeback_threatened              boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_claim                           boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS claim_type                         text,
  ADD COLUMN IF NOT EXISTS claim_type_confidence              numeric,
  ADD COLUMN IF NOT EXISTS provided_evidence                  boolean,
  ADD COLUMN IF NOT EXISTS accepted_first_resolution          boolean,
  ADD COLUMN IF NOT EXISTS resolution_type                    text,
  ADD COLUMN IF NOT EXISTS escalation_count                   int,
  ADD COLUMN IF NOT EXISTS time_to_first_claim_message_seconds int;

ALTER TABLE public.support_case_intake
  DROP CONSTRAINT IF EXISTS support_case_intake_claim_type_check;
ALTER TABLE public.support_case_intake
  ADD CONSTRAINT support_case_intake_claim_type_check
  CHECK (claim_type IS NULL OR claim_type IN ('INR', 'damaged', 'wrong_item', 'not_as_described', 'other'));

ALTER TABLE public.support_case_intake
  DROP CONSTRAINT IF EXISTS support_case_intake_claim_type_confidence_check;
ALTER TABLE public.support_case_intake
  ADD CONSTRAINT support_case_intake_claim_type_confidence_check
  CHECK (claim_type_confidence IS NULL OR (claim_type_confidence >= 0 AND claim_type_confidence <= 1));

CREATE INDEX IF NOT EXISTS support_case_intake_merchant_is_claim_idx
  ON public.support_case_intake (merchant_id, is_claim);

CREATE INDEX IF NOT EXISTS support_case_intake_merchant_claim_type_idx
  ON public.support_case_intake (merchant_id, claim_type);

-- ---------------------------------------------------------------------------
-- 2. order_claim_context — Shopify order state captured at claim time
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_claim_context (
  id                            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  support_case_id               uuid NOT NULL REFERENCES public.support_case_intake(id) ON DELETE CASCADE,
  merchant_id                   uuid NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  order_ref                     text,
  order_value                   numeric,
  order_created_at              timestamptz,
  fulfillment_status_at_claim   text,
  delivery_status_at_claim      text,
  shipping_carrier              text,
  tracking_number               text,
  days_since_order_at_claim     int,
  days_since_delivery_at_claim  int,
  payment_method                text,
  discount_code_used            boolean,
  discount_amount               numeric,
  is_first_order                boolean,
  shipping_equals_billing       boolean,
  was_refunded_previously       boolean,
  refund_amount_requested       numeric,
  refund_amount_approved        numeric,
  partial_refund                boolean,
  created_at                    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT order_claim_context_support_case_unique UNIQUE (support_case_id)
);

CREATE INDEX IF NOT EXISTS order_claim_context_merchant_idx
  ON public.order_claim_context (merchant_id);
CREATE INDEX IF NOT EXISTS order_claim_context_merchant_order_ref_idx
  ON public.order_claim_context (merchant_id, order_ref);

-- ---------------------------------------------------------------------------
-- 3. customer_identity_signals — hashed identity attributes per merchant
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customer_identity_signals (
  id                                            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_email_hash                           text NOT NULL,
  merchant_id                                   uuid NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  phone_hash                                    text,
  shipping_address_hash                         text,
  billing_address_hash                          text,
  ip_hash                                       text,
  device_fingerprint                            text,
  customer_account_type                         text,
  account_created_at                            timestamptz,
  days_between_account_creation_and_first_claim int,
  first_seen_at                                 timestamptz,
  last_seen_at                                  timestamptz,
  created_at                                    timestamptz NOT NULL DEFAULT now(),
  updated_at                                    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_identity_signals_account_type_check
    CHECK (customer_account_type IS NULL OR customer_account_type IN ('guest', 'registered')),
  CONSTRAINT customer_identity_signals_merchant_email_unique
    UNIQUE (merchant_id, customer_email_hash)
);

CREATE INDEX IF NOT EXISTS customer_identity_signals_email_hash_idx
  ON public.customer_identity_signals (customer_email_hash);
CREATE INDEX IF NOT EXISTS customer_identity_signals_phone_hash_idx
  ON public.customer_identity_signals (phone_hash);
CREATE INDEX IF NOT EXISTS customer_identity_signals_shipping_hash_idx
  ON public.customer_identity_signals (shipping_address_hash);
CREATE INDEX IF NOT EXISTS customer_identity_signals_device_idx
  ON public.customer_identity_signals (device_fingerprint);

-- ---------------------------------------------------------------------------
-- 4. customer_claim_summary — per (merchant, customer) rollup
--    Network/cross-merchant totals are aggregated across rows sharing the
--    same customer_email_hash at query time.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customer_claim_summary (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_email_hash text NOT NULL,
  merchant_id         uuid NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  total_orders        int NOT NULL DEFAULT 0,
  total_claims        int NOT NULL DEFAULT 0,
  claim_rate          numeric NOT NULL DEFAULT 0,
  primary_reason      text,
  last_claim_at       timestamptz,
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_claim_summary_merchant_email_unique
    UNIQUE (merchant_id, customer_email_hash)
);

CREATE INDEX IF NOT EXISTS customer_claim_summary_email_hash_idx
  ON public.customer_claim_summary (customer_email_hash);

-- ---------------------------------------------------------------------------
-- 5. identity_link_candidates — cross-merchant identity matches (exact-hash)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.identity_link_candidates (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_customer_email_hash text NOT NULL,
  linked_customer_email_hash  text NOT NULL,
  merchant_id_a               uuid NOT NULL,
  merchant_id_b               uuid NOT NULL,
  link_type                   text NOT NULL,
  link_confidence             numeric NOT NULL,
  detected_at                 timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT identity_link_candidates_link_type_check
    CHECK (link_type IN ('email_match', 'phone_match', 'address_match', 'device_match', 'name_fuzzy_match')),
  CONSTRAINT identity_link_candidates_confidence_check
    CHECK (link_confidence >= 0 AND link_confidence <= 1),
  CONSTRAINT identity_link_candidates_unique
    UNIQUE (primary_customer_email_hash, linked_customer_email_hash, merchant_id_a, merchant_id_b, link_type)
);

CREATE INDEX IF NOT EXISTS identity_link_candidates_primary_idx
  ON public.identity_link_candidates (primary_customer_email_hash);
CREATE INDEX IF NOT EXISTS identity_link_candidates_linked_idx
  ON public.identity_link_candidates (linked_customer_email_hash);

-- ---------------------------------------------------------------------------
-- 6. webhook_logs — provider webhook delivery audit
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider         text NOT NULL,
  external_case_id text,
  merchant_id      uuid,
  status           text NOT NULL,
  http_status      int,
  is_claim         boolean,
  claim_type       text,
  error            text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT webhook_logs_status_check
    CHECK (status IN ('success', 'validation_error', 'error'))
);

CREATE INDEX IF NOT EXISTS webhook_logs_provider_created_idx
  ON public.webhook_logs (provider, created_at DESC);
CREATE INDEX IF NOT EXISTS webhook_logs_status_created_idx
  ON public.webhook_logs (status, created_at DESC);

-- ---------------------------------------------------------------------------
-- RLS: service-role only (mirrors support_case_intake)
-- ---------------------------------------------------------------------------
ALTER TABLE public.order_claim_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_identity_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_claim_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.identity_link_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_only_order_claim_context_all" ON public.order_claim_context;
CREATE POLICY "service_role_only_order_claim_context_all"
  ON public.order_claim_context FOR ALL TO public
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "service_role_only_customer_identity_signals_all" ON public.customer_identity_signals;
CREATE POLICY "service_role_only_customer_identity_signals_all"
  ON public.customer_identity_signals FOR ALL TO public
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "service_role_only_customer_claim_summary_all" ON public.customer_claim_summary;
CREATE POLICY "service_role_only_customer_claim_summary_all"
  ON public.customer_claim_summary FOR ALL TO public
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "service_role_only_identity_link_candidates_all" ON public.identity_link_candidates;
CREATE POLICY "service_role_only_identity_link_candidates_all"
  ON public.identity_link_candidates FOR ALL TO public
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "service_role_only_webhook_logs_all" ON public.webhook_logs;
CREATE POLICY "service_role_only_webhook_logs_all"
  ON public.webhook_logs FOR ALL TO public
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

REVOKE ALL ON public.order_claim_context FROM authenticated;
REVOKE ALL ON public.order_claim_context FROM anon;
REVOKE ALL ON public.customer_identity_signals FROM authenticated;
REVOKE ALL ON public.customer_identity_signals FROM anon;
REVOKE ALL ON public.customer_claim_summary FROM authenticated;
REVOKE ALL ON public.customer_claim_summary FROM anon;
REVOKE ALL ON public.identity_link_candidates FROM authenticated;
REVOKE ALL ON public.identity_link_candidates FROM anon;
REVOKE ALL ON public.webhook_logs FROM authenticated;
REVOKE ALL ON public.webhook_logs FROM anon;

GRANT ALL ON public.order_claim_context TO service_role;
GRANT ALL ON public.customer_identity_signals TO service_role;
GRANT ALL ON public.customer_claim_summary TO service_role;
GRANT ALL ON public.identity_link_candidates TO service_role;
GRANT ALL ON public.webhook_logs TO service_role;

COMMIT;
