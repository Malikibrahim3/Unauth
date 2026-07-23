-- Add platform field to merchants
ALTER TABLE merchants
  ADD COLUMN IF NOT EXISTS platform text;

-- Add watchlist sync status to processing_jobs
ALTER TABLE processing_jobs
  ADD COLUMN IF NOT EXISTS watchlist_sync_status text
    CHECK (watchlist_sync_status IN ('pending', 'synced', 'failed'));

-- Ensure storage buckets exist with correct config
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('merchant-csv-uploads-2', 'merchant-csv-uploads-2', false, 524288000,
   ARRAY['text/csv', 'application/vnd.ms-excel', 'text/plain']),
  ('evidence-packages', 'evidence-packages', false, 104857600,
   ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
