BEGIN;
ALTER TABLE audit_transactions
  ADD COLUMN IF NOT EXISTS order_date timestamptz;
COMMENT ON COLUMN audit_transactions.order_date IS
  'The order/transaction date as supplied in the merchant CSV (order_date column), parsed to a timestamp. Distinct from processed_at, which is the ingestion time. Used by the evidence builder and CE3.0 assessment for chronology and the 120-day prior-transaction requirement.';
COMMIT;
