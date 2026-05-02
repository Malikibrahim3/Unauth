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
