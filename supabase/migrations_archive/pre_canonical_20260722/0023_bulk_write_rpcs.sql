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
