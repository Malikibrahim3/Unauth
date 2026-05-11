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
-- =========================================================
-- TRANSACTIONS: add new signal columns
-- =========================================================
ALTER TABLE transactions
  ADD COLUMN name_hash             TEXT,
  ADD COLUMN billing_address_hash  TEXT,
  ADD COLUMN ip_hash               TEXT,
  ADD COLUMN device_id_hash        TEXT,
  ADD COLUMN card_fingerprint      TEXT;

CREATE INDEX idx_tx_card   ON transactions(card_fingerprint) WHERE card_fingerprint IS NOT NULL;
CREATE INDEX idx_tx_ip     ON transactions(ip_hash)          WHERE ip_hash IS NOT NULL;
CREATE INDEX idx_tx_device ON transactions(device_id_hash)   WHERE device_id_hash IS NOT NULL;

-- =========================================================
-- IDENTITIES: drop legacy arrays, add merge columns
-- The arrays are superseded by identity_signal_links below.
-- =========================================================
ALTER TABLE identities
  DROP COLUMN linked_address_hashes,
  DROP COLUMN linked_phone_hashes,
  ADD COLUMN is_merged   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN merged_into UUID REFERENCES identities(id);

-- =========================================================
-- IDENTITY_SIGNAL_LINKS
-- Canonical per-signal graph. One row per (identity, type, hash).
-- Enables reverse lookup: "which identity owns this card?"
-- =========================================================
CREATE TABLE identity_signal_links (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_id      UUID    NOT NULL REFERENCES identities(id) ON DELETE CASCADE,
  signal_type      TEXT    NOT NULL CHECK (signal_type IN (
                     'email', 'phone',
                     'address_shipping', 'address_billing',
                     'name', 'card_fingerprint', 'ip', 'device'
                   )),
  signal_hash      TEXT    NOT NULL,
  confidence       NUMERIC(3,2) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  first_seen_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  occurrence_count INTEGER NOT NULL DEFAULT 1,
  UNIQUE (identity_id, signal_type, signal_hash)
);

-- Reverse lookup: find which identity owns a given (type, hash) pair
CREATE INDEX idx_signal_links_lookup ON identity_signal_links(signal_type, signal_hash);

REVOKE ALL ON identity_signal_links FROM anon, authenticated;

-- =========================================================
-- IDENTITY_MERGES
-- Records when two email-anchored identities are collapsed
-- because a stronger signal (card, device) proved they are
-- the same person.
-- =========================================================
CREATE TABLE identity_merges (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  surviving_identity_id UUID NOT NULL REFERENCES identities(id),
  absorbed_identity_id  UUID NOT NULL REFERENCES identities(id),
  merge_trigger         TEXT NOT NULL,        -- e.g. 'card_fingerprint', 'device'
  merge_confidence      NUMERIC(3,2) NOT NULL,
  merged_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (absorbed_identity_id)               -- each identity absorbed at most once
);

REVOKE ALL ON identity_merges FROM anon, authenticated;
-- =========================================================
-- TRANSACTIONS: add new signal columns
-- =========================================================
ALTER TABLE transactions
  ADD COLUMN card_bin             TEXT,
  ADD COLUMN card_last4           TEXT,
  ADD COLUMN card_bin_last4       TEXT,
  ADD COLUMN browser_fingerprint  TEXT,
  ADD COLUMN cookie_id_hash       TEXT,
  ADD COLUMN user_agent_hash      TEXT,
  ADD COLUMN asn_hash             TEXT,
  ADD COLUMN account_id_hash      TEXT;

-- Indexes for high-confidence signals used in identity lookup
CREATE INDEX idx_tx_card_bin_last4    ON transactions(card_bin_last4)      WHERE card_bin_last4 IS NOT NULL;
CREATE INDEX idx_tx_browser_fp        ON transactions(browser_fingerprint)  WHERE browser_fingerprint IS NOT NULL;
CREATE INDEX idx_tx_cookie_id         ON transactions(cookie_id_hash)       WHERE cookie_id_hash IS NOT NULL;
CREATE INDEX idx_tx_account_id        ON transactions(account_id_hash)      WHERE account_id_hash IS NOT NULL;

-- =========================================================
-- IDENTITY_SIGNAL_LINKS: expand signal_type check constraint
-- PostgreSQL requires drop + re-add to modify a check constraint.
-- =========================================================
ALTER TABLE identity_signal_links
  DROP CONSTRAINT identity_signal_links_signal_type_check;

ALTER TABLE identity_signal_links
  ADD CONSTRAINT identity_signal_links_signal_type_check
  CHECK (signal_type IN (
    'email', 'phone',
    'address_shipping', 'address_billing',
    'name', 'card_fingerprint',
    'card_bin', 'card_last4', 'card_bin_last4',
    'browser_fingerprint', 'cookie_id', 'user_agent',
    'asn', 'account_id',
    'ip', 'device'
  ));
ALTER TABLE audit_runs ADD COLUMN IF NOT EXISTS progress_percent INTEGER NOT NULL DEFAULT 0;
-- Add current_stage column for progress tracking
ALTER TABLE audit_runs ADD COLUMN IF NOT EXISTS current_stage TEXT;

-- Create optimized identity upsert function
CREATE OR REPLACE FUNCTION upsert_identity_v2(
  p_email_hash   TEXT,
  p_merchant_id  UUID,
  p_is_refund    BOOLEAN,
  p_is_inr       BOOLEAN,
  p_signals      JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_identity_id  UUID;
  v_existing     identities%ROWTYPE;
  v_sighting_id  UUID;
  v_new_merchant BOOLEAN;
  v_sig_type     TEXT;
  v_sig_hash     TEXT;
BEGIN
  SELECT * INTO v_existing FROM identities WHERE primary_email_hash = p_email_hash;

  IF v_existing IS NULL THEN
    SELECT i.* INTO v_existing FROM identities i WHERE i.id IN (SELECT identity_id FROM identity_signal_links WHERE signal_type = 'card_fingerprint' AND signal_hash = (p_signals ->> 'card_fingerprint') LIMIT 1) LIMIT 1;
  END IF;
  IF v_existing IS NULL THEN
    SELECT i.* INTO v_existing FROM identities i WHERE i.id IN (SELECT identity_id FROM identity_signal_links WHERE signal_type = 'card_bin_last4' AND signal_hash = (p_signals ->> 'card_bin_last4') LIMIT 1) LIMIT 1;
  END IF;
  IF v_existing IS NULL THEN
    SELECT i.* INTO v_existing FROM identities i WHERE i.id IN (SELECT identity_id FROM identity_signal_links WHERE signal_type = 'account_id' AND signal_hash = (p_signals ->> 'account_id') LIMIT 1) LIMIT 1;
  END IF;
  IF v_existing IS NULL THEN
    SELECT i.* INTO v_existing FROM identities i WHERE i.id IN (SELECT identity_id FROM identity_signal_links WHERE signal_type = 'browser_fingerprint' AND signal_hash = (p_signals ->> 'browser_fingerprint') LIMIT 1) LIMIT 1;
  END IF;
  IF v_existing IS NULL THEN
    SELECT i.* INTO v_existing FROM identities i WHERE i.id IN (SELECT identity_id FROM identity_signal_links WHERE signal_type = 'device' AND signal_hash = (p_signals ->> 'device') LIMIT 1) LIMIT 1;
  END IF;
  IF v_existing IS NULL THEN
    SELECT i.* INTO v_existing FROM identities i WHERE i.id IN (SELECT identity_id FROM identity_signal_links WHERE signal_type = 'cookie_id' AND signal_hash = (p_signals ->> 'cookie_id') LIMIT 1) LIMIT 1;
  END IF;

  IF v_existing IS NULL THEN
    INSERT INTO identities (primary_email_hash, merchant_count, total_orders, total_refunds, total_inr_claims)
    VALUES (p_email_hash, 1, 1, CASE WHEN p_is_refund THEN 1 ELSE 0 END, CASE WHEN p_is_inr THEN 1 ELSE 0 END)
    ON CONFLICT (primary_email_hash) DO UPDATE
    SET total_orders = identities.total_orders + 1,
        total_refunds = identities.total_refunds + (CASE WHEN p_is_refund THEN 1 ELSE 0 END),
        total_inr_claims = identities.total_inr_claims + (CASE WHEN p_is_inr THEN 1 ELSE 0 END),
        last_seen_at = now()
    RETURNING id INTO v_identity_id;
  ELSE
    v_identity_id := v_existing.id;
    SELECT id INTO v_sighting_id FROM identity_sightings WHERE identity_id = v_identity_id AND merchant_id = p_merchant_id;
    v_new_merchant := v_sighting_id IS NULL;
    UPDATE identities SET
      merchant_count = merchant_count + (CASE WHEN v_new_merchant THEN 1 ELSE 0 END),
      total_orders = total_orders + 1,
      total_refunds = total_refunds + (CASE WHEN p_is_refund THEN 1 ELSE 0 END),
      total_inr_claims = total_inr_claims + (CASE WHEN p_is_inr THEN 1 ELSE 0 END),
      last_seen_at = now()
    WHERE id = v_identity_id;
  END IF;

  INSERT INTO identity_sightings (identity_id, merchant_id, order_count, refund_count, inr_count)
  VALUES (v_identity_id, p_merchant_id, 1, CASE WHEN p_is_refund THEN 1 ELSE 0 END, CASE WHEN p_is_inr THEN 1 ELSE 0 END)
  ON CONFLICT (identity_id, merchant_id) DO UPDATE
  SET order_count = identity_sightings.order_count + 1,
      refund_count = identity_sightings.refund_count + (CASE WHEN p_is_refund THEN 1 ELSE 0 END),
      inr_count = identity_sightings.inr_count + (CASE WHEN p_is_inr THEN 1 ELSE 0 END),
      last_seen_at = now();

  FOR v_sig_type, v_sig_hash IN SELECT key, value FROM jsonb_each_text(p_signals) WHERE value IS NOT NULL LOOP
    INSERT INTO identity_signal_links (identity_id, signal_type, signal_hash, confidence)
    VALUES (v_identity_id, v_sig_type, v_sig_hash,
      CASE v_sig_type
        WHEN 'card_fingerprint' THEN 0.95 WHEN 'card_bin_last4' THEN 0.92 WHEN 'account_id' THEN 0.90
        WHEN 'browser_fingerprint' THEN 0.88 WHEN 'device' THEN 0.85 WHEN 'cookie_id' THEN 0.85
        WHEN 'phone' THEN 0.80 WHEN 'card_last4' THEN 0.72 WHEN 'card_bin' THEN 0.70
        WHEN 'address_billing' THEN 0.75 WHEN 'address_shipping' THEN 0.65 WHEN 'email' THEN 0.60
        WHEN 'user_agent' THEN 0.48 WHEN 'ip' THEN 0.40 WHEN 'asn' THEN 0.42 WHEN 'name' THEN 0.35
        ELSE 0.50
      END)
    ON CONFLICT (identity_id, signal_type, signal_hash) DO UPDATE
    SET last_seen_at = now(), occurrence_count = identity_signal_links.occurrence_count + 1;
  END LOOP;

  RETURN v_identity_id;
END
$$;

REVOKE EXECUTE ON FUNCTION upsert_identity_v2 FROM anon, authenticated;
-- =========================================================
-- PROCESSING_JOBS (track CSV ingestion & scoring jobs)
-- =========================================================

CREATE TABLE IF NOT EXISTS processing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  total_rows INTEGER NOT NULL DEFAULT 0,
  processed_rows INTEGER NOT NULL DEFAULT 0,
  failed_rows INTEGER NOT NULL DEFAULT 0,
  error_log JSONB NOT NULL DEFAULT '[]'::jsonb,
  has_ground_truth BOOLEAN DEFAULT false,
  flagged_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_processing_jobs_status ON processing_jobs(status);

-- Drop old policies if they exist
DROP POLICY IF EXISTS "processing_jobs_all_authenticated" ON processing_jobs;

ALTER TABLE processing_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "processing_jobs_insert_own" ON processing_jobs
  FOR INSERT WITH CHECK (auth.uid() = merchant_id);

CREATE POLICY "processing_jobs_select_own" ON processing_jobs
  FOR SELECT USING (auth.uid() = merchant_id);

CREATE POLICY "processing_jobs_update_own" ON processing_jobs
  FOR UPDATE USING (auth.uid() = merchant_id);
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
-- =========================================================
-- CSV_UPLOAD_QUEUE (track CSV files uploaded to Storage)
-- =========================================================
CREATE TABLE IF NOT EXISTS csv_upload_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES processing_jobs(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  merchant_id UUID NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_csv_upload_queue_status ON csv_upload_queue(status);
CREATE INDEX IF NOT EXISTS idx_csv_upload_queue_created_at ON csv_upload_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_csv_upload_queue_merchant_id ON csv_upload_queue(merchant_id);

ALTER TABLE csv_upload_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "csv_upload_queue_insert_own" ON csv_upload_queue
  FOR INSERT WITH CHECK (auth.uid() = merchant_id);

CREATE POLICY "csv_upload_queue_select_own" ON csv_upload_queue
  FOR SELECT USING (auth.uid() = merchant_id);

CREATE POLICY "csv_upload_queue_update_own" ON csv_upload_queue
  FOR UPDATE USING (auth.uid() = merchant_id);

-- =========================================================
-- STORAGE BUCKET POLICIES for merchant-csv-uploads-2
-- =========================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view own files" ON storage.objects;

-- Allow authenticated users to upload files (anyone can upload to their own folder)
CREATE POLICY "Authenticated users can upload" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'merchant-csv-uploads-2'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to view their own files
CREATE POLICY "Authenticated users can view own files" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'merchant-csv-uploads-2'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to delete their own files
CREATE POLICY "Authenticated users can delete own files" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'merchant-csv-uploads-2'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
-- =========================================================
-- FRAUD_ENTITIES (persistent entity intelligence across uploads)
-- =========================================================
CREATE TABLE fraud_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('email', 'ip', 'address', 'card_last4', 'phone')),
  entity_value TEXT NOT NULL,
  first_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_orders INTEGER NOT NULL DEFAULT 0,
  total_refund_claims INTEGER NOT NULL DEFAULT 0,
  total_chargebacks INTEGER NOT NULL DEFAULT 0,
  total_merchants INTEGER NOT NULL DEFAULT 1,
  fraud_score_avg NUMERIC DEFAULT 0,
  flagged_count INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT fraud_entities_unique UNIQUE(entity_type, entity_value)
);

-- Indexes for fast lookups
CREATE INDEX idx_fraud_entities_type_value ON fraud_entities(entity_type, entity_value);
CREATE INDEX idx_fraud_entities_last_seen ON fraud_entities(last_seen DESC);

-- RLS: Service role only for writes, authenticated can read
ALTER TABLE fraud_entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fraud_entities_read_authenticated" ON fraud_entities
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "fraud_entities_write_service" ON fraud_entities
  FOR ALL TO service_role USING (true);

-- =========================================================
-- FRAUD_ENTITY_CO_OCCURRENCES (entity relationship graph)
-- =========================================================
CREATE TABLE fraud_entity_co_occurrences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_a_type TEXT NOT NULL,
  entity_a_value TEXT NOT NULL,
  entity_b_type TEXT NOT NULL,
  entity_b_value TEXT NOT NULL,
  co_occurrence_count INTEGER NOT NULL DEFAULT 1,
  first_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT co_occurrences_unique UNIQUE(entity_a_type, entity_a_value, entity_b_type, entity_b_value)
);

