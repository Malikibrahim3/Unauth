-- =============================================================================
-- 0030_watchlist_appearances.sql
-- ---------------------------------------------------------------------------
-- Tracks when a watchlisted customer appears in a new audit.
-- One row per (merchant, customer_profile, audit) — upserted at job completion.
-- =============================================================================

CREATE TABLE IF NOT EXISTS watchlist_appearances (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id         uuid REFERENCES merchants(id) NOT NULL,
  customer_profile_id uuid REFERENCES customer_profiles(id) NOT NULL,
  audit_id            uuid REFERENCES processing_jobs(id) NOT NULL,
  transaction_count   int NOT NULL DEFAULT 1,
  highest_grade       text CHECK (highest_grade IN ('definite', 'probable', 'possible', 'weak')),
  first_seen_in_audit timestamptz DEFAULT now(),
  reviewed_at         timestamptz,
  UNIQUE (merchant_id, customer_profile_id, audit_id)
);

ALTER TABLE watchlist_appearances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "merchant_own_appearances" ON watchlist_appearances
  FOR ALL USING (merchant_id = auth.uid());

-- Index for fast unreviewed-count lookups on the dashboard
CREATE INDEX IF NOT EXISTS idx_watchlist_appearances_merchant_reviewed
  ON watchlist_appearances (merchant_id, reviewed_at)
  WHERE reviewed_at IS NULL;
