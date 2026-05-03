-- Migration 0024: Add investigation_status to customer_profiles
-- Five-state field so merchants can track the workflow for each flagged customer.

ALTER TABLE customer_profiles
  ADD COLUMN IF NOT EXISTS investigation_status text NOT NULL DEFAULT 'new'
  CONSTRAINT investigation_status_values CHECK (
    investigation_status IN ('new','under_review','contacted','resolved','cleared')
  );

CREATE INDEX IF NOT EXISTS idx_customer_profiles_investigation_status
  ON customer_profiles (investigation_status);

COMMENT ON COLUMN customer_profiles.investigation_status IS
  'Merchant workflow status: new | under_review | contacted | resolved | cleared';
