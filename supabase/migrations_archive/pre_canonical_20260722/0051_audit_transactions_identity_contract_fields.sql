-- =========================================================
-- Persist pure identity-contract evidence on audit transactions
-- =========================================================
--
-- These columns are the core merchant-facing contract:
-- "this new order appears to be the same customer because of these matched
-- identifiers, even where some datapoints changed."
--
-- Refund, dispute, and value context remains decision-support metadata only.

ALTER TABLE audit_transactions
  ADD COLUMN IF NOT EXISTS identity_match_score numeric
    CHECK (identity_match_score IS NULL OR (identity_match_score >= 0 AND identity_match_score <= 100)),
  ADD COLUMN IF NOT EXISTS identity_match_grade text
    CHECK (identity_match_grade IS NULL OR identity_match_grade IN ('none', 'candidate', 'probable', 'confirmed')),
  ADD COLUMN IF NOT EXISTS identity_evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS matched_datapoints jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS changed_datapoints jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS evidence_summary text,
  ADD COLUMN IF NOT EXISTS context_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS context_summary text;

CREATE INDEX IF NOT EXISTS idx_audit_transactions_identity_match_grade
  ON audit_transactions (job_id, identity_match_grade);

CREATE INDEX IF NOT EXISTS idx_audit_transactions_identity_match_score
  ON audit_transactions (job_id, identity_match_score DESC)
  WHERE identity_match_score IS NOT NULL;
