-- Persistent cross-run identity graph.
-- Stores normalized identity attributes and privacy-safe appearance/link metadata.

CREATE TABLE IF NOT EXISTS global_identity_attributes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attribute_type text NOT NULL CHECK (attribute_type IN ('email', 'phone', 'address', 'ip', 'device', 'card_last4')),
  attribute_value text NOT NULL,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  merchant_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  audit_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  appearance_count integer NOT NULL DEFAULT 0,
  cross_merchant_count integer NOT NULL DEFAULT 0,
  confidence_grade text NOT NULL DEFAULT 'weak' CHECK (confidence_grade IN ('weak', 'possible', 'probable', 'definite')),
  UNIQUE(attribute_type, attribute_value)
);

CREATE TABLE IF NOT EXISTS global_identity_appearances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attribute_id uuid NOT NULL REFERENCES global_identity_attributes(id) ON DELETE CASCADE,
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  audit_id uuid NOT NULL REFERENCES processing_jobs(id) ON DELETE CASCADE,
  transaction_id uuid REFERENCES audit_transactions(id) ON DELETE SET NULL,
  order_id text,
  confidence_grade text NOT NULL DEFAULT 'weak' CHECK (confidence_grade IN ('weak', 'possible', 'probable', 'definite')),
  matched_signal_count integer NOT NULL DEFAULT 1,
  appeared_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(attribute_id, merchant_id, audit_id, order_id)
);

CREATE TABLE IF NOT EXISTS global_identity_clusters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES customer_profiles(id) ON DELETE SET NULL,
  attribute_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  merchant_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  audit_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  order_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  confidence_grade text NOT NULL DEFAULT 'weak' CHECK (confidence_grade IN ('weak', 'possible', 'probable', 'definite')),
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS global_identity_cluster_attributes (
  cluster_id uuid NOT NULL REFERENCES global_identity_clusters(id) ON DELETE CASCADE,
  attribute_id uuid NOT NULL REFERENCES global_identity_attributes(id) ON DELETE CASCADE,
  PRIMARY KEY(cluster_id, attribute_id)
);

CREATE INDEX IF NOT EXISTS idx_global_identity_attributes_lookup
  ON global_identity_attributes(attribute_type, attribute_value);
CREATE INDEX IF NOT EXISTS idx_global_identity_attributes_merchants
  ON global_identity_attributes USING gin(merchant_ids jsonb_path_ops);
CREATE INDEX IF NOT EXISTS idx_global_identity_attributes_audits
  ON global_identity_attributes USING gin(audit_ids jsonb_path_ops);
CREATE INDEX IF NOT EXISTS idx_global_identity_appearances_merchant_audit
  ON global_identity_appearances(merchant_id, audit_id);
CREATE INDEX IF NOT EXISTS idx_global_identity_appearances_attribute
  ON global_identity_appearances(attribute_id);
CREATE INDEX IF NOT EXISTS idx_global_identity_clusters_merchants
  ON global_identity_clusters USING gin(merchant_ids jsonb_path_ops);
CREATE INDEX IF NOT EXISTS idx_global_identity_clusters_confidence
  ON global_identity_clusters(confidence_grade);

ALTER TABLE global_identity_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_identity_appearances ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_identity_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_identity_cluster_attributes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "global_identity_attributes_service" ON global_identity_attributes
  FOR ALL TO service_role USING (true);
CREATE POLICY "global_identity_appearances_service" ON global_identity_appearances
  FOR ALL TO service_role USING (true);
CREATE POLICY "global_identity_clusters_service" ON global_identity_clusters
  FOR ALL TO service_role USING (true);
CREATE POLICY "global_identity_cluster_attributes_service" ON global_identity_cluster_attributes
  FOR ALL TO service_role USING (true);

GRANT ALL ON global_identity_attributes TO service_role;
GRANT ALL ON global_identity_appearances TO service_role;
GRANT ALL ON global_identity_clusters TO service_role;
GRANT ALL ON global_identity_cluster_attributes TO service_role;
