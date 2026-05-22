-- Persist per-audit customer rollups so audit result pages do not aggregate
-- raw transactions on every request.

CREATE TABLE IF NOT EXISTS audit_customer_summaries (
  audit_id UUID NOT NULL REFERENCES processing_jobs(id) ON DELETE CASCADE,
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  customer_key TEXT NOT NULL,
  customer_email TEXT,
  customer_name TEXT,
  order_count INTEGER NOT NULL DEFAULT 0,
  total_spend NUMERIC NOT NULL DEFAULT 0,
  max_score NUMERIC NOT NULL DEFAULT 0,
  first_seen TIMESTAMPTZ,
  last_seen TIMESTAMPTZ,
  highest_grade TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (audit_id, customer_key)
);

CREATE INDEX IF NOT EXISTS idx_audit_customer_summaries_merchant_audit_score
  ON audit_customer_summaries(merchant_id, audit_id, max_score DESC, order_count DESC);

CREATE INDEX IF NOT EXISTS idx_audit_customer_summaries_audit_updated
  ON audit_customer_summaries(audit_id, updated_at DESC);

ALTER TABLE audit_customer_summaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_customer_summaries_service_all" ON audit_customer_summaries;
CREATE POLICY "audit_customer_summaries_service_all" ON audit_customer_summaries
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS audit_result_summaries (
  audit_id UUID PRIMARY KEY REFERENCES processing_jobs(id) ON DELETE CASCADE,
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  flagged_transactions INTEGER NOT NULL DEFAULT 0,
  definite_count INTEGER NOT NULL DEFAULT 0,
  probable_count INTEGER NOT NULL DEFAULT 0,
  possible_count INTEGER NOT NULL DEFAULT 0,
  weak_count INTEGER NOT NULL DEFAULT 0,
  linked_cluster_count INTEGER NOT NULL DEFAULT 0,
  customer_count INTEGER NOT NULL DEFAULT 0,
  value_at_risk NUMERIC NOT NULL DEFAULT 0,
  estimated_exposure NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_result_summaries_merchant_audit
  ON audit_result_summaries(merchant_id, audit_id);

ALTER TABLE audit_result_summaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_result_summaries_service_all" ON audit_result_summaries;
CREATE POLICY "audit_result_summaries_service_all" ON audit_result_summaries
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP FUNCTION IF EXISTS refresh_audit_customer_summaries(UUID, UUID);

CREATE OR REPLACE FUNCTION refresh_audit_customer_summaries(
  p_audit_id UUID,
  p_merchant_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rows_written INTEGER := 0;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM processing_jobs
    WHERE id = p_audit_id
      AND merchant_id = p_merchant_id
  ) THEN
    RAISE EXCEPTION 'Audit % is not owned by merchant %', p_audit_id, p_merchant_id
      USING ERRCODE = '42501';
  END IF;

  DELETE FROM audit_customer_summaries
  WHERE audit_id = p_audit_id
    AND merchant_id = p_merchant_id;

  WITH inserted AS (
    INSERT INTO audit_customer_summaries (
      audit_id,
      merchant_id,
      customer_key,
      customer_email,
      customer_name,
      order_count,
      total_spend,
      max_score,
      first_seen,
      last_seen,
      highest_grade,
      updated_at
    )
    SELECT
      p_audit_id,
      p_merchant_id,
      COALESCE(NULLIF(LOWER(TRIM(customer_email)), ''), NULLIF(LOWER(TRIM(customer_name)), ''), 'unknown customer') AS customer_key,
      MIN(NULLIF(customer_email, '')) AS customer_email,
      MIN(NULLIF(customer_name, '')) AS customer_name,
      COUNT(*)::INTEGER AS order_count,
      COALESCE(SUM(order_value), 0) AS total_spend,
      COALESCE(MAX(identity_score), 0) AS max_score,
      MIN(processed_at) AS first_seen,
      MAX(processed_at) AS last_seen,
      (ARRAY_AGG(
        identity_confidence_grade
        ORDER BY CASE identity_confidence_grade
          WHEN 'definite' THEN 4
          WHEN 'probable' THEN 3
          WHEN 'possible' THEN 2
          WHEN 'weak' THEN 1
          ELSE 0
        END DESC
      ))[1] AS highest_grade,
      NOW()
    FROM audit_transactions
    WHERE job_id = p_audit_id
      AND (
        identity_confidence_grade IN ('probable', 'definite')
        OR match_status IN ('probable', 'definite')
      )
      AND dismissed_by_merchant IS NOT TRUE
    GROUP BY COALESCE(NULLIF(LOWER(TRIM(customer_email)), ''), NULLIF(LOWER(TRIM(customer_name)), ''), 'unknown customer')
    RETURNING 1
  )
  SELECT COUNT(*)::INTEGER INTO rows_written FROM inserted;

  INSERT INTO audit_result_summaries (
    audit_id,
    merchant_id,
    flagged_transactions,
    definite_count,
    probable_count,
    possible_count,
    weak_count,
    linked_cluster_count,
    customer_count,
    value_at_risk,
    estimated_exposure,
    updated_at
  )
  SELECT
    p_audit_id,
    p_merchant_id,
    COALESCE(tx.flagged_transactions, 0),
    COALESCE(tx.definite_count, 0),
    COALESCE(tx.probable_count, 0),
    COALESCE(tx.possible_count, 0),
    COALESCE(tx.weak_count, 0),
    COALESCE(tx.linked_cluster_count, 0),
    COALESCE(customers.customer_count, 0),
    COALESCE(customers.value_at_risk, 0),
    COALESCE(customers.value_at_risk, 0) * 0.42,
    NOW()
  FROM (
    SELECT
      COUNT(*) FILTER (
        WHERE (
          identity_confidence_grade IN ('probable', 'definite')
          OR match_status IN ('probable', 'definite')
        )
        AND dismissed_by_merchant IS NOT TRUE
      )::INTEGER AS flagged_transactions,
      COUNT(*) FILTER (WHERE identity_confidence_grade = 'definite')::INTEGER AS definite_count,
      COUNT(*) FILTER (WHERE identity_confidence_grade = 'probable')::INTEGER AS probable_count,
      COUNT(*) FILTER (WHERE identity_confidence_grade = 'possible')::INTEGER AS possible_count,
      COUNT(*) FILTER (WHERE identity_confidence_grade = 'weak')::INTEGER AS weak_count,
      COUNT(cluster_id)::INTEGER AS linked_cluster_count
    FROM audit_transactions
    WHERE job_id = p_audit_id
  ) tx
  CROSS JOIN (
    SELECT
      COUNT(*)::INTEGER AS customer_count,
      COALESCE(SUM(total_spend), 0) AS value_at_risk
    FROM audit_customer_summaries
    WHERE audit_id = p_audit_id
      AND merchant_id = p_merchant_id
  ) customers
  ON CONFLICT (audit_id) DO UPDATE
    SET flagged_transactions = EXCLUDED.flagged_transactions,
        definite_count = EXCLUDED.definite_count,
        probable_count = EXCLUDED.probable_count,
        possible_count = EXCLUDED.possible_count,
        weak_count = EXCLUDED.weak_count,
        linked_cluster_count = EXCLUDED.linked_cluster_count,
        customer_count = EXCLUDED.customer_count,
        value_at_risk = EXCLUDED.value_at_risk,
        estimated_exposure = EXCLUDED.estimated_exposure,
        updated_at = NOW();

  RETURN rows_written;
END;
$$;

GRANT EXECUTE ON FUNCTION refresh_audit_customer_summaries(UUID, UUID) TO service_role;
