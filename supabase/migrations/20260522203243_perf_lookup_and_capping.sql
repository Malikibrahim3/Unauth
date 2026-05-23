-- Performance hardening without changing engine behavior:
-- 1) Add RPC for cross-merchant candidate lookup using server-side set filters.
-- 2) Cap refund_timestamps growth in bulk_upsert_fraud_entities.

CREATE OR REPLACE FUNCTION search_cross_merchant_profiles(
  p_emails text[] DEFAULT '{}',
  p_ips text[] DEFAULT '{}',
  p_addresses text[] DEFAULT '{}',
  p_cards text[] DEFAULT '{}',
  p_min_merchants int DEFAULT 3,
  p_limit int DEFAULT 10000
)
RETURNS TABLE (
  id uuid,
  emails jsonb,
  ips jsonb,
  addresses jsonb,
  card_last4s jsonb,
  phones jsonb,
  total_orders integer,
  total_refund_claims integer,
  total_merchants_seen_at integer,
  merchant_ids jsonb
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    cp.id,
    cp.emails,
    cp.ips,
    cp.addresses,
    cp.card_last4s,
    cp.phones,
    cp.total_orders,
    cp.total_refund_claims,
    cp.total_merchants_seen_at,
    cp.merchant_ids
  FROM customer_profiles cp
  WHERE cp.total_merchants_seen_at >= GREATEST(COALESCE(p_min_merchants, 3), 1)
    AND (
      (COALESCE(array_length(p_emails, 1), 0) > 0 AND EXISTS (
        SELECT 1 FROM unnest(p_emails) v WHERE cp.emails @> to_jsonb(ARRAY[v])
      ))
      OR (COALESCE(array_length(p_ips, 1), 0) > 0 AND EXISTS (
        SELECT 1 FROM unnest(p_ips) v WHERE cp.ips @> to_jsonb(ARRAY[v])
      ))
      OR (COALESCE(array_length(p_addresses, 1), 0) > 0 AND EXISTS (
        SELECT 1 FROM unnest(p_addresses) v WHERE cp.addresses @> to_jsonb(ARRAY[v])
      ))
      OR (COALESCE(array_length(p_cards, 1), 0) > 0 AND EXISTS (
        SELECT 1 FROM unnest(p_cards) v WHERE cp.card_last4s @> to_jsonb(ARRAY[v])
      ))
    )
  ORDER BY cp.total_merchants_seen_at DESC, cp.last_seen DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 10000), 1), 20000);
$$;

REVOKE ALL ON FUNCTION search_cross_merchant_profiles(text[], text[], text[], text[], int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION search_cross_merchant_profiles(text[], text[], text[], text[], int, int) TO service_role;

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
    refund_timestamps   = (
      SELECT COALESCE(jsonb_agg(v ORDER BY ord), '[]'::jsonb)
      FROM (
        SELECT v, ord
        FROM (
          SELECT v, ord
          FROM jsonb_array_elements(COALESCE(fraud_entities.refund_timestamps, '[]'::jsonb)) WITH ORDINALITY t(v, ord)
          UNION ALL
          SELECT v, 1000000000 + ord
          FROM jsonb_array_elements(COALESCE(EXCLUDED.refund_timestamps, '[]'::jsonb)) WITH ORDINALITY t(v, ord)
        ) merged
        ORDER BY ord DESC
        LIMIT 120
      ) capped
    ),
    fastest_claim_days  = LEAST(
      COALESCE(fraud_entities.fastest_claim_days, 99999),
      COALESCE(EXCLUDED.fastest_claim_days, 99999)
    ),
    last_seen = now();
END;
$$;

GRANT EXECUTE ON FUNCTION bulk_upsert_fraud_entities(JSONB) TO service_role;
