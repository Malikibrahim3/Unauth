-- Store the column mapping submitted by the merchant at upload time
ALTER TABLE csv_upload_queue
  ADD COLUMN IF NOT EXISTS column_map JSONB;

COMMENT ON COLUMN csv_upload_queue.column_map IS 'Maps internal field names to the actual CSV header names supplied by the merchant.';
