-- =========================================================
-- PROCESSING_JOBS (track CSV ingestion & scoring jobs)
-- =========================================================

CREATE TABLE IF NOT EXISTS processing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  total_rows INTEGER NOT NULL DEFAULT 0,
  processed_rows INTEGER NOT NULL DEFAULT 0,
  failed_rows INTEGER NOT NULL DEFAULT 0,
  error_log JSONB NOT NULL DEFAULT '[]'::jsonb,
  has_ground_truth BOOLEAN DEFAULT false,
  flagged_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_processing_jobs_status ON processing_jobs(status);

-- Drop old policies if they exist
DROP POLICY IF EXISTS "processing_jobs_all_authenticated" ON processing_jobs;

ALTER TABLE processing_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "processing_jobs_insert_own" ON processing_jobs
  FOR INSERT WITH CHECK (auth.uid() = merchant_id);

CREATE POLICY "processing_jobs_select_own" ON processing_jobs
  FOR SELECT USING (auth.uid() = merchant_id);

CREATE POLICY "processing_jobs_update_own" ON processing_jobs
  FOR UPDATE USING (auth.uid() = merchant_id);
