-- ===========================================================================
-- 0024_data_quality_column.sql
-- ---------------------------------------------------------------------------
-- Add a data_quality jsonb column to processing_jobs so the worker can store
-- the DataQualityReport produced by assessDataQuality() against each upload.
-- Used by the audit results page to show a contextual banner when data is
-- sparse or minimal.
-- ===========================================================================

ALTER TABLE processing_jobs
  ADD COLUMN IF NOT EXISTS data_quality jsonb;
