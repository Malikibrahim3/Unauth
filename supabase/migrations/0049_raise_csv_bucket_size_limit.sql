-- =========================================================
-- Raise the merchant-csv-uploads-2 bucket file size limit to 500 MiB.
--
-- The app advertises "Max 500 MB · up to 5,000,000 rows" in the upload UI,
-- but the bucket was created with a lower default file_size_limit which
-- caused merchant uploads to fail with:
--   "The object exceeded the maximum allowed size"
--
-- 500 MiB = 524288000 bytes
-- =========================================================

UPDATE storage.buckets
SET
  file_size_limit = 524288000,
  -- Ensure text/csv (and the JSON-in-a-csv-blob format used by chunked
  -- dispatch) remain in the allowed MIME list.
  allowed_mime_types = ARRAY['text/csv', 'application/csv', 'text/plain']
WHERE id = 'merchant-csv-uploads-2';
