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
