-- Shopify → audit_transactions bridge: shop_domain for dedup and backfill queries.
-- Also ensures `source` exists (normally added in 20260529010000_audit_tx_source.sql).

ALTER TABLE audit_transactions
  ADD COLUMN IF NOT EXISTS source text;

ALTER TABLE audit_transactions
  ADD COLUMN IF NOT EXISTS shop_domain text;

CREATE UNIQUE INDEX IF NOT EXISTS ux_audit_transactions_shopify_shop_order
  ON audit_transactions (shop_domain, order_id)
  WHERE source = 'shopify' AND shop_domain IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_transactions_shopify_shop
  ON audit_transactions (shop_domain)
  WHERE source = 'shopify';

-- Allow dedicated Shopify sync jobs in processing_jobs.
ALTER TABLE processing_jobs DROP CONSTRAINT IF EXISTS processing_jobs_upload_type_check;
ALTER TABLE processing_jobs
  ADD CONSTRAINT processing_jobs_upload_type_check
  CHECK (upload_type IN ('standard', 'historical', 'investigation', 'shopify'));
