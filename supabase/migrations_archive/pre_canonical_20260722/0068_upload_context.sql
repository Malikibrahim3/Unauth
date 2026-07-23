-- Migration 0038: Upload context fields on processing_jobs
-- Adds date range, human label, and upload type so merchants can
-- describe what time period each upload covers and why.

ALTER TABLE processing_jobs
  ADD COLUMN IF NOT EXISTS date_range_start date,
  ADD COLUMN IF NOT EXISTS date_range_end   date,
  ADD COLUMN IF NOT EXISTS label            text,
  ADD COLUMN IF NOT EXISTS upload_type      text NOT NULL DEFAULT 'standard'
    CHECK (upload_type IN ('standard', 'historical', 'investigation'));

COMMENT ON COLUMN processing_jobs.date_range_start IS 'Earliest order date covered by this upload (merchant-provided).';
COMMENT ON COLUMN processing_jobs.date_range_end   IS 'Latest order date covered by this upload (merchant-provided).';
COMMENT ON COLUMN processing_jobs.label            IS 'Human-readable name for this upload, e.g. "January 2026" or "Black Friday week".';
COMMENT ON COLUMN processing_jobs.upload_type      IS 'standard = regular periodic export | historical = one-time bulk import | investigation = targeted single-customer analysis.';
