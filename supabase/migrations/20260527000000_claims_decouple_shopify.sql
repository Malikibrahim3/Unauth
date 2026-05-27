-- Claims decoupling: make shop_domain nullable and add order-source fields
-- Additive, non-destructive migration.

ALTER TABLE merchant_claims
  ALTER COLUMN shop_domain DROP NOT NULL;

ALTER TABLE merchant_claims
  ADD COLUMN IF NOT EXISTS order_source text CHECK (order_source IN ('shopify', 'csv', 'audit', 'manual')),
  ADD COLUMN IF NOT EXISTS order_ref text,
  ADD COLUMN IF NOT EXISTS audit_transaction_id uuid REFERENCES audit_transactions(id) ON DELETE SET NULL;

ALTER TABLE merchant_case_outcomes
  ALTER COLUMN shop_domain DROP NOT NULL;