-- Indexes for co-occurrence lookups
CREATE INDEX idx_co_occurrences_a ON fraud_entity_co_occurrences(entity_a_type, entity_a_value);
CREATE INDEX idx_co_occurrences_b ON fraud_entity_co_occurrences(entity_b_type, entity_b_value);
CREATE INDEX idx_co_occurrences_last_seen ON fraud_entity_co_occurrences(last_seen DESC);

-- RLS: Service role only for writes, authenticated can read
ALTER TABLE fraud_entity_co_occurrences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "co_occurrences_read_authenticated" ON fraud_entity_co_occurrences
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "co_occurrences_write_service" ON fraud_entity_co_occurrences
  FOR ALL TO service_role USING (true);

-- =========================================================
-- RPC: upsert_fraud_entity (atomic increment logic)
-- =========================================================
CREATE OR REPLACE FUNCTION upsert_fraud_entity(
  p_entity_type TEXT,
  p_entity_value TEXT,
  p_refund_claim INTEGER,
  p_chargeback INTEGER,
  p_flagged INTEGER,
  p_score NUMERIC
) RETURNS VOID AS $$
BEGIN
  INSERT INTO fraud_entities (
    entity_type,
    entity_value,
    total_orders,
    total_refund_claims,
    total_chargebacks,
    flagged_count,
    fraud_score_avg,
    first_seen,
    last_seen
  )
  VALUES (
    p_entity_type,
    p_entity_value,
    1,
    p_refund_claim,
    p_chargeback,
    p_flagged,
    p_score,
    now(),
    now()
  )
  ON CONFLICT (entity_type, entity_value) DO UPDATE SET
    total_orders = fraud_entities.total_orders + 1,
    total_refund_claims = fraud_entities.total_refund_claims + p_refund_claim,
    total_chargebacks = fraud_entities.total_chargebacks + p_chargeback,
    flagged_count = fraud_entities.flagged_count + p_flagged,
    fraud_score_avg = (fraud_entities.fraud_score_avg + p_score) / 2,
    last_seen = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to service role
GRANT EXECUTE ON FUNCTION upsert_fraud_entity TO service_role;
-- =========================================================
-- REFUND PATTERN INTELLIGENCE - Add columns to fraud_entities
-- =========================================================

-- Add refund pattern tracking columns to fraud_entities
ALTER TABLE fraud_entities
  ADD COLUMN IF NOT EXISTS refund_timestamps jsonb default '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS refund_intervals_avg_days numeric,
  ADD COLUMN IF NOT EXISTS refund_acceleration_score numeric default 0,
  ADD COLUMN IF NOT EXISTS fastest_claim_days numeric,
  ADD COLUMN IF NOT EXISTS total_merchants_refunded_at int default 0;

-- =========================================================
-- FRAUD_IDENTITY_CLUSTERS - Probabilistic identity matching
-- =========================================================
CREATE TABLE fraud_identity_clusters (
  id uuid primary key default gen_random_uuid(),
  cluster_id uuid not null,
  entity_type text not null,
  entity_value text not null,
  confidence numeric not null,
  match_reasons jsonb not null default '[]',
  first_seen timestamp default now(),
  last_seen timestamp default now(),
  constraint fraud_identity_clusters_unique unique(cluster_id, entity_type, entity_value)
);

-- Indexes for fast cluster lookups
CREATE INDEX idx_identity_clusters_cluster_id ON fraud_identity_clusters(cluster_id);
CREATE INDEX idx_identity_clusters_entity ON fraud_identity_clusters(entity_type, entity_value);
CREATE INDEX idx_identity_clusters_last_seen ON fraud_identity_clusters(last_seen DESC);

-- RLS: Service role only for writes, authenticated can read
ALTER TABLE fraud_identity_clusters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "identity_clusters_read_authenticated" ON fraud_identity_clusters
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "identity_clusters_write_service" ON fraud_identity_clusters
  FOR ALL TO service_role USING (true);

-- =========================================================
-- RPC: upsert_refund_pattern (update refund pattern intelligence)
-- =========================================================
CREATE OR REPLACE FUNCTION upsert_refund_pattern(
  p_entity_type TEXT,
  p_entity_value TEXT,
  p_refund_timestamp TEXT,
  p_days_to_claim NUMERIC,
  p_merchant_identifier TEXT
) RETURNS VOID AS $$
DECLARE
  existing_timestamps jsonb;
  new_timestamps jsonb;
  interval_count INTEGER;
  total_interval_days NUMERIC;
  new_avg_interval NUMERIC;
  latest_interval NUMERIC;
  prev_avg_interval NUMERIC;
  acceleration_ratio NUMERIC;
  acceleration_score NUMERIC;
BEGIN
  -- Get existing refund timestamps
  SELECT refund_timestamps INTO existing_timestamps
  FROM fraud_entities
  WHERE entity_type = p_entity_type AND entity_value = p_entity_value;

  -- Append new timestamp
  new_timestamps := existing_timestamps || p_refund_timestamp;

  -- Calculate average interval between refunds
  SELECT jsonb_array_length(new_timestamps) INTO interval_count;
  
  IF interval_count >= 2 THEN
    -- Calculate total days between consecutive refunds
    -- This is a simplified calculation - in production you'd extract and sort timestamps
    total_interval_days := 0; -- Placeholder - actual calculation would parse timestamps
    
    -- For now, we'll update with a simple increment
    -- Full implementation would need timestamp parsing logic
    new_avg_interval := COALESCE(
      (SELECT refund_intervals_avg_days FROM fraud_entities 
       WHERE entity_type = p_entity_type AND entity_value = p_entity_value),
      0
    );
  ELSE
    new_avg_interval := NULL;
  END IF;

  -- Update fastest_claim_days if this claim is faster
  UPDATE fraud_entities
  SET 
    refund_timestamps = new_timestamps,
    refund_intervals_avg_days = new_avg_interval,
    fastest_claim_days = LEAST(COALESCE(fastest_claim_days, 999999), p_days_to_claim)
  WHERE entity_type = p_entity_type AND entity_value = p_entity_value;

  -- Increment total_merchants_refunded_at if this merchant is new
  -- This would require tracking which merchants have been refunded
  -- Simplified for now - full implementation needs merchant tracking
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to service role
GRANT EXECUTE ON FUNCTION upsert_refund_pattern TO service_role;
-- ===========================================================================
-- 0011_adaptive_intelligence.sql
-- ---------------------------------------------------------------------------
--   * upsert_fraud_entity_v2  -- atomic increments + refund-pattern updates
--   * upsert_co_occurrence    -- atomic pair-count increments
--   * fraud_transactions.feedback_outcome / feedback_at columns
--   * signal_performance      -- adaptive learning state
--   * record_signal_feedback  -- merchant feedback handler
--   * seed_fraud_intelligence -- one-shot Phase-5 backfill from fraud_transactions
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. fraud_transactions: track merchant feedback
-- ---------------------------------------------------------------------------
ALTER TABLE fraud_transactions
  ADD COLUMN IF NOT EXISTS feedback_outcome TEXT
    CHECK (feedback_outcome IN ('confirmed_fraud', 'confirmed_legitimate')),
  ADD COLUMN IF NOT EXISTS feedback_at TIMESTAMPTZ;

-- ---------------------------------------------------------------------------
-- 2. upsert_fraud_entity_v2: atomic batch-aggregated increments + refund pattern
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION upsert_fraud_entity_v2(
  p_entity_type        TEXT,
  p_entity_value       TEXT,
  p_orders_delta       INTEGER,
  p_refund_claims_delta INTEGER,
  p_chargebacks_delta  INTEGER,
  p_flagged_delta      INTEGER,
  p_score_avg          NUMERIC,
  p_refund_timestamps  TEXT[],
  p_fastest_claim_days NUMERIC,
  p_refund_this_batch  BOOLEAN
) RETURNS VOID AS $$
DECLARE
  existing_orders     INTEGER;
  existing_score_avg  NUMERIC;
  existing_timestamps JSONB;
  combined_timestamps JSONB;
  ts_array NUMERIC[];
  i INTEGER;
  intervals NUMERIC[];
  avg_interval NUMERIC;
BEGIN
  IF p_entity_value IS NULL OR length(trim(p_entity_value)) = 0 THEN
    RETURN;
  END IF;

  -- 1. Insert-or-fetch existing aggregate state.
  INSERT INTO fraud_entities (
    entity_type, entity_value,
    total_orders, total_refund_claims, total_chargebacks,
    flagged_count, fraud_score_avg,
    refund_timestamps, fastest_claim_days,
    total_merchants_refunded_at,
    first_seen, last_seen
  )
  VALUES (
    p_entity_type, p_entity_value,
    p_orders_delta, p_refund_claims_delta, p_chargebacks_delta,
    p_flagged_delta, p_score_avg,
    COALESCE(to_jsonb(p_refund_timestamps), '[]'::jsonb),
    p_fastest_claim_days,
    CASE WHEN p_refund_this_batch THEN 1 ELSE 0 END,
    now(), now()
  )
  ON CONFLICT (entity_type, entity_value) DO UPDATE SET
    total_orders        = fraud_entities.total_orders + EXCLUDED.total_orders,
    total_refund_claims = fraud_entities.total_refund_claims + EXCLUDED.total_refund_claims,
    total_chargebacks   = fraud_entities.total_chargebacks + EXCLUDED.total_chargebacks,
    flagged_count       = fraud_entities.flagged_count + EXCLUDED.flagged_count,
    -- Running average weighted by previous order count.
    fraud_score_avg     = (
      fraud_entities.fraud_score_avg * fraud_entities.total_orders
      + EXCLUDED.fraud_score_avg * EXCLUDED.total_orders
    ) / NULLIF(fraud_entities.total_orders + EXCLUDED.total_orders, 0),
    refund_timestamps   = COALESCE(fraud_entities.refund_timestamps, '[]'::jsonb)
                          || COALESCE(EXCLUDED.refund_timestamps, '[]'::jsonb),
    fastest_claim_days  = LEAST(
                            COALESCE(fraud_entities.fastest_claim_days, 99999),
                            COALESCE(EXCLUDED.fastest_claim_days, 99999)
                          ),
    total_merchants_refunded_at =
      fraud_entities.total_merchants_refunded_at + EXCLUDED.total_merchants_refunded_at,
    last_seen = now();

  -- 2. Recompute refund_intervals_avg_days from the updated timestamp array.
  SELECT refund_timestamps INTO existing_timestamps
  FROM fraud_entities
  WHERE entity_type = p_entity_type AND entity_value = p_entity_value;

  IF existing_timestamps IS NULL OR jsonb_array_length(existing_timestamps) < 2 THEN
    RETURN;
  END IF;

  -- Convert jsonb array of ISO strings -> sorted numeric epoch array (ms).
  SELECT array_agg(extract(epoch FROM (val::text)::timestamptz) ORDER BY 1)
    INTO ts_array
  FROM jsonb_array_elements_text(existing_timestamps) AS val;

  IF ts_array IS NULL OR array_length(ts_array, 1) < 2 THEN
    RETURN;
  END IF;

  intervals := ARRAY[]::NUMERIC[];
  FOR i IN 2 .. array_length(ts_array, 1) LOOP
    intervals := intervals || ((ts_array[i] - ts_array[i - 1]) / 86400.0);
  END LOOP;

  IF array_length(intervals, 1) > 0 THEN
    SELECT avg(x) INTO avg_interval FROM unnest(intervals) AS x;
    UPDATE fraud_entities
       SET refund_intervals_avg_days = avg_interval
     WHERE entity_type = p_entity_type AND entity_value = p_entity_value;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION upsert_fraud_entity_v2 TO service_role;

-- ---------------------------------------------------------------------------
-- 3. upsert_co_occurrence: atomic pair-count increment
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION upsert_co_occurrence(
  p_a_type TEXT,
  p_a_value TEXT,
  p_b_type TEXT,
  p_b_value TEXT,
  p_count_delta INTEGER
) RETURNS VOID AS $$
BEGIN
  IF p_a_value IS NULL OR p_b_value IS NULL
     OR length(trim(p_a_value)) = 0 OR length(trim(p_b_value)) = 0 THEN
    RETURN;
  END IF;

  INSERT INTO fraud_entity_co_occurrences (
    entity_a_type, entity_a_value,
    entity_b_type, entity_b_value,
    co_occurrence_count, first_seen, last_seen
  ) VALUES (
    p_a_type, p_a_value,
    p_b_type, p_b_value,
    GREATEST(p_count_delta, 1), now(), now()
  )
  ON CONFLICT (entity_a_type, entity_a_value, entity_b_type, entity_b_value)
  DO UPDATE SET
    co_occurrence_count = fraud_entity_co_occurrences.co_occurrence_count + EXCLUDED.co_occurrence_count,
    last_seen = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION upsert_co_occurrence TO service_role;

-- ---------------------------------------------------------------------------
-- 4. signal_performance: adaptive learning state
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS signal_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_name TEXT NOT NULL,
  true_positive_count  INTEGER NOT NULL DEFAULT 0,
  false_positive_count INTEGER NOT NULL DEFAULT 0,
  true_negative_count  INTEGER NOT NULL DEFAULT 0,
  false_negative_count INTEGER NOT NULL DEFAULT 0,
  precision_score      NUMERIC,
  weight_adjustment    NUMERIC NOT NULL DEFAULT 0,
  last_updated         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT signal_performance_unique UNIQUE (signal_name)
);

ALTER TABLE signal_performance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "signal_performance_read_authenticated" ON signal_performance;
CREATE POLICY "signal_performance_read_authenticated" ON signal_performance
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "signal_performance_write_service" ON signal_performance;
CREATE POLICY "signal_performance_write_service" ON signal_performance
  FOR ALL TO service_role USING (true);

-- Seed one row per signal name (idempotent)
INSERT INTO signal_performance (signal_name) VALUES
  ('refundRate'),
  ('inrAbuse'),
  ('velocity'),
  ('emailPattern'),
  ('addressClustering'),
  ('valueAnomaly'),
  ('paymentChurn'),
  ('inrSpeed'),
  ('crossMerchant'),
  ('refundPattern')
