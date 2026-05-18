-- 0024_merchant_setup.sql
-- Adds onboarding fields to the merchants table.

ALTER TABLE merchants
  ADD COLUMN IF NOT EXISTS setup_complete    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS monthly_order_volume TEXT,
  ADD COLUMN IF NOT EXISTS primary_fraud_concern TEXT,
  ADD COLUMN IF NOT EXISTS updated_at        TIMESTAMPTZ NOT NULL DEFAULT now();

-- Grant service_role access
GRANT UPDATE ON merchants TO service_role;
