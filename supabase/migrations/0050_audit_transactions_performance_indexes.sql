-- =========================================================
-- Add missing dismissed_by_merchant column + performance indexes
-- =========================================================
--
-- The code references dismissed_by_merchant but the column was never added.
-- This migration adds it and creates indexes for the count queries.

-- Add the missing column
ALTER TABLE audit_transactions
  ADD COLUMN IF NOT EXISTS dismissed_by_merchant boolean NOT NULL DEFAULT false;

-- Index for Clause A: (job_id, identity_confidence_grade, dismissed_by_merchant)
CREATE INDEX IF NOT EXISTS idx_audit_transactions_grade_dismissed
  ON audit_transactions (job_id, identity_confidence_grade, dismissed_by_merchant);

-- Index for Clause B: (job_id, match_status, identity_confidence_grade, dismissed_by_merchant)
CREATE INDEX IF NOT EXISTS idx_audit_transactions_match_grade_dismissed
  ON audit_transactions (job_id, match_status, identity_confidence_grade, dismissed_by_merchant);

-- Partial index for non-dismissed rows (most common case)
CREATE INDEX IF NOT EXISTS idx_audit_transactions_not_dismissed
  ON audit_transactions (job_id, identity_confidence_grade, match_status)
  WHERE dismissed_by_merchant IS NOT TRUE;
