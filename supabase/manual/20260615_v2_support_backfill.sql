-- Manual backfill: support webhook secrets + claim intelligence tables
-- Skipped when 20260528160000 / 20260530150000 were marked applied without execution.
-- v2-compatible: FKs reference merchants(id) only (no customer_profiles).

BEGIN;

-- ---------------------------------------------------------------------------
-- 20260528160000_support_provider_webhook_secrets
-- ---------------------------------------------------------------------------
ALTER TABLE public.support_provider_connections
  ADD COLUMN IF NOT EXISTS webhook_secret_hash text,
  ADD COLUMN IF NOT EXISTS webhook_secret_created_at timestamptz,
  ADD COLUMN IF NOT EXISTS webhook_secret_rotated_at timestamptz;

COMMENT ON COLUMN public.support_provider_connections.webhook_secret_hash IS
  'HMAC-SHA256 digest of the Gorgias webhook secret (peppered via INTERNAL_HMAC_SECRET). Plaintext shown once at connection creation.';

-- ---------------------------------------------------------------------------
-- 20260530150000_support_signals_and_claim_intelligence (tables 3, 4, 6)
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

ALTER TABLE public.customer_identity_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_claim_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_role_only_customer_identity_signals_all ON public.customer_identity_signals;
CREATE POLICY service_role_only_customer_identity_signals_all
  ON public.customer_identity_signals FOR ALL TO public
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS service_role_only_customer_claim_summary_all ON public.customer_claim_summary;
CREATE POLICY service_role_only_customer_claim_summary_all
  ON public.customer_claim_summary FOR ALL TO public
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS service_role_only_webhook_logs_all ON public.webhook_logs;
CREATE POLICY service_role_only_webhook_logs_all
  ON public.webhook_logs FOR ALL TO public
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

REVOKE ALL ON public.customer_identity_signals FROM authenticated;
REVOKE ALL ON public.customer_identity_signals FROM anon;
REVOKE ALL ON public.customer_claim_summary FROM authenticated;
REVOKE ALL ON public.customer_claim_summary FROM anon;
REVOKE ALL ON public.webhook_logs FROM authenticated;
REVOKE ALL ON public.webhook_logs FROM anon;

GRANT ALL ON public.customer_identity_signals TO service_role;
GRANT ALL ON public.customer_claim_summary TO service_role;
GRANT ALL ON public.webhook_logs TO service_role;

COMMIT;
