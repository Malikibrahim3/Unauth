-- Add is_demo flag to processing_jobs so demo runs can be identified
ALTER TABLE processing_jobs
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN processing_jobs.is_demo IS 'True when this run was seeded by the demo button, not a real merchant upload.';