ON CONFLICT (signal_name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 5. record_signal_feedback: handle one piece of merchant feedback
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION record_signal_feedback(
  p_transaction_id TEXT,
  p_outcome TEXT,
  p_fired TEXT[],
  p_all_signals TEXT[]
) RETURNS VOID AS $$
DECLARE
  sig TEXT;
  fired_set TEXT[] := COALESCE(p_fired, ARRAY[]::TEXT[]);
  is_fired BOOLEAN;
  is_fraud BOOLEAN := (p_outcome = 'confirmed_fraud');
BEGIN
  -- Record on the transaction (best-effort: fraud_transactions.order_id is unique only per job_id,
  -- so we update every row matching the given order_id).
  UPDATE fraud_transactions
     SET feedback_outcome = p_outcome,
         feedback_at = now()
   WHERE order_id = p_transaction_id;

  -- For each signal name, increment the appropriate counter.
  FOREACH sig IN ARRAY p_all_signals LOOP
    is_fired := sig = ANY(fired_set);

    INSERT INTO signal_performance (signal_name) VALUES (sig)
      ON CONFLICT (signal_name) DO NOTHING;

    UPDATE signal_performance
       SET true_positive_count  = true_positive_count
         + CASE WHEN is_fraud  AND is_fired THEN 1 ELSE 0 END,
           false_positive_count = false_positive_count
         + CASE WHEN NOT is_fraud AND is_fired THEN 1 ELSE 0 END,
           true_negative_count  = true_negative_count
         + CASE WHEN NOT is_fraud AND NOT is_fired THEN 1 ELSE 0 END,
           false_negative_count = false_negative_count
         + CASE WHEN is_fraud  AND NOT is_fired THEN 1 ELSE 0 END,
           last_updated = now()
     WHERE signal_name = sig;

    -- Recalculate precision and adjustment
    UPDATE signal_performance
       SET precision_score = CASE
             WHEN (true_positive_count + false_positive_count) = 0 THEN NULL
             ELSE true_positive_count::NUMERIC
                  / (true_positive_count + false_positive_count)
           END,
           weight_adjustment = CASE
             WHEN (true_positive_count + false_positive_count) = 0 THEN 0
             WHEN true_positive_count::NUMERIC
                  / (true_positive_count + false_positive_count) < 0.5 THEN -0.1
             WHEN true_positive_count::NUMERIC
                  / (true_positive_count + false_positive_count) > 0.8 THEN  0.1
             ELSE 0
           END
     WHERE signal_name = sig;

    -- Clamp weight_adjustment to [-1, 1] so the multiplier (1+adj) stays in [0, 2].
    UPDATE signal_performance
       SET weight_adjustment = LEAST(1, GREATEST(-1, weight_adjustment))
     WHERE signal_name = sig;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION record_signal_feedback TO service_role;
GRANT EXECUTE ON FUNCTION record_signal_feedback TO authenticated;

-- ---------------------------------------------------------------------------
-- 6. seed_fraud_intelligence: one-shot Phase-5 backfill
--    Aggregates every existing fraud_transactions row into fraud_entities and
--    rebuilds fraud_identity_clusters from pairs sharing >=2 of {ip, address,
--    card_last4}. Safe to re-run.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION seed_fraud_intelligence()
RETURNS TABLE (
  emails_seeded     INTEGER,
  ips_seeded        INTEGER,
  addresses_seeded  INTEGER,
  cards_seeded      INTEGER,
  clusters_created  INTEGER
) AS $$
DECLARE
  v_emails INT := 0;
  v_ips INT := 0;
  v_addrs INT := 0;
  v_cards INT := 0;
  v_clusters INT := 0;
BEGIN
  ---------------------------------------------------------------------------
  -- Wipe and rebuild fraud_entities + fraud_identity_clusters from scratch
  -- so the seed is deterministic and idempotent. Existing rows had wrong
  -- counts (Bucket C), so we cannot trust them.
  ---------------------------------------------------------------------------
  DELETE FROM fraud_identity_clusters;
  DELETE FROM fraud_entities;
  DELETE FROM fraud_entity_co_occurrences;

  ---------------------------------------------------------------------------
  -- 6a. fraud_entities: one row per (entity_type, normalised_value)
  --
  -- Normalisation in SQL must MIRROR lib/identity/normalise.ts.
  ---------------------------------------------------------------------------
  -- Email entities
  WITH src AS (
    SELECT
      lower(trim(customer_email)) AS norm_email,
      job_id,
      refund_claimed,
      fraud_score,
      risk_level,
      account_created_at, -- unused
      delivery_status,
      refund_reason,
      device_ip,
      shipping_address,
      card_last4,
      processed_at,
      order_id
    FROM fraud_transactions
    WHERE customer_email IS NOT NULL AND length(trim(customer_email)) > 0
  ),
  agg AS (
    SELECT
      norm_email,
      count(*) AS total_orders,
      count(*) FILTER (WHERE refund_claimed) AS total_refund_claims,
      count(*) FILTER (WHERE risk_level IN ('high','critical')) AS flagged_count,
      avg(fraud_score) AS fraud_score_avg,
      min(processed_at) AS first_seen,
      max(processed_at) AS last_seen,
      count(DISTINCT job_id) FILTER (WHERE refund_claimed) AS total_merchants_refunded_at,
      count(DISTINCT job_id) AS total_merchants
    FROM src
    GROUP BY norm_email
  ),
  refund_ts AS (
    -- One row per email, with array of refund-claim creation timestamps as JSONB.
    SELECT
      norm_email,
      jsonb_agg(to_jsonb(processed_at) ORDER BY processed_at) AS refund_timestamps,
      min(processed_at) AS first_refund_at
    FROM src
    WHERE refund_claimed
    GROUP BY norm_email
  ),
  inserted AS (
    INSERT INTO fraud_entities (
      entity_type, entity_value,
      total_orders, total_refund_claims, total_chargebacks,
      flagged_count, fraud_score_avg, total_merchants,
      total_merchants_refunded_at,
      refund_timestamps, fastest_claim_days,
      first_seen, last_seen
    )
    SELECT
      'email', a.norm_email,
      a.total_orders, a.total_refund_claims, 0,
      a.flagged_count, a.fraud_score_avg, a.total_merchants,
      a.total_merchants_refunded_at,
      COALESCE(r.refund_timestamps, '[]'::jsonb),
      NULL, -- fastest_claim_days: order/refund date pair not retained on fraud_transactions
      a.first_seen, a.last_seen
    FROM agg a
    LEFT JOIN refund_ts r USING (norm_email)
    RETURNING 1
  )
  SELECT count(*) INTO v_emails FROM inserted;

  -- Refund interval averages for emails (from JSONB timestamp arrays)
  UPDATE fraud_entities AS f
     SET refund_intervals_avg_days = sub.avg_days
    FROM (
      SELECT
        entity_value,
        avg(diff_days) AS avg_days
      FROM (
        SELECT
          entity_value,
          extract(epoch FROM (
            (lead((val)::text::timestamptz) OVER (PARTITION BY entity_value ORDER BY (val)::text::timestamptz))
            - (val)::text::timestamptz
          )) / 86400.0 AS diff_days
        FROM fraud_entities,
             LATERAL jsonb_array_elements_text(refund_timestamps) AS val
        WHERE entity_type = 'email'
          AND jsonb_array_length(refund_timestamps) >= 2
      ) intervals
      WHERE diff_days IS NOT NULL
      GROUP BY entity_value
    ) sub
   WHERE f.entity_type = 'email'
     AND f.entity_value = sub.entity_value;

  -- IP entities
  WITH agg AS (
    SELECT
      trim(device_ip) AS norm_ip,
      count(*) AS total_orders,
      count(*) FILTER (WHERE refund_claimed) AS total_refund_claims,
      count(*) FILTER (WHERE risk_level IN ('high','critical')) AS flagged_count,
      avg(fraud_score) AS fraud_score_avg,
      min(processed_at) AS first_seen,
      max(processed_at) AS last_seen,
      count(DISTINCT job_id) FILTER (WHERE refund_claimed) AS total_merchants_refunded_at,
      count(DISTINCT job_id) AS total_merchants
    FROM fraud_transactions
    WHERE device_ip IS NOT NULL AND length(trim(device_ip)) > 0
    GROUP BY trim(device_ip)
  ),
  inserted AS (
    INSERT INTO fraud_entities (
      entity_type, entity_value,
      total_orders, total_refund_claims, total_chargebacks,
      flagged_count, fraud_score_avg, total_merchants,
      total_merchants_refunded_at,
      first_seen, last_seen
    )
    SELECT
      'ip', norm_ip,
      total_orders, total_refund_claims, 0,
      flagged_count, fraud_score_avg, total_merchants,
      total_merchants_refunded_at,
      first_seen, last_seen
    FROM agg
    RETURNING 1
  )
  SELECT count(*) INTO v_ips FROM inserted;

  -- Address entities (apply canonical address normalisation in SQL).
  WITH agg AS (
    SELECT
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              regexp_replace(
                regexp_replace(lower(shipping_address), '[^[:alnum:][:space:]]', ' ', 'g'),
              '\s+', ' ', 'g'),
            '\m(apartment|apt)\M', 'apt', 'g'),
          '\m(street|st)\M', 'st', 'g'),
        '\m(road|rd)\M', 'rd', 'g'),
      '^\s+|\s+$', '', 'g') AS norm_addr,
      job_id, refund_claimed, fraud_score, risk_level, processed_at
    FROM fraud_transactions
    WHERE shipping_address IS NOT NULL AND length(trim(shipping_address)) > 0
  ),
  agg2 AS (
    SELECT
      norm_addr,
      count(*) AS total_orders,
      count(*) FILTER (WHERE refund_claimed) AS total_refund_claims,
      count(*) FILTER (WHERE risk_level IN ('high','critical')) AS flagged_count,
      avg(fraud_score) AS fraud_score_avg,
      min(processed_at) AS first_seen,
      max(processed_at) AS last_seen,
      count(DISTINCT job_id) FILTER (WHERE refund_claimed) AS total_merchants_refunded_at,
      count(DISTINCT job_id) AS total_merchants
    FROM agg
    GROUP BY norm_addr
  ),
  inserted AS (
    INSERT INTO fraud_entities (
      entity_type, entity_value,
      total_orders, total_refund_claims, total_chargebacks,
      flagged_count, fraud_score_avg, total_merchants,
      total_merchants_refunded_at,
      first_seen, last_seen
    )
    SELECT
      'address', norm_addr,
      total_orders, total_refund_claims, 0,
      flagged_count, fraud_score_avg, total_merchants,
      total_merchants_refunded_at,
      first_seen, last_seen
    FROM agg2
    WHERE length(norm_addr) > 0
    RETURNING 1
  )
  SELECT count(*) INTO v_addrs FROM inserted;

  -- Card last4 entities (digits only, last 4)
  WITH agg AS (
    SELECT
      right(regexp_replace(card_last4, '\D', '', 'g'), 4) AS norm_card,
      count(*) AS total_orders,
      count(*) FILTER (WHERE refund_claimed) AS total_refund_claims,
      count(*) FILTER (WHERE risk_level IN ('high','critical')) AS flagged_count,
      avg(fraud_score) AS fraud_score_avg,
      min(processed_at) AS first_seen,
      max(processed_at) AS last_seen,
      count(DISTINCT job_id) FILTER (WHERE refund_claimed) AS total_merchants_refunded_at,
      count(DISTINCT job_id) AS total_merchants
    FROM fraud_transactions
    WHERE card_last4 IS NOT NULL
      AND length(regexp_replace(card_last4, '\D', '', 'g')) >= 4
    GROUP BY right(regexp_replace(card_last4, '\D', '', 'g'), 4)
  ),
  inserted AS (
    INSERT INTO fraud_entities (
      entity_type, entity_value,
      total_orders, total_refund_claims, total_chargebacks,
      flagged_count, fraud_score_avg, total_merchants,
      total_merchants_refunded_at,
      first_seen, last_seen
    )
    SELECT
      'card_last4', norm_card,
      total_orders, total_refund_claims, 0,
      flagged_count, fraud_score_avg, total_merchants,
      total_merchants_refunded_at,
      first_seen, last_seen
    FROM agg
    RETURNING 1
  )
  SELECT count(*) INTO v_cards FROM inserted;

  ---------------------------------------------------------------------------
  -- 6b. fraud_entity_co_occurrences from existing transactions
  ---------------------------------------------------------------------------
  WITH norm AS (
    SELECT
      lower(trim(customer_email)) AS email,
      trim(device_ip) AS ip,
      regexp_replace(regexp_replace(lower(shipping_address), '[^[:alnum:][:space:]]', ' ', 'g'), '\s+', ' ', 'g') AS address,
      right(regexp_replace(coalesce(card_last4,''), '\D', '', 'g'), 4) AS card
    FROM fraud_transactions
  ),
  pairs AS (
    SELECT 'email' AS at, email AS av, 'ip' AS bt, ip AS bv FROM norm WHERE email <> '' AND ip <> ''
    UNION ALL
    SELECT 'email', email, 'address', address FROM norm WHERE email <> '' AND address <> ''
    UNION ALL
    SELECT 'email', email, 'card_last4', card FROM norm WHERE email <> '' AND length(card) = 4
    UNION ALL
    SELECT 'ip', ip, 'address', address FROM norm WHERE ip <> '' AND address <> ''
    UNION ALL
    SELECT 'ip', ip, 'card_last4', card FROM norm WHERE ip <> '' AND length(card) = 4
    UNION ALL
    SELECT 'address', address, 'card_last4', card FROM norm WHERE address <> '' AND length(card) = 4
  ),
  ordered AS (
    -- Sort each pair so (a,b) with a<b is canonical, mirroring writeCoOccurrences().
    SELECT
      CASE WHEN at || ':' || av < bt || ':' || bv THEN at ELSE bt END AS at,
      CASE WHEN at || ':' || av < bt || ':' || bv THEN av ELSE bv END AS av,
      CASE WHEN at || ':' || av < bt || ':' || bv THEN bt ELSE at END AS bt,
      CASE WHEN at || ':' || av < bt || ':' || bv THEN bv ELSE av END AS bv
    FROM pairs
  )
  INSERT INTO fraud_entity_co_occurrences (
    entity_a_type, entity_a_value, entity_b_type, entity_b_value, co_occurrence_count
  )
  SELECT at, av, bt, bv, count(*)
  FROM ordered
  GROUP BY at, av, bt, bv
  ON CONFLICT (entity_a_type, entity_a_value, entity_b_type, entity_b_value) DO UPDATE
    SET co_occurrence_count = EXCLUDED.co_occurrence_count;

  ---------------------------------------------------------------------------
  -- 6c. fraud_identity_clusters: pairs of orders sharing >=2 of {ip,address,card}
  ---------------------------------------------------------------------------
  WITH norm AS (
    SELECT
      order_id,
      lower(trim(customer_email)) AS email,
      trim(device_ip) AS ip,
      regexp_replace(regexp_replace(lower(shipping_address), '[^[:alnum:][:space:]]', ' ', 'g'), '\s+', ' ', 'g') AS address,
      right(regexp_replace(coalesce(card_last4,''), '\D', '', 'g'), 4) AS card,
      processed_at
    FROM fraud_transactions
  ),
  pairs AS (
    SELECT
      a.order_id AS a_order, b.order_id AS b_order,
      a.email AS a_email, b.email AS b_email,
      a.ip AS ip,
      a.address AS address,
      a.card AS card,
      ((a.ip <> '' AND a.ip = b.ip)::int +
       (a.address <> '' AND a.address = b.address)::int +
       (length(a.card) = 4 AND a.card = b.card)::int) AS shared_count,
      LEAST(a.processed_at, b.processed_at) AS first_seen,
      GREATEST(a.processed_at, b.processed_at) AS last_seen
    FROM norm a
    JOIN norm b
      ON a.order_id < b.order_id
     AND a.email <> b.email
     AND (
       (a.ip <> '' AND a.ip = b.ip)
       OR (a.address <> '' AND a.address = b.address)
       OR (length(a.card) = 4 AND a.card = b.card)
     )
  ),
  qualifying AS (
    SELECT * FROM pairs WHERE shared_count >= 2
  ),
  -- One cluster_id per connected pair-set (use min(a_email) as deterministic anchor)
  cluster_assignments AS (
    SELECT
      gen_random_uuid() AS cluster_id,
      a_email,
      b_email,
      ip,
      address,
      card,
      shared_count,
      first_seen,
      last_seen
    FROM qualifying
  ),
  cluster_rows AS (
    -- Each cluster gets one row per related entity (the linking attributes
    -- plus both emails). Confidence scales with how many attributes match.
    SELECT cluster_id, 'email' AS entity_type, a_email AS entity_value,
           CASE shared_count WHEN 3 THEN 95 WHEN 2 THEN 85 ELSE 70 END AS confidence,
           jsonb_build_array(
             'Linked to another email via '
             || shared_count || ' shared identity attributes (ip/address/card)'
           ) AS match_reasons,
           first_seen, last_seen
    FROM cluster_assignments
    UNION ALL
    SELECT cluster_id, 'email', b_email,
           CASE shared_count WHEN 3 THEN 95 WHEN 2 THEN 85 ELSE 70 END,
           jsonb_build_array(
             'Linked to another email via '
             || shared_count || ' shared identity attributes (ip/address/card)'
           ),
           first_seen, last_seen
    FROM cluster_assignments
    UNION ALL
    SELECT cluster_id, 'ip', ip,
           CASE shared_count WHEN 3 THEN 95 WHEN 2 THEN 85 ELSE 70 END,
           jsonb_build_array('Shared IP address across multiple emails'),
           first_seen, last_seen
    FROM cluster_assignments WHERE ip <> ''
    UNION ALL
    SELECT cluster_id, 'address', address,
           CASE shared_count WHEN 3 THEN 95 WHEN 2 THEN 85 ELSE 70 END,
           jsonb_build_array('Shared shipping address across multiple emails'),
           first_seen, last_seen
    FROM cluster_assignments WHERE address <> ''
    UNION ALL
    SELECT cluster_id, 'card_last4', card,
           CASE shared_count WHEN 3 THEN 95 WHEN 2 THEN 85 ELSE 70 END,
           jsonb_build_array('Shared payment card across multiple emails'),
           first_seen, last_seen
    FROM cluster_assignments WHERE length(card) = 4
  ),
  inserted_clusters AS (
    INSERT INTO fraud_identity_clusters (
      cluster_id, entity_type, entity_value, confidence, match_reasons, first_seen, last_seen
    )
    SELECT cluster_id, entity_type, entity_value, confidence, match_reasons, first_seen, last_seen
    FROM cluster_rows
    ON CONFLICT (cluster_id, entity_type, entity_value) DO NOTHING
    RETURNING 1
  )
  SELECT count(*) INTO v_clusters FROM inserted_clusters;

  RETURN QUERY SELECT v_emails, v_ips, v_addrs, v_cards, v_clusters;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION seed_fraud_intelligence TO service_role;
