-- Phase 2 Step 1: Core identity graph tables (net-new, no legacy table changes).
--
-- Tables:
--   identity_identifiers           — pseudonymous identifier registry (HMAC hashes)
--   identifier_co_occurrence_edges — merchant-scoped co-occurrence graph
--
-- Constraints (canonical — see reports/schema-rebuild/PHASE_2_IMPLEMENTATION_SPEC.md):
--   link_strength: initial 1.0, +0.5 per seen_count increment, no ceiling in v1
--   merchant_id:   one row per merchant per edge tuple; is_cross_merchant is NOT stored
--
-- NOT applied by this file's author. Review before supabase db push / MCP apply.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. identity_identifiers
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.identity_identifiers (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier_type         text NOT NULL,
  identifier_hash         text NOT NULL,
  source_provider         text NOT NULL DEFAULT 'unknown',
  first_seen_at           timestamptz NOT NULL DEFAULT now(),
  last_seen_at            timestamptz NOT NULL DEFAULT now(),
  raw_vs_hashed_storage   text NOT NULL DEFAULT 'hashed',
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT identity_identifiers_type_check
    CHECK (identifier_type IN (
      'normalized_email_hash',
      'phone_e164_hash',
      'full_normalized_shipping_address_hash',
      'full_normalized_billing_address_hash',
      'platform_customer_id',
      'helpdesk_customer_id',
      'platform_order_id',
      'helpdesk_ticket_id'
    )),
  CONSTRAINT identity_identifiers_source_provider_check
    CHECK (source_provider IN (
      'shopify', 'bigcommerce', 'woocommerce', 'gorgias',
      'csv', 'manual', 'unknown'
    )),
  CONSTRAINT identity_identifiers_storage_check
    CHECK (raw_vs_hashed_storage IN ('hashed', 'raw')),
  CONSTRAINT identity_identifiers_type_hash_unique
    UNIQUE (identifier_type, identifier_hash)
);

CREATE INDEX IF NOT EXISTS identity_identifiers_type_hash_idx
  ON public.identity_identifiers (identifier_type, identifier_hash);

CREATE INDEX IF NOT EXISTS identity_identifiers_source_provider_idx
  ON public.identity_identifiers (source_provider);

CREATE INDEX IF NOT EXISTS identity_identifiers_last_seen_idx
  ON public.identity_identifiers (last_seen_at DESC);

COMMENT ON TABLE public.identity_identifiers IS
  'Pseudonymous identifier registry. HMAC hashes only for PII-derived types. '
  'Network-level table — service_role access only. '
  'merchant_count_observed is NOT stored here in v1 — derive via views at query time.';

-- ---------------------------------------------------------------------------
-- 2. identifier_co_occurrence_edges
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.identifier_co_occurrence_edges (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id             uuid NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  network_cluster_id      uuid,  -- v1: nullable scaffold, no write path yet
  left_identifier_type    text NOT NULL,
  left_identifier_hash    text NOT NULL,
  right_identifier_type   text NOT NULL,
  right_identifier_hash   text NOT NULL,
  source_event_id         uuid,  -- v1: nullable; links to originating event when available
  source_provider         text NOT NULL DEFAULT 'unknown',
  first_seen_at           timestamptz NOT NULL DEFAULT now(),
  last_seen_at            timestamptz NOT NULL DEFAULT now(),
  seen_count              integer NOT NULL DEFAULT 1,
  link_strength           numeric(6, 2) NOT NULL DEFAULT 1.00,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT identifier_co_occurrence_edges_left_type_check
    CHECK (left_identifier_type IN (
      'normalized_email_hash',
      'phone_e164_hash',
      'full_normalized_shipping_address_hash',
      'full_normalized_billing_address_hash',
      'platform_customer_id',
      'helpdesk_customer_id',
      'platform_order_id',
      'helpdesk_ticket_id'
    )),
  CONSTRAINT identifier_co_occurrence_edges_right_type_check
    CHECK (right_identifier_type IN (
      'normalized_email_hash',
      'phone_e164_hash',
      'full_normalized_shipping_address_hash',
      'full_normalized_billing_address_hash',
      'platform_customer_id',
      'helpdesk_customer_id',
      'platform_order_id',
      'helpdesk_ticket_id'
    )),
  CONSTRAINT identifier_co_occurrence_edges_source_provider_check
    CHECK (source_provider IN (
      'shopify', 'bigcommerce', 'woocommerce', 'gorgias',
      'csv', 'manual', 'unknown'
    )),
  CONSTRAINT identifier_co_occurrence_edges_seen_count_check
    CHECK (seen_count >= 1),
  CONSTRAINT identifier_co_occurrence_edges_link_strength_check
    CHECK (link_strength >= 1.00),
  -- Canonical edge direction: (left_type, left_hash) < (right_type, right_hash)
  -- lexicographically. Prevents email↔address and address↔email duplicate rows.
  CONSTRAINT identifier_co_occurrence_edges_canonical_order_check
    CHECK (
      (left_identifier_type, left_identifier_hash)
      < (right_identifier_type, right_identifier_hash)
    ),
  CONSTRAINT identifier_co_occurrence_edges_merchant_pair_unique
    UNIQUE (
      merchant_id,
      left_identifier_type,
      left_identifier_hash,
      right_identifier_type,
      right_identifier_hash
    )
);

