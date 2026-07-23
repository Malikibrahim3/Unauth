-- ===========================================================================
-- 0020_processing_jobs_unify.sql
-- ---------------------------------------------------------------------------
-- Unifies the dual schema so processing_jobs becomes the single source of
-- truth for both real uploads and demo data. Adds the columns that audit_runs
-- has but processing_jobs was missing.
-- ===========================================================================

ALTER TABLE processing_jobs
  ADD COLUMN IF NOT EXISTS filename TEXT NOT NULL DEFAULT 'unknown.csv';

ALTER TABLE processing_jobs
  ALTER COLUMN filename DROP DEFAULT;

ALTER TABLE processing_jobs
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

ALTER TABLE processing_jobs
  ADD COLUMN IF NOT EXISTS hidden_by_merchant BOOLEAN NOT NULL DEFAULT false;

-- Index for dashboard / history queries
CREATE INDEX IF NOT EXISTS idx_processing_jobs_merchant_created
  ON processing_jobs(merchant_id, created_at DESC)
  WHERE hidden_by_merchant = false;

