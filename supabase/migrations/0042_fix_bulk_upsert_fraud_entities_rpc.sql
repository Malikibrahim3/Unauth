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
