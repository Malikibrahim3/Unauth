-- =========================================================
-- MERCHANTS (tenants)
-- =========================================================
CREATE TABLE merchants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_merchants_user ON merchants(user_id);

ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "merchants_select_own" ON merchants
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "merchants_insert_own" ON merchants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =========================================================
-- IDENTITIES (pseudonymous cross-merchant graph)
-- Must be created before transactions due to FK reference
-- =========================================================
CREATE TABLE identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_email_hash TEXT NOT NULL UNIQUE,
  linked_address_hashes TEXT[] NOT NULL DEFAULT '{}',
  linked_phone_hashes TEXT[] NOT NULL DEFAULT '{}',
  merchant_count INTEGER NOT NULL DEFAULT 0,
  total_orders INTEGER NOT NULL DEFAULT 0,
  total_refunds INTEGER NOT NULL DEFAULT 0,
  total_inr_claims INTEGER NOT NULL DEFAULT 0,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- NO RLS on identities — only accessible via server-side functions
-- that enforce k-anonymity (N>=3) before returning any data.
REVOKE ALL ON identities FROM anon, authenticated;

-- =========================================================
-- AUDIT_RUNS (one per CSV upload)
-- =========================================================
CREATE TABLE audit_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  row_count INTEGER NOT NULL,
  flagged_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('processing', 'complete', 'failed')),
  error_message TEXT,
  has_ground_truth BOOLEAN NOT NULL DEFAULT false,
  eval_metrics JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_runs_merchant ON audit_runs(merchant_id, created_at DESC);

ALTER TABLE audit_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "runs_select_own" ON audit_runs
  FOR SELECT USING (
    merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
  );

CREATE POLICY "runs_insert_own" ON audit_runs
  FOR INSERT WITH CHECK (
    merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
  );

CREATE POLICY "runs_update_own" ON audit_runs
  FOR UPDATE USING (
    merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
  );

-- =========================================================
-- TRANSACTIONS (per-row scored results)
-- =========================================================
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES audit_runs(id) ON DELETE CASCADE,
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,

  external_order_id TEXT NOT NULL,
  order_date TIMESTAMPTZ NOT NULL,
  order_total NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GBP',
  order_status TEXT,
  refund_status TEXT,
  refund_reason TEXT,
  refund_date TIMESTAMPTZ,

  email_hash TEXT NOT NULL,
  address_hash TEXT,
  phone_hash TEXT,
  identity_id UUID REFERENCES identities(id),

  fraud_score NUMERIC(5,2) NOT NULL,
  risk_tier TEXT NOT NULL CHECK (risk_tier IN ('low', 'medium', 'high', 'critical')),
  flagged BOOLEAN NOT NULL DEFAULT false,
  signals_fired JSONB NOT NULL DEFAULT '[]'::jsonb,

  ground_truth_label TEXT CHECK (ground_truth_label IN ('fraud', 'legitimate', NULL)),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tx_run ON transactions(run_id);
CREATE INDEX idx_tx_merchant ON transactions(merchant_id);
CREATE INDEX idx_tx_email_hash ON transactions(email_hash);
CREATE INDEX idx_tx_identity ON transactions(identity_id);
CREATE INDEX idx_tx_flagged ON transactions(run_id, flagged) WHERE flagged = true;

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tx_select_own" ON transactions
  FOR SELECT USING (
    merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
  );

CREATE POLICY "tx_insert_own" ON transactions
  FOR INSERT WITH CHECK (
    merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
  );

-- =========================================================
-- IDENTITY_SIGHTINGS (which merchant saw which identity, when)
-- =========================================================
CREATE TABLE identity_sightings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_id UUID NOT NULL REFERENCES identities(id) ON DELETE CASCADE,
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  order_count INTEGER NOT NULL DEFAULT 0,
  refund_count INTEGER NOT NULL DEFAULT 0,
  inr_count INTEGER NOT NULL DEFAULT 0,
  UNIQUE (identity_id, merchant_id)
);

REVOKE ALL ON identity_sightings FROM anon, authenticated;

-- =========================================================
-- ACCESS_AUDIT_LOG (every cross-merchant lookup is logged)
-- =========================================================
CREATE TABLE access_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id),
  identity_id UUID REFERENCES identities(id),
  query_type TEXT NOT NULL,
  k_anonymity_satisfied BOOLEAN NOT NULL,
  result_returned BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
