-- ===========================================================================
-- 0044_add_file_hash_to_processing_jobs.sql
-- ---------------------------------------------------------------------------
-- Adds a file_hash column so the API can detect exact-duplicate CSV uploads
-- (same byte-for-byte content) and warn the user before processing again.
-- ===========================================================================

ALTER TABLE processing_jobs
  ADD COLUMN IF NOT EXISTS file_hash TEXT;

-- Index enables fast per-merchant duplicate lookups
CREATE INDEX IF NOT EXISTS idx_processing_jobs_merchant_file_hash
  ON processing_jobs(merchant_id, file_hash)
  WHERE file_hash IS NOT NULL;
