CREATE TABLE IF NOT EXISTS background_intelligence_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES processing_jobs(id) ON DELETE CASCADE,
  chunk_index int NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'failed')),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  error text
);

CREATE INDEX IF NOT EXISTS idx_background_intelligence_jobs_job_chunk
  ON background_intelligence_jobs(job_id, chunk_index);

CREATE INDEX IF NOT EXISTS idx_background_intelligence_jobs_status
  ON background_intelligence_jobs(status);

ALTER TABLE background_intelligence_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "background_intelligence_jobs_service_all"
  ON background_intelligence_jobs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "background_intelligence_jobs_read_authenticated"
  ON background_intelligence_jobs
  FOR SELECT
  TO authenticated
  USING (true);
