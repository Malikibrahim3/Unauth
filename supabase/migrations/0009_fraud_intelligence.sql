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