-- ===========================================================================
-- 0012_customer_profiles.sql
-- ---------------------------------------------------------------------------
-- Entity Resolution: Living Customer Profiles
--
-- Two new tables:
--   1. customer_profiles         — one row per unique customer entity
--   2. customer_profile_audit_appearances — links profiles to audit appearances
--
-- Plus GIN indexes on JSONB identity arrays for fast lookups.
-- ===========================================================================

-- =========================================================
-- customer_profiles
-- =========================================================
CREATE TABLE customer_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity anchors
  primary_email text,
  emails jsonb NOT NULL DEFAULT '[]'::jsonb,
  ips jsonb NOT NULL DEFAULT '[]'::jsonb,
  addresses jsonb NOT NULL DEFAULT '[]'::jsonb,
  card_last4s jsonb NOT NULL DEFAULT '[]'::jsonb,
  phones jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Name history
  names jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Risk intelligence
  risk_score numeric NOT NULL DEFAULT 0,
  risk_level text NOT NULL DEFAULT 'low'
    CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  fraud_flags jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Behaviour history
  total_orders int NOT NULL DEFAULT 0,
  total_refund_claims int NOT NULL DEFAULT 0,
  total_chargebacks int NOT NULL DEFAULT 0,
  total_merchants_seen_at int NOT NULL DEFAULT 1,
  refund_rate numeric NOT NULL DEFAULT 0,

  -- Timing intelligence
  refund_timestamps jsonb NOT NULL DEFAULT '[]'::jsonb,
  fastest_claim_days numeric,
  avg_claim_days numeric,
  refund_acceleration_score numeric NOT NULL DEFAULT 0,

  -- Cross merchant
  merchant_ids jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Meta
  first_seen timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now(),
  last_audit_id uuid,
  profile_confidence numeric NOT NULL DEFAULT 100,
  manually_reviewed boolean NOT NULL DEFAULT false,
  merchant_notes text,
  on_watchlist boolean NOT NULL DEFAULT false
);

-- =========================================================
-- customer_profile_audit_appearances
-- =========================================================
CREATE TABLE customer_profile_audit_appearances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
  audit_id uuid NOT NULL REFERENCES processing_jobs(id) ON DELETE CASCADE,
  transaction_id uuid REFERENCES fraud_transactions(id) ON DELETE SET NULL,
  score_at_time numeric NOT NULL DEFAULT 0,
  flags_at_time jsonb NOT NULL DEFAULT '[]'::jsonb,
  appeared_at timestamptz NOT NULL DEFAULT now()
);

-- =========================================================
-- Indexes
-- =========================================================

-- B-tree indexes for common lookups
CREATE INDEX idx_customer_profiles_primary_email ON customer_profiles(primary_email);
CREATE INDEX idx_customer_profiles_risk_level ON customer_profiles(risk_level);
CREATE INDEX idx_customer_profiles_on_watchlist ON customer_profiles(on_watchlist) WHERE on_watchlist = true;
CREATE INDEX idx_customer_profiles_last_seen ON customer_profiles(last_seen DESC);

-- GIN indexes on JSONB arrays — critical for entity resolution lookups
CREATE INDEX idx_customer_profiles_emails ON customer_profiles USING gin(emails jsonb_path_ops);
CREATE INDEX idx_customer_profiles_ips ON customer_profiles USING gin(ips jsonb_path_ops);
CREATE INDEX idx_customer_profiles_addresses ON customer_profiles USING gin(addresses jsonb_path_ops);
CREATE INDEX idx_customer_profiles_card_last4s ON customer_profiles USING gin(card_last4s jsonb_path_ops);

-- Appearance table indexes
CREATE INDEX idx_cp_appearances_profile ON customer_profile_audit_appearances(profile_id);
CREATE INDEX idx_cp_appearances_audit ON customer_profile_audit_appearances(audit_id);
CREATE INDEX idx_cp_appearances_transaction ON customer_profile_audit_appearances(transaction_id);

-- =========================================================
-- RLS: Service role writes, authenticated reads
-- =========================================================
ALTER TABLE customer_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customer_profiles_read_authenticated" ON customer_profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "customer_profiles_write_service" ON customer_profiles
  FOR ALL TO service_role USING (true);

ALTER TABLE customer_profile_audit_appearances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cp_appearances_read_authenticated" ON customer_profile_audit_appearances
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "cp_appearances_write_service" ON customer_profile_audit_appearances
  FOR ALL TO service_role USING (true);
-- Add is_demo flag to processing_jobs so demo runs can be identified
ALTER TABLE processing_jobs
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN processing_jobs.is_demo IS 'True when this run was seeded by the demo button, not a real merchant upload.';
-- Store the column mapping submitted by the merchant at upload time
ALTER TABLE csv_upload_queue
  ADD COLUMN IF NOT EXISTS column_map JSONB;

COMMENT ON COLUMN csv_upload_queue.column_map IS 'Maps internal field names to the actual CSV header names supplied by the merchant.';
CREATE TABLE IF NOT EXISTS watchlist_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_profile_id UUID REFERENCES customer_profiles(id) ON DELETE CASCADE,
  email_hash TEXT,
  display_name TEXT,
  display_email TEXT,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_risk TEXT,
  last_seen_at TIMESTAMPTZ,
  UNIQUE (merchant_id, customer_profile_id),
  UNIQUE (merchant_id, email_hash)
);

CREATE INDEX IF NOT EXISTS watchlist_entries_merchant_added ON watchlist_entries(merchant_id, added_at DESC);

ALTER TABLE watchlist_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "merchant reads own watchlist" ON watchlist_entries
  FOR SELECT USING (merchant_id = auth.uid());

CREATE POLICY "merchant writes own watchlist" ON watchlist_entries
  FOR ALL USING (merchant_id = auth.uid()) WITH CHECK (merchant_id = auth.uid());
CREATE TABLE IF NOT EXISTS customer_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_profile_id UUID REFERENCES customer_profiles(id) ON DELETE CASCADE,
  email_hash TEXT,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS customer_notes_merchant_profile ON customer_notes(merchant_id, customer_profile_id, created_at DESC);

ALTER TABLE customer_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "merchant rw own notes" ON customer_notes
  FOR ALL USING (merchant_id = auth.uid()) WITH CHECK (merchant_id = auth.uid());
-- ===========================================================================
-- 0017_security_hardening.sql
-- ---------------------------------------------------------------------------
-- Closes three critical data-isolation gaps and adds the live-lookup RPC.
--
-- GAP 1: fraud_transactions
--   Old policy: FOR ALL USING (auth.uid() IS NOT NULL)
--   → any authenticated merchant could read every other merchant's rows
--   Fix: scope to the merchant's own processing_jobs
--
-- GAP 2: customer_profiles
--   Old policy: FOR SELECT TO authenticated USING (true)
--   → all authenticated merchants could read raw PII from all merchants
--   Fix: only see profiles where YOUR merchant_id is in merchant_ids[]
--        Cross-merchant lookup goes through search_customer_profiles() RPC
--        (SECURITY DEFINER, service_role only) with PII masking in the API
--        layer.
--
-- GAP 3: customer_profile_audit_appearances
--   Old policy: FOR SELECT TO authenticated USING (true)
--   Fix: scoped to profiles the merchant contributed to (mirrors gap 2)
--
-- RPC: search_customer_profiles()
--   SECURITY DEFINER function grants the API layer (service role) the ability
--   to search all profiles for the live-lookup feature while keeping the RLS
--   restrictions in place for all direct table access.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. fraud_transactions
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "fraud_transactions_all_authenticated" ON fraud_transactions;

