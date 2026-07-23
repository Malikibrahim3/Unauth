-- =========================================================
-- MERCHANTS: add default_column_map
-- Stores the merchant's last-confirmed field→header mapping
-- so it auto-populates on every subsequent upload.
-- =========================================================
ALTER TABLE merchants
  ADD COLUMN IF NOT EXISTS default_column_map JSONB;

COMMENT ON COLUMN merchants.default_column_map IS
  'Last confirmed CSV column mapping for this merchant. '
  'Keyed by internal field name (e.g. "customer_email"), '
  'valued by the CSV header string (e.g. "Email Address").';

-- Allow merchants to update their own row (previously only SELECT/INSERT existed)
CREATE POLICY "merchants_update_own" ON merchants
  FOR UPDATE USING (auth.uid() = user_id);
