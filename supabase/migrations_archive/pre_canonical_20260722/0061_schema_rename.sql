-- =============================================================================
-- 0061_schema_rename.sql (originally 0028)
-- Idempotent version: renames are skipped if the target already exists.
-- =============================================================================

-- 1. Rename fraud_transactions → audit_transactions (if not already done)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fraud_transactions' AND table_schema = 'public') THEN
    ALTER TABLE fraud_transactions RENAME TO audit_transactions;
  END IF;
END $$;

-- 2. Rename fraud_score → match_score on audit_transactions (if not already done)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_transactions' AND column_name = 'fraud_score') THEN
    ALTER TABLE audit_transactions RENAME COLUMN fraud_score TO match_score;
  END IF;
END $$;

-- 3. Rename fraud_score → match_score on transactions eval table (if not already done)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'fraud_score') THEN
    ALTER TABLE transactions RENAME COLUMN fraud_score TO match_score;
  END IF;
END $$;

-- 4. Add identity_confidence_grade to audit_transactions
ALTER TABLE audit_transactions
  ADD COLUMN IF NOT EXISTS identity_confidence_grade text
    CHECK (identity_confidence_grade IN ('definite', 'probable', 'possible', 'weak'));

-- 5. Create engine_versions table
CREATE TABLE IF NOT EXISTS engine_versions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_number text        NOT NULL,
  deployed_at    timestamptz NOT NULL DEFAULT now(),
  signal_weights jsonb       NOT NULL,
  thresholds     jsonb       NOT NULL,
  notes          text
);

INSERT INTO engine_versions (version_number, signal_weights, thresholds, notes)
VALUES (
  '0.1.0',
  '{"refundRate":20,"inrAbuse":25,"velocity":10,"inrSpeed":10,"emailPattern":8,"addressClustering":12,"valueAnomaly":5,"crossMerchant":30,"paymentChurn":5}',
  '{"medium":25,"high":50,"critical":75,"flagThreshold":25}',
  'Initial version — baseline after schema cleanup and cross-merchant signal implementation'
)
ON CONFLICT DO NOTHING;

-- 6. Add engine_version_id FK to audit_transactions and processing_jobs
ALTER TABLE audit_transactions
  ADD COLUMN IF NOT EXISTS engine_version_id uuid REFERENCES engine_versions(id);

ALTER TABLE processing_jobs
  ADD COLUMN IF NOT EXISTS engine_version_id uuid REFERENCES engine_versions(id);

-- 7. Extend access_audit_log
ALTER TABLE access_audit_log
  ADD COLUMN IF NOT EXISTS lookup_type text,
  ADD COLUMN IF NOT EXISTS request_ip  text;

-- 8. Rename indexes (IF EXISTS already guards these)
ALTER INDEX IF EXISTS idx_fraud_transactions_job   RENAME TO idx_audit_transactions_job;
ALTER INDEX IF EXISTS idx_fraud_transactions_order RENAME TO idx_audit_transactions_order;
ALTER INDEX IF EXISTS idx_fraud_transactions_risk  RENAME TO idx_audit_transactions_risk;

-- 9. Rename fraud_score_avg → match_score_avg on fraud_entities
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fraud_entities' AND column_name = 'fraud_score_avg') THEN
    ALTER TABLE fraud_entities RENAME COLUMN fraud_score_avg TO match_score_avg;
  END IF;
END $$;
