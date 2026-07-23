BEGIN;

CREATE TABLE IF NOT EXISTS public.checkout_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  visitor_id text NOT NULL,
  session_id text NOT NULL,
  device_fp text,
  email_hash text,
  ip_hash text,
  account_type text CHECK (account_type IN ('guest', 'registered', 'unknown')),
  platform text NOT NULL CHECK (platform IN ('shopify', 'woocommerce', 'bigcommerce')),
  page text,
  referrer text,
  checkout_reached boolean NOT NULL DEFAULT false,
  cart_count integer,
  event_type text NOT NULL CHECK (event_type IN ('pageview', 'checkout', 'email_capture')),
  raw_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS checkout_signals_merchant_visitor_idx
  ON public.checkout_signals (merchant_id, visitor_id);
CREATE INDEX IF NOT EXISTS checkout_signals_device_fp_idx
  ON public.checkout_signals (device_fp)
  WHERE device_fp IS NOT NULL;
CREATE INDEX IF NOT EXISTS checkout_signals_email_hash_idx
  ON public.checkout_signals (email_hash)
  WHERE email_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS checkout_signals_visitor_session_idx
  ON public.checkout_signals (visitor_id, session_id);
CREATE INDEX IF NOT EXISTS checkout_signals_created_at_idx
  ON public.checkout_signals (created_at);
CREATE INDEX IF NOT EXISTS checkout_signals_merchant_created_at_idx
  ON public.checkout_signals (merchant_id, created_at DESC);

ALTER TABLE public.checkout_signals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS merchants_read_own_signals ON public.checkout_signals;
CREATE POLICY merchants_read_own_signals
  ON public.checkout_signals
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.merchant_users mu
      WHERE mu.merchant_id = checkout_signals.merchant_id
        AND mu.user_id = auth.uid()
        AND mu.invite_status = 'active'
    )
  );

REVOKE ALL ON public.checkout_signals FROM anon;
GRANT SELECT ON public.checkout_signals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checkout_signals TO service_role;

ALTER TABLE IF EXISTS public.merchants
  ADD COLUMN IF NOT EXISTS bigcommerce_script_uuid text,
  ADD COLUMN IF NOT EXISTS shopify_collector_script_tag_id text,
  ADD COLUMN IF NOT EXISTS shopify_collector_init_script_tag_id text;

ALTER TABLE IF EXISTS public.store_connections
  ADD COLUMN IF NOT EXISTS collector_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE IF EXISTS public.identity_identifiers
  DROP CONSTRAINT IF EXISTS identity_identifiers_type_check,
  ADD CONSTRAINT identity_identifiers_type_check
    CHECK (identifier_type IN (
      'normalized_email_hash',
      'phone_e164_hash',
      'full_normalized_shipping_address_hash',
      'full_normalized_billing_address_hash',
      'platform_customer_id',
      'helpdesk_customer_id',
      'platform_order_id',
      'helpdesk_ticket_id',
      'visitor_id',
      'device_fingerprint'
    ));

ALTER TABLE IF EXISTS public.identifier_co_occurrence_edges
  DROP CONSTRAINT IF EXISTS identifier_co_occurrence_edges_left_type_check,
  ADD CONSTRAINT identifier_co_occurrence_edges_left_type_check
    CHECK (left_identifier_type IN (
      'normalized_email_hash',
      'phone_e164_hash',
      'full_normalized_shipping_address_hash',
      'full_normalized_billing_address_hash',
      'platform_customer_id',
      'helpdesk_customer_id',
      'platform_order_id',
      'helpdesk_ticket_id',
      'visitor_id',
      'device_fingerprint'
    ));

ALTER TABLE IF EXISTS public.identifier_co_occurrence_edges
  DROP CONSTRAINT IF EXISTS identifier_co_occurrence_edges_right_type_check,
  ADD CONSTRAINT identifier_co_occurrence_edges_right_type_check
    CHECK (right_identifier_type IN (
      'normalized_email_hash',
      'phone_e164_hash',
      'full_normalized_shipping_address_hash',
      'full_normalized_billing_address_hash',
      'platform_customer_id',
      'helpdesk_customer_id',
      'platform_order_id',
      'helpdesk_ticket_id',
      'visitor_id',
      'device_fingerprint'
    ));

COMMIT;
