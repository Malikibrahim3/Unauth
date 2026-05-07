-- =========================================================
-- CSV_UPLOAD_QUEUE (track CSV files uploaded to Storage)
-- =========================================================
CREATE TABLE IF NOT EXISTS csv_upload_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES processing_jobs(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  merchant_id UUID NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_csv_upload_queue_status ON csv_upload_queue(status);
CREATE INDEX IF NOT EXISTS idx_csv_upload_queue_created_at ON csv_upload_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_csv_upload_queue_merchant_id ON csv_upload_queue(merchant_id);

ALTER TABLE csv_upload_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "csv_upload_queue_insert_own" ON csv_upload_queue
  FOR INSERT WITH CHECK (auth.uid() = merchant_id);

CREATE POLICY "csv_upload_queue_select_own" ON csv_upload_queue
  FOR SELECT USING (auth.uid() = merchant_id);

CREATE POLICY "csv_upload_queue_update_own" ON csv_upload_queue
  FOR UPDATE USING (auth.uid() = merchant_id);

-- =========================================================
-- STORAGE BUCKET POLICIES for merchant-csv-uploads-2
-- =========================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view own files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete own files" ON storage.objects;

-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('merchant-csv-uploads-2', 'merchant-csv-uploads-2', true, 52428800)
ON CONFLICT (id) DO UPDATE SET file_size_limit = 52428800;

-- RLS policies (drop first to avoid duplicates)
DO $$
BEGIN
  DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can view own files" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can delete own files" ON storage.objects;
END $$;

CREATE POLICY "Authenticated users can upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'merchant-csv-uploads-2' AND auth.uid() = (storage.foldername(name))[1]::uuid);

CREATE POLICY "Authenticated users can view own files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'merchant-csv-uploads-2' AND auth.uid() = (storage.foldername(name))[1]::uuid);

CREATE POLICY "Authenticated users can delete own files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'merchant-csv-uploads-2' AND auth.uid() = (storage.foldername(name))[1]::uuid);
  USING (
    bucket_id = 'merchant-csv-uploads-2'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
