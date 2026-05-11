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
  generated_for_order_id   uuid REFERENCES fraud_transactions(id),
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
