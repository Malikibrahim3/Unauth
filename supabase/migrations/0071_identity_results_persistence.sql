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
