-- ===========================================================================
-- 0012_customer_profiles.sql
-- ---------------------------------------------------------------------------
-- Entity Resolution: Living Customer Profiles
--
-- Two new tables:
--   1. customer_profiles         — one row per unique customer entity
--   2. customer_profile_audit_appearances — links profiles to audit appearances
--
-- Plus GIN indexes on JSONB identity arrays for fast lookups.
-- ===========================================================================

-- =========================================================
-- customer_profiles
-- =========================================================
CREATE TABLE customer_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity anchors
  primary_email text,
  emails jsonb NOT NULL DEFAULT '[]'::jsonb,
  ips jsonb NOT NULL DEFAULT '[]'::jsonb,
  addresses jsonb NOT NULL DEFAULT '[]'::jsonb,
  card_last4s jsonb NOT NULL DEFAULT '[]'::jsonb,
  phones jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Name history
  names jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Risk intelligence
  risk_score numeric NOT NULL DEFAULT 0,
  risk_level text NOT NULL DEFAULT 'low'
    CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  fraud_flags jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Behaviour history
  total_orders int NOT NULL DEFAULT 0,
  total_refund_claims int NOT NULL DEFAULT 0,
  total_chargebacks int NOT NULL DEFAULT 0,
  total_merchants_seen_at int NOT NULL DEFAULT 1,
  refund_rate numeric NOT NULL DEFAULT 0,

  -- Timing intelligence
  refund_timestamps jsonb NOT NULL DEFAULT '[]'::jsonb,
  fastest_claim_days numeric,
  avg_claim_days numeric,
  refund_acceleration_score numeric NOT NULL DEFAULT 0,

  -- Cross merchant
  merchant_ids jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Meta
  first_seen timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now(),
  last_audit_id uuid,
  profile_confidence numeric NOT NULL DEFAULT 100,
  manually_reviewed boolean NOT NULL DEFAULT false,
  merchant_notes text,
  on_watchlist boolean NOT NULL DEFAULT false
);

-- =========================================================
-- customer_profile_audit_appearances
-- =========================================================
CREATE TABLE customer_profile_audit_appearances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
  audit_id uuid NOT NULL REFERENCES processing_jobs(id) ON DELETE CASCADE,
  transaction_id uuid REFERENCES fraud_transactions(id) ON DELETE SET NULL,
  score_at_time numeric NOT NULL DEFAULT 0,
  flags_at_time jsonb NOT NULL DEFAULT '[]'::jsonb,
  appeared_at timestamptz NOT NULL DEFAULT now()
);

-- =========================================================
-- Indexes
-- =========================================================

-- B-tree indexes for common lookups
CREATE INDEX idx_customer_profiles_primary_email ON customer_profiles(primary_email);
CREATE INDEX idx_customer_profiles_risk_level ON customer_profiles(risk_level);
CREATE INDEX idx_customer_profiles_on_watchlist ON customer_profiles(on_watchlist) WHERE on_watchlist = true;
CREATE INDEX idx_customer_profiles_last_seen ON customer_profiles(last_seen DESC);

-- GIN indexes on JSONB arrays — critical for entity resolution lookups
CREATE INDEX idx_customer_profiles_emails ON customer_profiles USING gin(emails jsonb_path_ops);
CREATE INDEX idx_customer_profiles_ips ON customer_profiles USING gin(ips jsonb_path_ops);
CREATE INDEX idx_customer_profiles_addresses ON customer_profiles USING gin(addresses jsonb_path_ops);
CREATE INDEX idx_customer_profiles_card_last4s ON customer_profiles USING gin(card_last4s jsonb_path_ops);

-- Appearance table indexes
CREATE INDEX idx_cp_appearances_profile ON customer_profile_audit_appearances(profile_id);
CREATE INDEX idx_cp_appearances_audit ON customer_profile_audit_appearances(audit_id);
CREATE INDEX idx_cp_appearances_transaction ON customer_profile_audit_appearances(transaction_id);

-- =========================================================
-- RLS: Service role writes, authenticated reads
-- =========================================================
ALTER TABLE customer_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customer_profiles_read_authenticated" ON customer_profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "customer_profiles_write_service" ON customer_profiles
  FOR ALL TO service_role USING (true);

ALTER TABLE customer_profile_audit_appearances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cp_appearances_read_authenticated" ON customer_profile_audit_appearances
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "cp_appearances_write_service" ON customer_profile_audit_appearances
  FOR ALL TO service_role USING (true);
