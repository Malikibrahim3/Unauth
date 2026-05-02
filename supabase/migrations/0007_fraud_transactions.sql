-- =========================================================
-- FRAUD_TRANSACTIONS (scored results from CSV processing)
-- =========================================================
CREATE TABLE IF NOT EXISTS fraud_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES processing_jobs(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL,
  customer_email TEXT,
  customer_name TEXT,
  shipping_address TEXT,
  billing_address TEXT,
  order_value NUMERIC(12,2),
  payment_method TEXT,
  card_last4 TEXT,
  device_ip TEXT,
  account_created_at DATE,
  previous_order_count INTEGER,
  delivery_status TEXT,
  refund_claimed BOOLEAN,
  refund_reason TEXT,
  chargeback_filed BOOLEAN,
  fraud_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  fraud_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')) DEFAULT 'low',
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (job_id, order_id)
);

CREATE INDEX IF NOT EXISTS idx_fraud_transactions_job ON fraud_transactions(job_id);
CREATE INDEX IF NOT EXISTS idx_fraud_transactions_order ON fraud_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_fraud_transactions_risk ON fraud_transactions(risk_level);

ALTER TABLE fraud_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fraud_transactions_all_authenticated" ON fraud_transactions
  FOR ALL USING (auth.uid() IS NOT NULL);
