-- Provider-agnostic helpdesk / support case intake (Zendesk, Gorgias, Intercom, Freshdesk).
-- Service-role ingestion only; no raw ticket payloads or client-side tokens.

BEGIN;

CREATE TABLE IF NOT EXISTS public.support_provider_connections (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id             uuid NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  provider                text NOT NULL CHECK (provider IN ('zendesk', 'gorgias', 'intercom', 'freshdesk')),
  provider_account_id     text,
  provider_account_name   text,
  provider_base_url         text,
  status                  text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'revoked', 'error')),
  access_token_encrypted  text,
  refresh_token_encrypted text,
  token_expires_at        timestamptz,
  scopes                  jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_sync_at            timestamptz,
  last_error              text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT support_provider_connections_merchant_provider_account_unique
    UNIQUE (merchant_id, provider, provider_account_id)
);

CREATE INDEX IF NOT EXISTS support_provider_connections_merchant_provider_idx
  ON public.support_provider_connections (merchant_id, provider);

CREATE INDEX IF NOT EXISTS support_provider_connections_status_idx
  ON public.support_provider_connections (status);

CREATE TABLE IF NOT EXISTS public.support_case_intake (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id               uuid NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  provider                  text NOT NULL CHECK (provider IN ('zendesk', 'gorgias', 'intercom', 'freshdesk')),
  provider_connection_id    uuid REFERENCES public.support_provider_connections(id) ON DELETE SET NULL,
  external_case_id          text NOT NULL,
  external_url              text,
  customer_email_hash       text,
  customer_identifier       text,
  order_ref                 text,
  shop_domain               text,
  claim_reason              text,
  customer_message_summary  text,
  agent_notes_summary       text,
  case_status               text,
  decision                  text,
  outcome                   text,
  attachments_metadata      jsonb NOT NULL DEFAULT '[]'::jsonb,
  tags                      jsonb NOT NULL DEFAULT '[]'::jsonb,
  raw_payload_hash          text NOT NULL,
  created_at_provider       timestamptz,
  updated_at_provider       timestamptz,
  ingested_at               timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT support_case_intake_merchant_provider_external_unique
    UNIQUE (merchant_id, provider, external_case_id)
);

CREATE INDEX IF NOT EXISTS support_case_intake_merchant_provider_idx
  ON public.support_case_intake (merchant_id, provider);

CREATE INDEX IF NOT EXISTS support_case_intake_merchant_case_status_idx
  ON public.support_case_intake (merchant_id, case_status);

CREATE INDEX IF NOT EXISTS support_case_intake_merchant_order_ref_idx
  ON public.support_case_intake (merchant_id, order_ref);

CREATE INDEX IF NOT EXISTS support_case_intake_merchant_shop_domain_idx
  ON public.support_case_intake (merchant_id, shop_domain);

CREATE INDEX IF NOT EXISTS support_case_intake_created_at_provider_idx
  ON public.support_case_intake (created_at_provider);

CREATE INDEX IF NOT EXISTS support_case_intake_updated_at_provider_idx
  ON public.support_case_intake (updated_at_provider);

CREATE TABLE IF NOT EXISTS public.support_case_events (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id             uuid NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  support_case_id         uuid NOT NULL REFERENCES public.support_case_intake(id) ON DELETE CASCADE,
  provider                text NOT NULL CHECK (provider IN ('zendesk', 'gorgias', 'intercom', 'freshdesk')),
  event_type              text NOT NULL,
  event_summary           text,
  actor_type              text,
  actor_identifier_hash   text,
  occurred_at_provider    timestamptz,
  metadata                jsonb NOT NULL DEFAULT '{}'::jsonb,
  raw_payload_hash        text,
  created_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_case_events_merchant_case_idx
  ON public.support_case_events (merchant_id, support_case_id);

CREATE INDEX IF NOT EXISTS support_case_events_merchant_provider_type_idx
  ON public.support_case_events (merchant_id, provider, event_type);

CREATE INDEX IF NOT EXISTS support_case_events_occurred_at_provider_idx
  ON public.support_case_events (occurred_at_provider);

ALTER TABLE public.support_provider_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_case_intake ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_case_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_only_support_provider_connections_all" ON public.support_provider_connections;
CREATE POLICY "service_role_only_support_provider_connections_all"
  ON public.support_provider_connections
  FOR ALL
  TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "service_role_only_support_case_intake_all" ON public.support_case_intake;
CREATE POLICY "service_role_only_support_case_intake_all"
  ON public.support_case_intake
  FOR ALL
  TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "service_role_only_support_case_events_all" ON public.support_case_events;
CREATE POLICY "service_role_only_support_case_events_all"
  ON public.support_case_events
  FOR ALL
  TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

REVOKE ALL ON public.support_provider_connections FROM authenticated;
REVOKE ALL ON public.support_provider_connections FROM anon;
REVOKE ALL ON public.support_case_intake FROM authenticated;
REVOKE ALL ON public.support_case_intake FROM anon;
REVOKE ALL ON public.support_case_events FROM authenticated;
REVOKE ALL ON public.support_case_events FROM anon;

GRANT ALL ON public.support_provider_connections TO service_role;
GRANT ALL ON public.support_case_intake TO service_role;
GRANT ALL ON public.support_case_events TO service_role;

COMMIT;