CREATE INDEX IF NOT EXISTS identifier_co_occurrence_edges_merchant_idx
  ON public.identifier_co_occurrence_edges (merchant_id);

CREATE INDEX IF NOT EXISTS identifier_co_occurrence_edges_left_idx
  ON public.identifier_co_occurrence_edges (left_identifier_type, left_identifier_hash);

CREATE INDEX IF NOT EXISTS identifier_co_occurrence_edges_right_idx
  ON public.identifier_co_occurrence_edges (right_identifier_type, right_identifier_hash);

CREATE INDEX IF NOT EXISTS identifier_co_occurrence_edges_source_provider_idx
  ON public.identifier_co_occurrence_edges (source_provider);

CREATE INDEX IF NOT EXISTS identifier_co_occurrence_edges_last_seen_idx
  ON public.identifier_co_occurrence_edges (last_seen_at DESC);

CREATE INDEX IF NOT EXISTS identifier_co_occurrence_edges_network_cluster_idx
  ON public.identifier_co_occurrence_edges (network_cluster_id)
  WHERE network_cluster_id IS NOT NULL;

COMMENT ON TABLE public.identifier_co_occurrence_edges IS
  'Merchant-scoped identifier co-occurrence graph. One row per merchant per edge tuple. '
  'is_cross_merchant is derived via v_identifier_edges_cross_merchant (Step 3). '
  'link_strength: initial 1.0, +0.5 per seen_count increment, no ceiling in v1. '
  'Network-level table — service_role access only.';

COMMENT ON COLUMN public.identifier_co_occurrence_edges.link_strength IS
  'Identity-link confidence weight (not a risk score). '
  'Rule: 1.0 on first observation; link_strength = 1.0 + (seen_count - 1) * 0.5 on upsert.';

COMMENT ON COLUMN public.identifier_co_occurrence_edges.network_cluster_id IS
  'v1: nullable scaffold, no write path yet.';

-- ---------------------------------------------------------------------------
-- 3. RLS — service_role only (mirrors lockdown_network_graph_rls pattern)
-- ---------------------------------------------------------------------------
ALTER TABLE public.identity_identifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.identifier_co_occurrence_edges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS identity_identifiers_service_only ON public.identity_identifiers;
CREATE POLICY identity_identifiers_service_only
  ON public.identity_identifiers
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS identifier_co_occurrence_edges_service_only ON public.identifier_co_occurrence_edges;
CREATE POLICY identifier_co_occurrence_edges_service_only
  ON public.identifier_co_occurrence_edges
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON public.identity_identifiers FROM anon, authenticated;
REVOKE ALL ON public.identifier_co_occurrence_edges FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.identity_identifiers TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.identifier_co_occurrence_edges TO service_role;

-- ---------------------------------------------------------------------------
-- 4. Deprecation comments (drop in Step 7)
-- ---------------------------------------------------------------------------
COMMENT ON TABLE public.global_identity_clusters IS
  'DEPRECATED (2026-06-08): Superseded by identifier_co_occurrence_edges + '
  'network views. No write path. Drop in Phase 2 Step 7 after data migration.';

COMMENT ON TABLE public.global_identity_cluster_attributes IS
  'DEPRECATED (2026-06-08): Superseded by identifier_co_occurrence_edges. '
  'No write path. Drop in Phase 2 Step 7 after data migration.';

COMMIT;
