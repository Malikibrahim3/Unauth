-- audit_transactions.source
--
-- Tracks where a transaction was ingested from. Nullable so existing rows
-- are not affected; new rows are populated at ingestion time.
--
-- Known values: 'csv', 'shopify', 'zendesk', 'gorgias', 'api'

ALTER TABLE audit_transactions
  ADD COLUMN IF NOT EXISTS source text;