CREATE POLICY "fraud_transactions_write_service" ON fraud_transactions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "fraud_transactions_select_own" ON fraud_transactions
  FOR SELECT TO authenticated USING (
    job_id IN (
      SELECT id FROM processing_jobs WHERE merchant_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 2. customer_profiles
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "customer_profiles_read_authenticated" ON customer_profiles;

CREATE POLICY "customer_profiles_select_own" ON customer_profiles
  FOR SELECT TO authenticated USING (
    merchant_ids @> jsonb_build_array(auth.uid()::text)
  );

-- ---------------------------------------------------------------------------
-- 3. customer_profile_audit_appearances
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "cp_appearances_read_authenticated" ON customer_profile_audit_appearances;

CREATE POLICY "cp_appearances_select_own" ON customer_profile_audit_appearances
  FOR SELECT TO authenticated USING (
    profile_id IN (
      SELECT id FROM customer_profiles
      WHERE merchant_ids @> jsonb_build_array(auth.uid()::text)
    )
  );

-- ---------------------------------------------------------------------------
-- 4. search_customer_profiles() — SECURITY DEFINER RPC for live lookup
--
--    Accepts normalised search terms (all optional, at least one required).
--    Returns full customer_profiles rows — the API route applies PII masking
--    based on whether the calling merchant contributed to each profile.
--
--    Access: service_role ONLY (called from /api/lookup which enforces auth).
--    Clients cannot call this function directly.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION search_customer_profiles(
  p_email   TEXT DEFAULT NULL,
  p_name    TEXT DEFAULT NULL,
  p_address TEXT DEFAULT NULL,
  p_card    TEXT DEFAULT NULL,
  p_ip      TEXT DEFAULT NULL
)
RETURNS SETOF customer_profiles
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT DISTINCT cp.*
  FROM customer_profiles cp
  WHERE
    (p_email   IS NOT NULL AND cp.emails      @> to_jsonb(p_email))
    OR (p_card  IS NOT NULL AND cp.card_last4s @> to_jsonb(p_card))
    OR (p_ip    IS NOT NULL AND cp.ips         @> to_jsonb(p_ip))
    OR (p_address IS NOT NULL AND cp.addresses @> to_jsonb(p_address))
    OR (p_name  IS NOT NULL AND cp.names::text ILIKE '%' || p_name || '%')
  ORDER BY cp.risk_score DESC
  LIMIT 25;
$$;

REVOKE ALL ON FUNCTION search_customer_profiles FROM PUBLIC;
GRANT EXECUTE ON FUNCTION search_customer_profiles TO service_role;
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
nn-- ===========================================================================
-- 0020_processing_jobs_unify.sql
-- ---------------------------------------------------------------------------
-- Unifies the dual schema so processing_jobs becomes the single source of
-- truth for both real uploads and demo data. Adds the columns that audit_runs
-- has but processing_jobs was missing.
-- ===========================================================================

ALTER TABLE processing_jobs
  ADD COLUMN IF NOT EXISTS filename TEXT NOT NULL DEFAULT 'unknown.csv';

ALTER TABLE processing_jobs
  ALTER COLUMN filename DROP DEFAULT;

ALTER TABLE processing_jobs
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

ALTER TABLE processing_jobs
  ADD COLUMN IF NOT EXISTS hidden_by_merchant BOOLEAN NOT NULL DEFAULT false;

-- Index for dashboard / history queries
CREATE INDEX IF NOT EXISTS idx_processing_jobs_merchant_created
  ON processing_jobs(merchant_id, created_at DESC)
  WHERE hidden_by_merchant = false;

-- ===========================================================================
-- 0021_lookup_hardening.sql
-- ---------------------------------------------------------------------------
-- 1. Rate-limiting table for /api/lookup
-- 2. K-anonymity enforcement on search_customer_profiles RPC
-- 3. Batch customer-profile search for the scoring engine
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Lookup rate-limiting table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lookup_daily_counts (
  merchant_id UUID NOT NULL,
  lookup_date DATE NOT NULL DEFAULT CURRENT_DATE,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (merchant_id, lookup_date)
);

ALTER TABLE lookup_daily_counts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lookup_counts_own" ON lookup_daily_counts
  FOR ALL USING (merchant_id = auth.uid()) WITH CHECK (merchant_id = auth.uid());

GRANT ALL ON lookup_daily_counts TO service_role;

-- ---------------------------------------------------------------------------
-- 2. K-anonymity enforcement on search_customer_profiles
--    Profiles with fewer than 3 merchants are dropped unless the caller
--    contributed to that profile (i.e., they are one of the 1-2 merchants).
--    SECURITY DEFINER so the API layer can enforce this before PII masking.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS search_customer_profiles(text,text,text,text,text);
CREATE OR REPLACE FUNCTION search_customer_profiles(
  p_email   TEXT DEFAULT NULL,
  p_name    TEXT DEFAULT NULL,
  p_address TEXT DEFAULT NULL,
  p_card    TEXT DEFAULT NULL,
  p_ip      TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  primary_email TEXT,
  emails JSONB,
  ips JSONB,
  addresses JSONB,
  card_last4s JSONB,
  phones JSONB,
  names JSONB,
  risk_score NUMERIC,
  risk_level TEXT,
  fraud_flags JSONB,
  total_orders INTEGER,
  total_refund_claims INTEGER,
  total_chargebacks INTEGER,
  total_merchants_seen_at INTEGER,
  refund_rate NUMERIC,
  refund_timestamps JSONB,
  fastest_claim_days NUMERIC,
  avg_claim_days NUMERIC,
  refund_acceleration_score NUMERIC,
  merchant_ids JSONB,
  first_seen TIMESTAMPTZ,
  last_seen TIMESTAMPTZ,
  last_audit_id UUID,
  profile_confidence NUMERIC,
  manually_reviewed BOOLEAN,
  merchant_notes TEXT,
  on_watchlist BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    cp.id,
    cp.primary_email,
    cp.emails,
    cp.ips,
    cp.addresses,
    cp.card_last4s,
    cp.phones,
    cp.names,
    cp.risk_score,
    cp.risk_level,
    cp.fraud_flags,
    cp.total_orders,
    cp.total_refund_claims,
    cp.total_chargebacks,
    cp.total_merchants_seen_at,
    cp.refund_rate,
    cp.refund_timestamps,
    cp.fastest_claim_days,
    cp.avg_claim_days,
    cp.refund_acceleration_score,
    cp.merchant_ids,
    cp.first_seen,
    cp.last_seen,
    cp.last_audit_id,
    cp.profile_confidence,
    cp.manually_reviewed,
    cp.merchant_notes,
    cp.on_watchlist
  FROM customer_profiles cp
  WHERE
    (
      (p_email   IS NOT NULL AND cp.emails      @> to_jsonb(p_email))
      OR (p_card  IS NOT NULL AND cp.card_last4s @> to_jsonb(p_card))
      OR (p_ip    IS NOT NULL AND cp.ips         @> to_jsonb(p_ip))
      OR (p_address IS NOT NULL AND cp.addresses @> to_jsonb(p_address))
      OR (p_name  IS NOT NULL AND cp.names::text ILIKE '%' || p_name || '%')
    )
    -- K-anonymity: only return profiles seen at 3+ merchants.
    -- Profiles with 1-2 merchants are too easy to enumerate.
    AND cp.total_merchants_seen_at >= 3
  ORDER BY cp.risk_score DESC
  LIMIT 25;
$$;

REVOKE ALL ON FUNCTION search_customer_profiles FROM PUBLIC;
GRANT EXECUTE ON FUNCTION search_customer_profiles TO service_role;

-- ---------------------------------------------------------------------------
-- 3. Batch customer-profile search for the scoring engine
--    SECURITY DEFINER — called from worker.ts service client only.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS search_customer_profiles_batch(text[],text[],text[]);
CREATE OR REPLACE FUNCTION search_customer_profiles_batch(
  p_emails TEXT[] DEFAULT NULL,
  p_cards  TEXT[] DEFAULT NULL,
  p_ips    TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  primary_email TEXT,
  emails JSONB,
  ips JSONB,
  addresses JSONB,
  card_last4s JSONB,
  names JSONB,
  risk_score NUMERIC,
  risk_level TEXT,
  fraud_flags JSONB,
  total_orders INTEGER,
  total_refund_claims INTEGER,
  total_merchants_seen_at INTEGER,
  refund_rate NUMERIC,
  merchant_ids JSONB
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    cp.id,
    cp.primary_email,
    cp.emails,
    cp.ips,
    cp.addresses,
    cp.card_last4s,
    cp.names,
    cp.risk_score,
    cp.risk_level,
    cp.fraud_flags,
    cp.total_orders,
    cp.total_refund_claims,
    cp.total_merchants_seen_at,
    cp.refund_rate,
    cp.merchant_ids
  FROM customer_profiles cp
  WHERE
    (p_emails IS NOT NULL AND cp.emails ?| p_emails)
    OR (p_cards  IS NOT NULL AND cp.card_last4s ?| p_cards)
    OR (p_ips    IS NOT NULL AND cp.ips ?| p_ips);
$$;

REVOKE ALL ON FUNCTION search_customer_profiles_batch FROM PUBLIC;
GRANT EXECUTE ON FUNCTION search_customer_profiles_batch TO service_role;
-- Atomic job progress increment to fix the race condition in worker.ts.
-- The previous implementation used a read-modify-write pattern (SELECT then UPDATE)
-- which under 5× batch concurrency caused processed/failed row counts to be lost
-- to lost-update races. This RPC uses a single atomic UPDATE instead.
create or replace function increment_job_progress(
  p_job_id  uuid,
  p_processed_delta int,
  p_failed_delta    int
) returns void
language plpgsql
security definer
as $$
begin
  update processing_jobs
  set
    processed_rows = processed_rows + p_processed_delta,
    failed_rows    = failed_rows    + p_failed_delta,
    updated_at     = now()
  where id = p_job_id;
end;
$$;

-- Atomic lookup daily count upsert to fix the TOCTOU race in /api/lookup.
-- Two concurrent requests previously both read count < 100, both passed, both
-- incremented separately — limit was bypassable. This function performs a single
-- atomic upsert so the returned count is always the authoritative post-increment value.
create or replace function increment_lookup_count(
  p_merchant_id uuid,
  p_date        date
) returns int
language plpgsql
security definer
as $$
declare
  v_count int;
begin
  insert into lookup_daily_counts (merchant_id, lookup_date, count)
  values (p_merchant_id, p_date, 1)
  on conflict (merchant_id, lookup_date)
  do update set count = lookup_daily_counts.count + 1
  returning count into v_count;

  return v_count;
end;
$$;
-- ===========================================================================
-- 0023_bulk_write_rpcs.sql
-- ---------------------------------------------------------------------------
-- Performance: replace thousands of individual RPC round-trips with single
-- bulk operations.
--
--   * increment_job_progress        – fix missing function from 0022 (idempotent)
--   * bulk_upsert_fraud_entities    – all entity counters in ONE SQL statement
--   * bulk_upsert_co_occurrences    – all co-occurrence pairs in ONE SQL statement
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. increment_job_progress (idempotent re-create so 0022 non-apply is safe)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION increment_job_progress(
  p_job_id          uuid,
  p_processed_delta int,
  p_failed_delta    int
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE processing_jobs
  SET
    processed_rows = processed_rows + p_processed_delta,
    failed_rows    = failed_rows    + p_failed_delta,
    updated_at     = now()
  WHERE id = p_job_id;
END;
$$;

GRANT EXECUTE ON FUNCTION increment_job_progress TO service_role;

-- ---------------------------------------------------------------------------
-- 2. bulk_upsert_fraud_entities
--
-- Accepts a JSONB array. Each element must have:
--   entity_type            TEXT  ('email'|'ip'|'address'|'card_last4')
--   entity_value           TEXT
--   orders_delta           INT
--   refund_claims_delta    INT
--   chargebacks_delta      INT
--   flagged_delta          INT
--   score_avg              NUMERIC
--   refund_timestamps      TEXT[]  (ISO strings, may be empty)
--   fastest_claim_days     NUMERIC (nullable)
--   refund_this_batch      BOOLEAN
--
-- All work is done in a SINGLE INSERT … ON CONFLICT statement so the entire
-- batch costs exactly one database round-trip instead of N.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION bulk_upsert_fraud_entities(p_entities JSONB)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO fraud_entities (
    entity_type,
    entity_value,
    total_orders,
    total_refund_claims,
    total_chargebacks,
    flagged_count,
    fraud_score_avg,
    refund_timestamps,
    fastest_claim_days,
    first_seen,
    last_seen
  )
  SELECT
    (e->>'entity_type')::text,
    (e->>'entity_value')::text,
    COALESCE((e->>'orders_delta')::int, 0),
    COALESCE((e->>'refund_claims_delta')::int, 0),
    COALESCE((e->>'chargebacks_delta')::int, 0),
    COALESCE((e->>'flagged_delta')::int, 0),
    COALESCE((e->>'score_avg')::numeric, 0),
    CASE
      WHEN e->'refund_timestamps' IS NOT NULL AND e->'refund_timestamps' != 'null'::jsonb
      THEN e->'refund_timestamps'
      ELSE '[]'::jsonb
    END,
    CASE
      WHEN (e->>'fastest_claim_days') IS NOT NULL
      THEN (e->>'fastest_claim_days')::numeric
      ELSE NULL
    END,
    now(),
    now()
  FROM jsonb_array_elements(p_entities) AS e
  WHERE
    (e->>'entity_value') IS NOT NULL
    AND length(trim(e->>'entity_value')) > 0
  ON CONFLICT (entity_type, entity_value) DO UPDATE SET
    total_orders        = fraud_entities.total_orders        + EXCLUDED.total_orders,
    total_refund_claims = fraud_entities.total_refund_claims + EXCLUDED.total_refund_claims,
    total_chargebacks   = fraud_entities.total_chargebacks   + EXCLUDED.total_chargebacks,
    flagged_count       = fraud_entities.flagged_count       + EXCLUDED.flagged_count,
    -- Running weighted average
    fraud_score_avg     = (
      fraud_entities.fraud_score_avg * fraud_entities.total_orders
      + EXCLUDED.fraud_score_avg * EXCLUDED.total_orders
    ) / NULLIF(fraud_entities.total_orders + EXCLUDED.total_orders, 0),
    refund_timestamps   = COALESCE(fraud_entities.refund_timestamps, '[]'::jsonb)
                          || COALESCE(EXCLUDED.refund_timestamps, '[]'::jsonb),
    fastest_claim_days  = LEAST(
                            COALESCE(fraud_entities.fastest_claim_days, 99999),
                            COALESCE(EXCLUDED.fastest_claim_days, 99999)
                          ),
    last_seen = now();
END;
$$;

GRANT EXECUTE ON FUNCTION bulk_upsert_fraud_entities TO service_role;

-- ---------------------------------------------------------------------------
-- 3. bulk_upsert_co_occurrences
--
-- Accepts a JSONB array. Each element must have:
--   a_type       TEXT
--   a_value      TEXT
--   b_type       TEXT
--   b_value      TEXT
--   count_delta  INT
--
-- Single INSERT … ON CONFLICT: one round-trip for all pairs.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION bulk_upsert_co_occurrences(p_pairs JSONB)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO fraud_entity_co_occurrences (
    entity_a_type,
    entity_a_value,
    entity_b_type,
    entity_b_value,
    co_occurrence_count,
    first_seen,
    last_seen
  )
  SELECT
    (p->>'a_type')::text,
    (p->>'a_value')::text,
    (p->>'b_type')::text,
    (p->>'b_value')::text,
    GREATEST(COALESCE((p->>'count_delta')::int, 1), 1),
    now(),
    now()
  FROM jsonb_array_elements(p_pairs) AS p
  WHERE
    (p->>'a_value') IS NOT NULL AND length(trim(p->>'a_value')) > 0
    AND (p->>'b_value') IS NOT NULL AND length(trim(p->>'b_value')) > 0
  ON CONFLICT (entity_a_type, entity_a_value, entity_b_type, entity_b_value)
  DO UPDATE SET
    co_occurrence_count = fraud_entity_co_occurrences.co_occurrence_count
                          + EXCLUDED.co_occurrence_count,
    last_seen = now();
END;
$$;

GRANT EXECUTE ON FUNCTION bulk_upsert_co_occurrences TO service_role;
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
-- ===========================================================================
-- 0024_data_quality_column.sql
-- ---------------------------------------------------------------------------
-- Add a data_quality jsonb column to processing_jobs so the worker can store
-- the DataQualityReport produced by assessDataQuality() against each upload.
-- Used by the audit results page to show a contextual banner when data is
-- sparse or minimal.
-- ===========================================================================

ALTER TABLE processing_jobs
  ADD COLUMN IF NOT EXISTS data_quality jsonb;
-- 0024_merchant_setup.sql
-- Adds onboarding fields to the merchants table.

ALTER TABLE merchants
  ADD COLUMN IF NOT EXISTS setup_complete    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS monthly_order_volume TEXT,
  ADD COLUMN IF NOT EXISTS primary_fraud_concern TEXT,
  ADD COLUMN IF NOT EXISTS updated_at        TIMESTAMPTZ NOT NULL DEFAULT now();

-- Grant service_role access
GRANT UPDATE ON merchants TO service_role;
-- ===========================================================================
-- 0025_drop_audit_runs.sql
-- ---------------------------------------------------------------------------
-- Drops the legacy audit_runs table now that processing_jobs is the single
-- source of truth for all upload runs (unified in 0020_processing_jobs_unify).
--
-- Pre-conditions verified:
--   • grep -r "audit_runs" app/ components/ lib/ returns zero code-level queries
--   • processing_jobs has merchant_id-scoped RLS (added in 0006_processing_jobs)
--   • transactions.run_id FK references audit_runs — this constraint is dropped
--     before the table is removed (transactions table itself is retained; the
--     run_id column becomes an unconstrained legacy column and can be cleaned up
--     in a future migration once the inbox / transaction-detail pages migrate to
--     fraud_transactions).
-- ===========================================================================

BEGIN;

-- Step 1: Remove the FK constraint that blocks the DROP TABLE.
-- The constraint was created implicitly by:
--   run_id UUID NOT NULL REFERENCES audit_runs(id) ON DELETE CASCADE
-- in 0001_initial.sql.  Postgres names it transactions_run_id_fkey by default.
ALTER TABLE transactions
  DROP CONSTRAINT IF EXISTS transactions_run_id_fkey;

-- Step 2: Drop the table and all of its dependent objects (RLS policies,
-- indexes) that were never moved to processing_jobs.
DROP TABLE IF EXISTS audit_runs;

COMMIT;
-- ===========================================================================
-- 0026_eval_infrastructure.sql
-- ---------------------------------------------------------------------------
-- Creates the eval_history table for persisting engine eval run records, and
-- adds the is_internal column to merchants for gating the internal /eval page.
-- No RLS on eval_history — service role only, internal use.
-- ===========================================================================

BEGIN;

-- Eval history: one row per npm run eval execution
CREATE TABLE IF NOT EXISTS eval_history (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at           timestamptz NOT NULL DEFAULT now(),
  dataset_path     text        NOT NULL,
  row_count        int,
  labelled_count   int,
  precision_score  numeric(5,4),
  recall_score     numeric(5,4),
  f1_score         numeric(5,4),
  full_report      jsonb,
  engine_version   text
);

-- No RLS — accessible only via service role key in eval scripts.
-- Revoke access from client roles to prevent accidental exposure.
REVOKE ALL ON eval_history FROM anon, authenticated;

-- is_internal flag: true only for Unauth staff/demo accounts.
ALTER TABLE merchants
  ADD COLUMN IF NOT EXISTS is_internal boolean NOT NULL DEFAULT false;

COMMIT;
-- =============================================================================
-- 0027_access_audit_log_cross_merchant.sql
-- ---------------------------------------------------------------------------
-- Extends access_audit_log for cross-merchant signal audit trail.
-- Adds: queried_hashes (the normalised hash values queried — NOT plaintext),
--       matched_merchant_count (how many other merchants were matched),
--       and a default for query_type so cross-merchant inserts are clean.
-- =============================================================================

ALTER TABLE access_audit_log
  ADD COLUMN IF NOT EXISTS queried_hashes  text[],
  ADD COLUMN IF NOT EXISTS matched_merchant_count int;

-- Provide a default so cross-merchant signal inserts don't need to supply it
ALTER TABLE access_audit_log
  ALTER COLUMN query_type SET DEFAULT 'cross_merchant';

-- RLS: service role only — no authenticated or anon access
REVOKE ALL ON access_audit_log FROM authenticated;
REVOKE ALL ON access_audit_log FROM anon;
-- =============================================================================
-- 0028_schema_rename.sql
-- ---------------------------------------------------------------------------
-- 1. Rename fraud_transactions → audit_transactions
-- 2. Rename fraud_score column → match_score on audit_transactions
-- 3. Rename fraud_score column → match_score on transactions (eval table)
-- 4. Add identity_confidence_grade to audit_transactions
-- 5. Create engine_versions table + seed first version
-- 6. Add engine_version_id to audit_transactions and processing_jobs
-- 7. Add lookup_type and request_ip columns to access_audit_log
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Rename main transactions table
-- ---------------------------------------------------------------------------
ALTER TABLE fraud_transactions RENAME TO audit_transactions;

-- ---------------------------------------------------------------------------
-- 2. Rename fraud_score → match_score on audit_transactions
--    (fraud_tier does not exist on this table; risk_level stays as-is)
-- ---------------------------------------------------------------------------
ALTER TABLE audit_transactions RENAME COLUMN fraud_score TO match_score;

-- ---------------------------------------------------------------------------
-- 3. Rename fraud_score → match_score on the eval transactions table
-- ---------------------------------------------------------------------------
ALTER TABLE transactions RENAME COLUMN fraud_score TO match_score;

-- ---------------------------------------------------------------------------
-- 4. Add identity_confidence_grade to audit_transactions
-- ---------------------------------------------------------------------------
ALTER TABLE audit_transactions
  ADD COLUMN IF NOT EXISTS identity_confidence_grade text
    CHECK (identity_confidence_grade IN ('definite', 'probable', 'possible', 'weak'));

-- ---------------------------------------------------------------------------
-- 5. Create engine_versions table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS engine_versions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_number text        NOT NULL,
  deployed_at    timestamptz NOT NULL DEFAULT now(),
  signal_weights jsonb       NOT NULL,
  thresholds     jsonb       NOT NULL,
  notes          text
);

-- Seed current version
INSERT INTO engine_versions (version_number, signal_weights, thresholds, notes)
VALUES (
  '0.1.0',
  '{"refundRate":20,"inrAbuse":25,"velocity":10,"inrSpeed":10,"emailPattern":8,"addressClustering":12,"valueAnomaly":5,"crossMerchant":30,"paymentChurn":5}',
  '{"medium":25,"high":50,"critical":75,"flagThreshold":25}',
  'Initial version — baseline after schema cleanup and cross-merchant signal implementation'
)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 6. Add engine_version_id FK to audit_transactions and processing_jobs
-- ---------------------------------------------------------------------------
ALTER TABLE audit_transactions
  ADD COLUMN IF NOT EXISTS engine_version_id uuid REFERENCES engine_versions(id);

ALTER TABLE processing_jobs
  ADD COLUMN IF NOT EXISTS engine_version_id uuid REFERENCES engine_versions(id);

-- ---------------------------------------------------------------------------
-- 7. Extend access_audit_log with lookup_type and request_ip
--    (queried_hashes and matched_merchant_count added in 0027)
-- ---------------------------------------------------------------------------
ALTER TABLE access_audit_log
  ADD COLUMN IF NOT EXISTS lookup_type  text,
  ADD COLUMN IF NOT EXISTS request_ip   text;

-- ---------------------------------------------------------------------------
-- 8. Re-index: rename the indexes that reference fraud_transactions
-- ---------------------------------------------------------------------------
ALTER INDEX IF EXISTS idx_fraud_transactions_job    RENAME TO idx_audit_transactions_job;
ALTER INDEX IF EXISTS idx_fraud_transactions_order  RENAME TO idx_audit_transactions_order;
ALTER INDEX IF EXISTS idx_fraud_transactions_risk   RENAME TO idx_audit_transactions_risk;

-- ---------------------------------------------------------------------------
-- 9. Rename fraud_score_avg → match_score_avg on fraud_entities
--    (fraud_entities table is kept; only the column is renamed)
-- ---------------------------------------------------------------------------
ALTER TABLE fraud_entities RENAME COLUMN fraud_score_avg TO match_score_avg;

COMMIT;
-- =============================================================================
-- 0029_evidence_packages.sql
-- ---------------------------------------------------------------------------
-- Chargeback evidence package store.
-- Supports CE3.0 (Visa Compelling Evidence 3.0) eligibility tracking.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS evidence_packages (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id              uuid REFERENCES merchants(id) NOT NULL,
  customer_profile_id      uuid REFERENCES customer_profiles(id),
  generated_for_order_id   uuid REFERENCES audit_transactions(id),
  generated_at             timestamptz DEFAULT now(),
  reference_number         text UNIQUE NOT NULL,
  pdf_storage_path         text,
  narrative_summary        text,
  signal_snapshot          jsonb,
  cross_merchant_indicator boolean DEFAULT false,
  ce3_eligible             boolean DEFAULT false,
  ce3_qualifying_signals   jsonb,
  ce3_prior_transactions   jsonb,
  merchant_notes           text,
  created_at               timestamptz DEFAULT now()
);

ALTER TABLE evidence_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "merchant_own_evidence" ON evidence_packages
  FOR ALL USING (merchant_id = auth.uid())
  WITH CHECK (merchant_id = auth.uid());

CREATE INDEX IF NOT EXISTS evidence_packages_merchant_id_idx
  ON evidence_packages (merchant_id);

CREATE INDEX IF NOT EXISTS evidence_packages_customer_profile_id_idx
  ON evidence_packages (customer_profile_id);

-- Sequence for reference number generation
CREATE SEQUENCE IF NOT EXISTS evidence_package_daily_seq;

CREATE OR REPLACE FUNCTION generate_evidence_reference()
RETURNS text AS $$
DECLARE
  today   text := to_char(now(), 'YYYYMMDD');
  seq_val int;
BEGIN
  seq_val := nextval('evidence_package_daily_seq');
  RETURN 'UNAUTH-' || today || '-' || lpad(seq_val::text, 6, '0');
END;
$$ LANGUAGE plpgsql;

COMMIT;
-- =============================================================================
-- 0030_watchlist_appearances.sql
-- ---------------------------------------------------------------------------
-- Tracks when a watchlisted customer appears in a new audit.
-- One row per (merchant, customer_profile, audit) — upserted at job completion.
-- =============================================================================

CREATE TABLE IF NOT EXISTS watchlist_appearances (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id         uuid REFERENCES merchants(id) NOT NULL,
  customer_profile_id uuid REFERENCES customer_profiles(id) NOT NULL,
  audit_id            uuid REFERENCES processing_jobs(id) NOT NULL,
  transaction_count   int NOT NULL DEFAULT 1,
  highest_grade       text CHECK (highest_grade IN ('definite', 'probable', 'possible', 'weak')),
  first_seen_in_audit timestamptz DEFAULT now(),
  reviewed_at         timestamptz,
  UNIQUE (merchant_id, customer_profile_id, audit_id)
);

ALTER TABLE watchlist_appearances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "merchant_own_appearances" ON watchlist_appearances
  FOR ALL USING (merchant_id = auth.uid());

-- Index for fast unreviewed-count lookups on the dashboard
CREATE INDEX IF NOT EXISTS idx_watchlist_appearances_merchant_reviewed
  ON watchlist_appearances (merchant_id, reviewed_at)
  WHERE reviewed_at IS NULL;
-- =============================================================================
-- 0031_network_metrics_snapshots.sql
-- ---------------------------------------------------------------------------
-- Daily network-wide metrics snapshots. Service role only — no RLS.
-- Populated by scripts/snapshot-network-metrics.ts (run via cron or manually).
-- =============================================================================

CREATE TABLE IF NOT EXISTS network_metrics_snapshots (
  id                                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date                         date NOT NULL UNIQUE,
  total_identities                      int DEFAULT 0,
  identities_at_2_merchants             int DEFAULT 0,
  identities_at_3plus_merchants         int DEFAULT 0,
  total_cross_merchant_matches_lifetime int DEFAULT 0,
  audits_in_last_30d                    int DEFAULT 0,
  audits_with_cross_merchant_signal_30d int DEFAULT 0,
  active_merchants_30d                  int DEFAULT 0,
  uploads_in_last_30d                   int DEFAULT 0,
  network_inr_claim_rate                numeric(5,4),
  network_refund_rate                   numeric(5,4),
  created_at                            timestamptz DEFAULT now()
);

-- Service role only — revoke all from authenticated/anon
REVOKE ALL ON network_metrics_snapshots FROM authenticated;
REVOKE ALL ON network_metrics_snapshots FROM anon;
-- =============================================================================
-- 0032_demo_merchant.sql
-- ---------------------------------------------------------------------------
-- Adds is_demo boolean to merchants table (if not present from prior migration).
-- The actual demo merchant row is inserted separately via seed script.
-- =============================================================================

ALTER TABLE merchants
  ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
-- 0033_fix_fastest_claim_sentinel.sql
--
-- Three earlier migrations (0010, 0011, 0023) used `LEAST(COALESCE(x, 99999), …)`
-- to merge fastest_claim_days during upserts. When both sides were NULL
-- (i.e. the order had no refund, so no days-to-claim), the COALESCE
-- substituted 99999 and that sentinel was stored in fraud_entities. As of
-- this migration, 3,212 rows hold the sentinel and any read site that does
-- arithmetic on fastest_claim_days is poisoned.
--
-- Fix:
--   1. Replace the three function bodies so LEAST receives raw NULLs.
--      PostgreSQL's LEAST() ignores NULLs, returning the smallest non-null
--      value, or NULL if all inputs are NULL — exactly the semantics we want.
--   2. Backfill: rows storing the sentinel become NULL.

-- 1a — bulk_upsert_fraud_entities (introduced in 0023).
CREATE OR REPLACE FUNCTION bulk_upsert_fraud_entities(p_entities JSONB)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO fraud_entities (
    entity_type,
    entity_value,
    total_orders,
    total_refund_claims,
    total_chargebacks,
    flagged_count,
    fraud_score_avg,
    refund_timestamps,
    fastest_claim_days,
    first_seen,
    last_seen
  )
  SELECT
    (e->>'entity_type')::text,
    (e->>'entity_value')::text,
    COALESCE((e->>'orders_delta')::int, 0),
    COALESCE((e->>'refund_claims_delta')::int, 0),
    COALESCE((e->>'chargebacks_delta')::int, 0),
    COALESCE((e->>'flagged_delta')::int, 0),
    COALESCE((e->>'score_avg')::numeric, 0),
    CASE
      WHEN e->'refund_timestamps' IS NOT NULL AND e->'refund_timestamps' != 'null'::jsonb
      THEN e->'refund_timestamps'
      ELSE '[]'::jsonb
    END,
    CASE
      WHEN (e->>'fastest_claim_days') IS NOT NULL
      THEN (e->>'fastest_claim_days')::numeric
      ELSE NULL
    END,
    now(),
    now()
  FROM jsonb_array_elements(p_entities) AS e
  WHERE
    (e->>'entity_value') IS NOT NULL
    AND length(trim(e->>'entity_value')) > 0
  ON CONFLICT (entity_type, entity_value) DO UPDATE SET
    total_orders        = fraud_entities.total_orders        + EXCLUDED.total_orders,
    total_refund_claims = fraud_entities.total_refund_claims + EXCLUDED.total_refund_claims,
    total_chargebacks   = fraud_entities.total_chargebacks   + EXCLUDED.total_chargebacks,
    flagged_count       = fraud_entities.flagged_count       + EXCLUDED.flagged_count,
    fraud_score_avg     = (
      fraud_entities.fraud_score_avg * fraud_entities.total_orders
      + EXCLUDED.fraud_score_avg * EXCLUDED.total_orders
    ) / NULLIF(fraud_entities.total_orders + EXCLUDED.total_orders, 0),
    refund_timestamps   = COALESCE(fraud_entities.refund_timestamps, '[]'::jsonb)
                          || COALESCE(EXCLUDED.refund_timestamps, '[]'::jsonb),
    -- LEAST ignores NULLs in Postgres. Drop the COALESCE-to-sentinel pattern.
    fastest_claim_days  = LEAST(fraud_entities.fastest_claim_days, EXCLUDED.fastest_claim_days),
    last_seen = now();
END;
$$;

GRANT EXECUTE ON FUNCTION bulk_upsert_fraud_entities TO service_role;

-- 1b — update_fraud_entity_with_intelligence (introduced in 0011).
CREATE OR REPLACE FUNCTION update_fraud_entity_with_intelligence(
  p_entity_type        TEXT,
  p_entity_value       TEXT,
  p_orders_delta       INTEGER,
  p_refund_claims_delta INTEGER,
  p_chargebacks_delta  INTEGER,
  p_flagged_delta      INTEGER,
  p_score_avg          NUMERIC,
  p_refund_timestamps  TEXT[],
  p_fastest_claim_days NUMERIC,
  p_refund_this_batch  BOOLEAN
) RETURNS VOID AS $$
DECLARE
  existing_orders     INTEGER;
  existing_score_avg  NUMERIC;
  existing_timestamps JSONB;
  combined_timestamps JSONB;
  ts_array NUMERIC[];
  i INTEGER;
  intervals NUMERIC[];
  avg_interval NUMERIC;
BEGIN
  IF p_entity_value IS NULL OR length(trim(p_entity_value)) = 0 THEN
    RETURN;
  END IF;

  INSERT INTO fraud_entities (
    entity_type, entity_value,
    total_orders, total_refund_claims, total_chargebacks,
    flagged_count, fraud_score_avg,
    refund_timestamps, fastest_claim_days,
    total_merchants_refunded_at,
    first_seen, last_seen
  )
  VALUES (
    p_entity_type, p_entity_value,
    p_orders_delta, p_refund_claims_delta, p_chargebacks_delta,
    p_flagged_delta, p_score_avg,
    COALESCE(to_jsonb(p_refund_timestamps), '[]'::jsonb),
    p_fastest_claim_days,
    CASE WHEN p_refund_this_batch THEN 1 ELSE 0 END,
    now(), now()
  )
  ON CONFLICT (entity_type, entity_value) DO UPDATE SET
    total_orders        = fraud_entities.total_orders + EXCLUDED.total_orders,
    total_refund_claims = fraud_entities.total_refund_claims + EXCLUDED.total_refund_claims,
    total_chargebacks   = fraud_entities.total_chargebacks + EXCLUDED.total_chargebacks,
    flagged_count       = fraud_entities.flagged_count + EXCLUDED.flagged_count,
    fraud_score_avg     = (
      fraud_entities.fraud_score_avg * fraud_entities.total_orders
      + EXCLUDED.fraud_score_avg * EXCLUDED.total_orders
    ) / NULLIF(fraud_entities.total_orders + EXCLUDED.total_orders, 0),
    refund_timestamps   = COALESCE(fraud_entities.refund_timestamps, '[]'::jsonb)
                          || COALESCE(EXCLUDED.refund_timestamps, '[]'::jsonb),
    -- LEAST ignores NULLs; drop the sentinel pattern.
    fastest_claim_days  = LEAST(fraud_entities.fastest_claim_days, EXCLUDED.fastest_claim_days),
    total_merchants_refunded_at =
      fraud_entities.total_merchants_refunded_at + EXCLUDED.total_merchants_refunded_at,
    last_seen = now();

  SELECT refund_timestamps INTO existing_timestamps
  FROM fraud_entities
  WHERE entity_type = p_entity_type AND entity_value = p_entity_value;

  IF existing_timestamps IS NULL OR jsonb_array_length(existing_timestamps) < 2 THEN
    RETURN;
  END IF;

  SELECT array_agg(extract(epoch FROM (val::text)::timestamptz) ORDER BY 1)
    INTO ts_array
  FROM jsonb_array_elements_text(existing_timestamps) AS val;

  intervals := ARRAY[]::NUMERIC[];
  FOR i IN 2..array_length(ts_array, 1) LOOP
    intervals := intervals || ((ts_array[i] - ts_array[i - 1]) / 86400.0);
  END LOOP;

  IF array_length(intervals, 1) IS NULL THEN
    RETURN;
  END IF;

  SELECT AVG(v) INTO avg_interval FROM unnest(intervals) AS v;

  UPDATE fraud_entities
  SET refund_intervals_avg_days = avg_interval
  WHERE entity_type = p_entity_type AND entity_value = p_entity_value;
END;
$$ LANGUAGE plpgsql;

-- 1c — record_refund_claim (introduced in 0010, original used 999999).
CREATE OR REPLACE FUNCTION record_refund_claim(
  p_entity_type   TEXT,
  p_entity_value  TEXT,
  p_claimed_at    TIMESTAMPTZ,
  p_days_to_claim NUMERIC
) RETURNS VOID AS $$
BEGIN
  IF p_entity_value IS NULL OR length(trim(p_entity_value)) = 0 THEN
    RETURN;
  END IF;

  UPDATE fraud_entities
  SET
    refund_timestamps   = COALESCE(refund_timestamps, '[]'::jsonb)
                          || jsonb_build_array(p_claimed_at::text),
    -- Drop COALESCE(.., 999999) sentinel — LEAST ignores NULL.
    fastest_claim_days  = LEAST(fastest_claim_days, p_days_to_claim)
  WHERE entity_type = p_entity_type
    AND entity_value = p_entity_value;
END;
$$ LANGUAGE plpgsql;

-- 2 — Backfill rows that already hold the sentinel.
UPDATE fraud_entities
SET fastest_claim_days = NULL
WHERE fastest_claim_days IN (99999, 999999);
-- 0034_self_learning.sql
--
-- Self-learning improvements:
--
--   1. Replace the staircase weight-adjustment formula in
--      record_signal_feedback with a continuous one, gated by a minimum
--      observation count so early noise doesn't move weights.
--
--      old: <0.5 precision -> -0.1   >0.8 precision -> +0.1   else 0
--      new: weight_adjustment = clamp((precision - 0.5) * 0.4, -0.3, 0.3)
--           applied only once (true_positive_count + false_positive_count) >= 10
--
--   2. normalisation_learning table — captures field-pair divergences
--      surfaced by merchant feedback so the canonical normalisers can be
--      improved deliberately (no auto-mutation).

-- 1. record_signal_feedback v2
CREATE OR REPLACE FUNCTION record_signal_feedback(
  p_transaction_id TEXT,
  p_outcome TEXT,
  p_fired TEXT[],
  p_all_signals TEXT[]
) RETURNS VOID AS $$
DECLARE
  sig TEXT;
  fired_set TEXT[] := COALESCE(p_fired, ARRAY[]::TEXT[]);
  is_fired BOOLEAN;
  is_fraud BOOLEAN := (p_outcome = 'confirmed_fraud');
  MIN_OBS CONSTANT INTEGER := 10;
BEGIN
  UPDATE fraud_transactions
     SET feedback_outcome = p_outcome,
         feedback_at = now()
   WHERE order_id = p_transaction_id;

  FOREACH sig IN ARRAY p_all_signals LOOP
    is_fired := sig = ANY(fired_set);

    INSERT INTO signal_performance (signal_name) VALUES (sig)
      ON CONFLICT (signal_name) DO NOTHING;

    UPDATE signal_performance
       SET true_positive_count  = true_positive_count
         + CASE WHEN is_fraud  AND is_fired THEN 1 ELSE 0 END,
           false_positive_count = false_positive_count
         + CASE WHEN NOT is_fraud AND is_fired THEN 1 ELSE 0 END,
           true_negative_count  = true_negative_count
         + CASE WHEN NOT is_fraud AND NOT is_fired THEN 1 ELSE 0 END,
           false_negative_count = false_negative_count
         + CASE WHEN is_fraud  AND NOT is_fired THEN 1 ELSE 0 END,
           last_updated = now()
     WHERE signal_name = sig;

    -- Continuous adjustment: clamp((precision - 0.5) * 0.4, -0.3, 0.3).
    -- Gated by MIN_OBS so a single observation can't move weights.
    -- precision is set to NULL (and weight_adjustment to 0) when the
    -- signal has not fired enough times to be evaluated.
    UPDATE signal_performance
       SET precision_score = CASE
             WHEN (true_positive_count + false_positive_count) = 0 THEN NULL
             ELSE true_positive_count::NUMERIC
                  / (true_positive_count + false_positive_count)
           END,
           weight_adjustment = CASE
             WHEN (true_positive_count + false_positive_count) < MIN_OBS THEN 0
             ELSE GREATEST(
                    -0.3,
                    LEAST(
                      0.3,
                      ((true_positive_count::NUMERIC
                        / (true_positive_count + false_positive_count)) - 0.5) * 0.4
                    )
                  )
           END
     WHERE signal_name = sig;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION record_signal_feedback TO service_role;
GRANT EXECUTE ON FUNCTION record_signal_feedback TO authenticated;

-- 2. normalisation_learning table.
CREATE TABLE IF NOT EXISTS normalisation_learning (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_type      TEXT NOT NULL CHECK (field_type IN ('address', 'name', 'email', 'phone')),
  value_a         TEXT NOT NULL,
  value_b         TEXT NOT NULL,
  confirmed_same  BOOLEAN NOT NULL,
  similarity_at_time NUMERIC,
  merchant_id     UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS normalisation_learning_field_idx
  ON normalisation_learning (field_type, confirmed_same);

ALTER TABLE normalisation_learning ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "normalisation_learning_read_authenticated" ON normalisation_learning;
CREATE POLICY "normalisation_learning_read_authenticated" ON normalisation_learning
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "normalisation_learning_write_service" ON normalisation_learning;
CREATE POLICY "normalisation_learning_write_service" ON normalisation_learning
  FOR INSERT TO service_role WITH CHECK (true);
-- =========================================================
-- MERCHANT TEAM MEMBERS
-- Allows merchants to invite multiple users to their account
-- with role-based access control.
-- =========================================================

CREATE TABLE merchant_members (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id    UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  user_id        UUID REFERENCES auth.users(id) ON DELETE SET NULL,   -- null until invite accepted
  invited_email  TEXT NOT NULL,
  role           TEXT NOT NULL DEFAULT 'analyst'
                   CHECK (role IN ('owner', 'admin', 'analyst', 'viewer')),
  invite_status  TEXT NOT NULL DEFAULT 'pending'
                   CHECK (invite_status IN ('pending', 'active', 'revoked')),
  invited_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at    TIMESTAMPTZ,

  UNIQUE (merchant_id, invited_email)
);

CREATE INDEX idx_merchant_members_merchant  ON merchant_members(merchant_id);
CREATE INDEX idx_merchant_members_user      ON merchant_members(user_id);
CREATE INDEX idx_merchant_members_email     ON merchant_members(invited_email);

ALTER TABLE merchant_members ENABLE ROW LEVEL SECURITY;

-- Merchant owner can see all members of their merchant
CREATE POLICY "members_select_own_merchant" ON merchant_members
  FOR SELECT USING (
    merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
  );

-- Merchant owner can insert (invite) members
CREATE POLICY "members_insert_own_merchant" ON merchant_members
  FOR INSERT WITH CHECK (
    merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
  );

-- Merchant owner can update roles / status
CREATE POLICY "members_update_own_merchant" ON merchant_members
  FOR UPDATE USING (
    merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
  );

-- Merchant owner can delete members
CREATE POLICY "members_delete_own_merchant" ON merchant_members
  FOR DELETE USING (
    merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
  );

-- A member can see their own record (so they can verify access after accepting invite)
CREATE POLICY "members_select_own_self" ON merchant_members
  FOR SELECT USING (user_id = auth.uid());

-- Service role needs full access for invite flows
GRANT ALL ON merchant_members TO service_role;

-- =========================================================
-- ROLE PERMISSIONS reference (informational, enforced in app)
-- owner  : all permissions, cannot be removed
-- admin  : manage team, all features
-- analyst: run audits, lookup, watchlist, notes, dismiss/feedback
-- viewer : read-only access to all data
-- =========================================================
-- =========================================================
-- PERMISSIONS & AUDIT TRAIL
-- Bank-grade RBAC: delegated permission grants + full action trail
-- =========================================================

-- ---------------------------------------------------------
-- 1. user_action_log
--    Immutable audit trail for every sensitive action taken
--    by any user in the system. Written via service role only.
-- ---------------------------------------------------------
CREATE TABLE user_action_log (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id     UUID        NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  actor_user_id   UUID        NOT NULL,
  actor_role      TEXT        NOT NULL,
  action          TEXT        NOT NULL,
  resource_type   TEXT,
  resource_id     TEXT,
  metadata        JSONB,
  request_ip      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ual_merchant_time ON user_action_log(merchant_id, created_at DESC);
CREATE INDEX idx_ual_actor         ON user_action_log(actor_user_id, created_at DESC);
CREATE INDEX idx_ual_action        ON user_action_log(action);
CREATE INDEX idx_ual_resource      ON user_action_log(resource_type, resource_id);

ALTER TABLE user_action_log ENABLE ROW LEVEL SECURITY;

-- Owner + service role can read
CREATE POLICY "ual_owner_select" ON user_action_log
  FOR SELECT USING (
    merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
  );

-- No user can write directly — only service_role
REVOKE INSERT, UPDATE, DELETE ON user_action_log FROM authenticated, anon;
GRANT ALL ON user_action_log TO service_role;


-- ---------------------------------------------------------
-- 2. user_permission_grants
--    Allows owners to delegate specific granular permissions
--    to individual team members, beyond their base role.
-- ---------------------------------------------------------
CREATE TABLE user_permission_grants (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id     UUID        NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  grantor_user_id UUID        NOT NULL,
  grantee_user_id UUID        NOT NULL,
  permission      TEXT        NOT NULL,
  revoked         BOOLEAN     NOT NULL DEFAULT false,
  granted_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at      TIMESTAMPTZ,

  UNIQUE (merchant_id, grantee_user_id, permission)
);

CREATE INDEX idx_upg_merchant ON user_permission_grants(merchant_id);
CREATE INDEX idx_upg_grantee  ON user_permission_grants(grantee_user_id, revoked);

ALTER TABLE user_permission_grants ENABLE ROW LEVEL SECURITY;

-- Owner can manage all grants for their merchant
CREATE POLICY "upg_owner_all" ON user_permission_grants
  FOR ALL USING (
    merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
  );

-- Members can read their own active grants
CREATE POLICY "upg_member_select_own" ON user_permission_grants
  FOR SELECT USING (grantee_user_id = auth.uid() AND revoked = false);

GRANT ALL ON user_permission_grants TO service_role;
-- ===========================================================================
-- 0037_fix_processing_jobs_rls.sql
-- ---------------------------------------------------------------------------
-- The original RLS policies on processing_jobs (added in 0006) assumed
--   auth.uid() = merchant_id
-- which was correct when the schema kept user_id == merchant_id 1:1. After
-- the merchants table was added (0001) and team membership was introduced
-- (0035_team_members.sql), `merchants.id` and `auth.users.id` are distinct
-- UUIDs joined via `merchants.user_id`. The legacy policies therefore
-- silently blocked EVERY authenticated read of processing_jobs, manifesting
-- as a 404 on /audit/{runId} immediately after a successful upload.
--
-- This migration replaces the policies to scope by merchant ownership AND
-- active team membership, matching the pattern used by every other
-- merchant-scoped table in the codebase (see 0035_team_members.sql).
-- ===========================================================================

BEGIN;

DROP POLICY IF EXISTS "processing_jobs_select_own" ON processing_jobs;
DROP POLICY IF EXISTS "processing_jobs_insert_own" ON processing_jobs;
DROP POLICY IF EXISTS "processing_jobs_update_own" ON processing_jobs;
DROP POLICY IF EXISTS "processing_jobs_delete_own" ON processing_jobs;

CREATE POLICY "processing_jobs_select_own" ON processing_jobs
  FOR SELECT TO authenticated USING (
    merchant_id IN (
      SELECT id FROM merchants WHERE user_id = auth.uid()
      UNION
      SELECT merchant_id FROM merchant_members
        WHERE user_id = auth.uid() AND invite_status = 'active'
    )
  );

CREATE POLICY "processing_jobs_insert_own" ON processing_jobs
  FOR INSERT TO authenticated WITH CHECK (
    merchant_id IN (
      SELECT id FROM merchants WHERE user_id = auth.uid()
      UNION
      SELECT merchant_id FROM merchant_members
        WHERE user_id = auth.uid() AND invite_status = 'active'
    )
  );

CREATE POLICY "processing_jobs_update_own" ON processing_jobs
  FOR UPDATE TO authenticated USING (
    merchant_id IN (
      SELECT id FROM merchants WHERE user_id = auth.uid()
      UNION
      SELECT merchant_id FROM merchant_members
        WHERE user_id = auth.uid() AND invite_status = 'active'
    )
  );

CREATE POLICY "processing_jobs_delete_own" ON processing_jobs
  FOR DELETE TO authenticated USING (
    merchant_id IN (
      SELECT id FROM merchants WHERE user_id = auth.uid()
      UNION
      SELECT merchant_id FROM merchant_members
        WHERE user_id = auth.uid() AND invite_status = 'active'
    )
  );

-- Service role bypasses RLS, but make it explicit anyway for clarity.
GRANT ALL ON processing_jobs TO service_role;

COMMIT;
-- Migration 0038: Upload context fields on processing_jobs
-- Adds date range, human label, and upload type so merchants can
-- describe what time period each upload covers and why.

ALTER TABLE processing_jobs
  ADD COLUMN IF NOT EXISTS date_range_start date,
  ADD COLUMN IF NOT EXISTS date_range_end   date,
  ADD COLUMN IF NOT EXISTS label            text,
  ADD COLUMN IF NOT EXISTS upload_type      text NOT NULL DEFAULT 'standard'
    CHECK (upload_type IN ('standard', 'historical', 'investigation'));

COMMENT ON COLUMN processing_jobs.date_range_start IS 'Earliest order date covered by this upload (merchant-provided).';
COMMENT ON COLUMN processing_jobs.date_range_end   IS 'Latest order date covered by this upload (merchant-provided).';
COMMENT ON COLUMN processing_jobs.label            IS 'Human-readable name for this upload, e.g. "January 2026" or "Black Friday week".';
COMMENT ON COLUMN processing_jobs.upload_type      IS 'standard = regular periodic export | historical = one-time bulk import | investigation = targeted single-customer analysis.';
-- Soft-delete columns for watchlist_entries and customer_notes.
-- User-facing "remove" actions now set these flags instead of hard-deleting rows.
-- This preserves merchant-flagged signals as training/model data.

ALTER TABLE watchlist_entries
  ADD COLUMN IF NOT EXISTS removed_by_merchant BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE customer_notes
  ADD COLUMN IF NOT EXISTS deleted_by_merchant BOOLEAN NOT NULL DEFAULT FALSE;

-- Index to make active-record queries fast (the common case filters removed=false)
CREATE INDEX IF NOT EXISTS watchlist_entries_active ON watchlist_entries(merchant_id, removed_by_merchant, added_at DESC);
CREATE INDEX IF NOT EXISTS customer_notes_active ON customer_notes(merchant_id, customer_profile_id, deleted_by_merchant, created_at DESC);
-- Migration 0040: Customer activity log
-- Records key events on customer profiles for a chronological timeline.

CREATE TABLE IF NOT EXISTS customer_activity_log (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  uuid        NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
  merchant_id uuid        NOT NULL REFERENCES merchants(id),
  event_type  text        NOT NULL,
    -- 'profile_created', 'status_changed', 'note_added', 'note_deleted',
    -- 'watchlist_added', 'watchlist_removed', 'evidence_generated',
    -- 'audit_appearance', 'manually_reviewed'
  event_data  jsonb       NOT NULL DEFAULT '{}',
    -- for status_changed: { from: 'new', to: 'under_review' }
    -- for note_added:     { note_preview: first 80 chars }
    -- for evidence_generated: { reference_number: 'UNAUTH-...' }
    -- for audit_appearance:   { audit_label: '...', score: 74 }
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS customer_activity_log_profile_created_at
  ON customer_activity_log(profile_id, created_at DESC);

ALTER TABLE customer_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "merchant_own_activity" ON customer_activity_log
  FOR ALL
  USING   (merchant_id = auth.uid())
  WITH CHECK (merchant_id = auth.uid());
-- Persist identity-scoring output on audit transactions and customer profiles.

ALTER TABLE audit_transactions
  ADD COLUMN IF NOT EXISTS identity_score numeric,
  ADD COLUMN IF NOT EXISTS signals_matched jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS behavioural_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS recommended_action text,
  ADD COLUMN IF NOT EXISTS ce3_eligible boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ce3_qualifying_transactions jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS cluster_id uuid;

ALTER TABLE customer_profiles
  ADD COLUMN IF NOT EXISTS identity_confidence_grade text
    CHECK (identity_confidence_grade IN ('definite', 'probable', 'possible', 'weak')),
  ADD COLUMN IF NOT EXISTS identity_signals_summary jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS identity_cluster_id uuid;

CREATE INDEX IF NOT EXISTS idx_audit_transactions_identity_grade
  ON audit_transactions (job_id, identity_confidence_grade);

CREATE INDEX IF NOT EXISTS idx_audit_transactions_cluster_id
  ON audit_transactions (cluster_id);
-- Fix bulk_upsert_fraud_entities for the post-cleanup fraud_entities schema.
-- The old function still referenced fraud_score_avg, which was renamed to
-- match_score_avg in migration 0028.

CREATE OR REPLACE FUNCTION bulk_upsert_fraud_entities(p_entities JSONB)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO fraud_entities (
    entity_type,
    entity_value,
    total_orders,
    total_refund_claims,
    total_chargebacks,
    flagged_count,
    match_score_avg,
    refund_timestamps,
    fastest_claim_days,
    first_seen,
    last_seen
  )
  SELECT
    (e->>'entity_type')::text,
    (e->>'entity_value')::text,
    COALESCE((e->>'orders_delta')::int, 0),
    COALESCE((e->>'refund_claims_delta')::int, 0),
    COALESCE((e->>'chargebacks_delta')::int, 0),
    COALESCE((e->>'flagged_delta')::int, 0),
    COALESCE((e->>'score_avg')::numeric, 0),
    CASE
      WHEN e->'refund_timestamps' IS NOT NULL AND e->'refund_timestamps' != 'null'::jsonb
      THEN e->'refund_timestamps'
      ELSE '[]'::jsonb
    END,
    CASE
      WHEN (e->>'fastest_claim_days') IS NOT NULL
      THEN (e->>'fastest_claim_days')::numeric
      ELSE NULL
    END,
    now(),
    now()
  FROM jsonb_array_elements(p_entities) AS e
  WHERE
    (e->>'entity_value') IS NOT NULL
    AND length(trim(e->>'entity_value')) > 0
  ON CONFLICT (entity_type, entity_value) DO UPDATE SET
    total_orders        = fraud_entities.total_orders        + EXCLUDED.total_orders,
    total_refund_claims = fraud_entities.total_refund_claims + EXCLUDED.total_refund_claims,
    total_chargebacks   = fraud_entities.total_chargebacks   + EXCLUDED.total_chargebacks,
    flagged_count       = fraud_entities.flagged_count       + EXCLUDED.flagged_count,
    match_score_avg     = (
      fraud_entities.match_score_avg * fraud_entities.total_orders
      + EXCLUDED.match_score_avg * EXCLUDED.total_orders
    ) / NULLIF(fraud_entities.total_orders + EXCLUDED.total_orders, 0),
    refund_timestamps   = COALESCE(fraud_entities.refund_timestamps, '[]'::jsonb)
                          || COALESCE(EXCLUDED.refund_timestamps, '[]'::jsonb),
    fastest_claim_days  = LEAST(
                            COALESCE(fraud_entities.fastest_claim_days, 99999),
                            COALESCE(EXCLUDED.fastest_claim_days, 99999)
                          ),
    last_seen = now();
END;
$$;

GRANT EXECUTE ON FUNCTION bulk_upsert_fraud_entities TO service_role;
-- ===========================================================================
-- 0043_fix_audit_transactions_rls.sql
-- ---------------------------------------------------------------------------
-- The original RLS policy on audit_transactions (added in 0017) assumed
--   auth.uid() = processing_jobs.merchant_id
-- which is wrong once the merchants table was introduced: merchant_id is a
-- merchants.id UUID, not an auth.users.id UUID. As a result, every
-- authenticated SELECT on audit_transactions returns 0 rows, causing
-- /audit/{runId} to show empty summaries and 0 grade counts.
--
-- This migration drops the broken policy and recreates it mirroring the
-- pattern established in 0037_fix_processing_jobs_rls.sql: scope by
-- merchant ownership (merchants.user_id = auth.uid()) AND active team
-- membership (merchant_members.user_id = auth.uid()).
-- ===========================================================================

BEGIN;

-- Drop the broken legacy policy (may be on either table name depending on
-- whether it was renamed from fraud_transactions → audit_transactions).
DROP POLICY IF EXISTS "fraud_transactions_select_own" ON fraud_transactions;
DROP POLICY IF EXISTS "fraud_transactions_select_own" ON audit_transactions;
DROP POLICY IF EXISTS "audit_transactions_select_own"  ON audit_transactions;

-- Correct SELECT policy: job_id → processing_jobs.id → merchant_id scoped
-- to the authenticated user via merchants or active team membership.
CREATE POLICY "audit_transactions_select_own" ON audit_transactions
  FOR SELECT TO authenticated USING (
    job_id IN (
      SELECT id FROM processing_jobs
      WHERE merchant_id IN (
        SELECT id FROM merchants WHERE user_id = auth.uid()
        UNION
        SELECT merchant_id FROM merchant_members
          WHERE user_id = auth.uid() AND invite_status = 'active'
      )
    )
  );

-- Also fix INSERT / UPDATE / DELETE policies for consistency so that
-- the scoring engine (service role bypasses RLS anyway) and any future
-- authenticated writes also work correctly.
DROP POLICY IF EXISTS "fraud_transactions_insert_own" ON fraud_transactions;
DROP POLICY IF EXISTS "fraud_transactions_insert_own" ON audit_transactions;
DROP POLICY IF EXISTS "audit_transactions_insert_own"  ON audit_transactions;

CREATE POLICY "audit_transactions_insert_own" ON audit_transactions
  FOR INSERT TO authenticated WITH CHECK (
    job_id IN (
      SELECT id FROM processing_jobs
      WHERE merchant_id IN (
        SELECT id FROM merchants WHERE user_id = auth.uid()
        UNION
        SELECT merchant_id FROM merchant_members
          WHERE user_id = auth.uid() AND invite_status = 'active'
      )
    )
  );

DROP POLICY IF EXISTS "fraud_transactions_update_own" ON fraud_transactions;
DROP POLICY IF EXISTS "fraud_transactions_update_own" ON audit_transactions;
DROP POLICY IF EXISTS "audit_transactions_update_own"  ON audit_transactions;

CREATE POLICY "audit_transactions_update_own" ON audit_transactions
  FOR UPDATE TO authenticated USING (
    job_id IN (
      SELECT id FROM processing_jobs
      WHERE merchant_id IN (
        SELECT id FROM merchants WHERE user_id = auth.uid()
        UNION
        SELECT merchant_id FROM merchant_members
          WHERE user_id = auth.uid() AND invite_status = 'active'
      )
    )
  );

-- Service role bypasses RLS, but grant explicitly for clarity.
GRANT ALL ON audit_transactions TO service_role;

COMMIT;
-- ===========================================================================
-- 0044_add_file_hash_to_processing_jobs.sql
-- ---------------------------------------------------------------------------
-- Adds a file_hash column so the API can detect exact-duplicate CSV uploads
-- (same byte-for-byte content) and warn the user before processing again.
-- ===========================================================================

ALTER TABLE processing_jobs
  ADD COLUMN IF NOT EXISTS file_hash TEXT;

-- Index enables fast per-merchant duplicate lookups
CREATE INDEX IF NOT EXISTS idx_processing_jobs_merchant_file_hash
  ON processing_jobs(merchant_id, file_hash)
  WHERE file_hash IS NOT NULL;
-- ─────────────────────────────────────────────────────────────────────────────
-- 0045  Two-tier identity model: candidate signals vs confirmed identity links
--
-- Separates "this order looks related to a cluster" (candidate) from
-- "these accounts are confirmed to be the same person" (confirmed/definite).
-- Merchants can flag a confirmed link as a possible false positive, but that
-- flag is stored for Unauth review only — it does NOT unmerge the identity.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── audit_transactions: new identity columns ─────────────────────────────────
ALTER TABLE audit_transactions
  ADD COLUMN IF NOT EXISTS match_status text
      CHECK (match_status IN ('none', 'candidate', 'probable', 'definite'))
      NOT NULL DEFAULT 'none',

  -- Set for probable + definite rows (score ≥ 50).
  -- Distinct from cluster_id so callers can query the tier independently.
  ADD COLUMN IF NOT EXISTS candidate_cluster_id uuid,

  -- Set ONLY for definite rows (score ≥ 75).
  -- Intentionally separate from cluster_id / candidate_cluster_id.
  ADD COLUMN IF NOT EXISTS confirmed_identity_id uuid,

  -- Merchant-submitted false-positive flag.  Does NOT change match_status.
  ADD COLUMN IF NOT EXISTS false_positive_reported boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS false_positive_reported_at timestamptz;

-- Index the new status column so UI queries filter efficiently.
CREATE INDEX IF NOT EXISTS idx_audit_tx_match_status
  ON audit_transactions (match_status);

CREATE INDEX IF NOT EXISTS idx_audit_tx_confirmed_identity_id
  ON audit_transactions (confirmed_identity_id)
  WHERE confirmed_identity_id IS NOT NULL;

-- ── customer_profiles: identity tier fields ───────────────────────────────────
ALTER TABLE customer_profiles
  ADD COLUMN IF NOT EXISTS identity_status text
      CHECK (identity_status IN ('candidate', 'confirmed')),

  ADD COLUMN IF NOT EXISTS false_positive_reported boolean NOT NULL DEFAULT false;

-- ── Backfill match_status from legacy identity_confidence_grade ───────────────
UPDATE audit_transactions
SET match_status = CASE
  WHEN identity_confidence_grade = 'definite'  THEN 'definite'
  WHEN identity_confidence_grade = 'probable'  THEN 'probable'
  WHEN identity_confidence_grade = 'possible'  THEN 'candidate'
  ELSE 'none'
END
WHERE identity_confidence_grade IS NOT NULL;

-- ── Backfill confirmed_identity_id for existing definite rows ─────────────────
UPDATE audit_transactions
SET confirmed_identity_id = cluster_id
WHERE identity_confidence_grade = 'definite'
  AND cluster_id IS NOT NULL;

-- ── Backfill candidate_cluster_id for probable/possible rows ─────────────────
UPDATE audit_transactions
SET candidate_cluster_id = cluster_id
WHERE identity_confidence_grade IN ('probable', 'possible')
  AND cluster_id IS NOT NULL;

-- ── Backfill identity_status on customer_profiles ─────────────────────────────
UPDATE customer_profiles
SET identity_status = CASE
  WHEN identity_confidence_grade = 'definite'              THEN 'confirmed'
  WHEN identity_confidence_grade IN ('probable', 'possible') THEN 'candidate'
  ELSE NULL
END
WHERE identity_confidence_grade IS NOT NULL;

-- ── identity_false_positive_reports ──────────────────────────────────────────
-- Records every merchant-submitted false-positive report for Unauth review.
-- Immutable after insert — reviewers add notes / change status separately.
CREATE TABLE IF NOT EXISTS identity_false_positive_reports (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id            uuid        NOT NULL,
  reported_by_merchant_id text      NOT NULL,
  reported_at           timestamptz NOT NULL DEFAULT now(),

  -- Snapshot of the signals that caused the match, captured at report time.
  evidence_snapshot     jsonb,

  status                text        NOT NULL DEFAULT 'pending'
      CHECK (status IN ('pending', 'under_review', 'confirmed_fp', 'dismissed')),
  reviewer_notes        text,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fp_reports_cluster_id
  ON identity_false_positive_reports (cluster_id);

CREATE INDEX IF NOT EXISTS idx_fp_reports_merchant_id
  ON identity_false_positive_reports (reported_by_merchant_id);

-- ── identity_transitions ──────────────────────────────────────────────────────
-- Append-only audit log every time a cluster's match_status changes grade.
-- Enables re-scoring history and explainability for the Unauth team.
CREATE TABLE IF NOT EXISTS identity_transitions (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id                uuid        NOT NULL,
  from_status               text,
  to_status                 text        NOT NULL,
  score_before              numeric,
  score_after               numeric,
  triggering_transaction_id uuid,
  transitioned_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_id_transitions_cluster_id
  ON identity_transitions (cluster_id);
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
