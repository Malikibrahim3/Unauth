-- Phase 2 Step 6.6: Identity graph coverage observability (read-only, service_role only).
--
-- Provides get_identity_graph_coverage() RPC for Step 7 readiness monitoring.
-- No table changes. No materialized views. No authenticated access.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_identity_graph_coverage(
  p_synthetic_raw_prefixes text[] DEFAULT ARRAY['dual_write_verify_20260608']
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  WITH synthetic_raw AS (
    SELECT unnest(p_synthetic_raw_prefixes) AS prefix
  ),
  synthetic_identifier AS (
    SELECT ii.id
    FROM public.identity_identifiers ii
    WHERE ii.raw_vs_hashed_storage = 'raw'
      AND EXISTS (
        SELECT 1
        FROM synthetic_raw sr
        WHERE ii.identifier_hash LIKE sr.prefix || '%'
      )
  ),
  synthetic_edge AS (
    SELECT e.id
    FROM public.identifier_co_occurrence_edges e
    WHERE EXISTS (
      SELECT 1
      FROM synthetic_raw sr
      WHERE e.left_identifier_hash LIKE sr.prefix || '%'
         OR e.right_identifier_hash LIKE sr.prefix || '%'
    )
  ),
  plaintext_pii AS (
    SELECT COUNT(*)::bigint AS cnt
    FROM public.identity_identifiers ii
    WHERE (
      ii.identifier_type IN (
        'normalized_email_hash',
        'phone_e164_hash',
        'full_normalized_shipping_address_hash',
        'full_normalized_billing_address_hash'
      )
      AND ii.raw_vs_hashed_storage = 'raw'
    )
    OR (
      ii.identifier_type = 'normalized_email_hash'
      AND ii.identifier_hash LIKE '%@%'
    )
  ),
  edge_stats AS (
    SELECT
      COUNT(*)::bigint AS total,
      COUNT(*) FILTER (WHERE seen_count > 1)::bigint AS seen_count_gt_1,
      COALESCE(AVG(link_strength), 0)::numeric(10, 2) AS link_strength_avg,
      COALESCE(MAX(link_strength), 0)::numeric(10, 2) AS link_strength_max,
      COUNT(DISTINCT merchant_id)::bigint AS distinct_merchants,
      COUNT(*) FILTER (WHERE last_seen_at >= now() - interval '24 hours')::bigint AS activity_24h,
      COUNT(*) FILTER (WHERE last_seen_at >= now() - interval '7 days')::bigint AS activity_7d,
      COUNT(*) FILTER (WHERE last_seen_at >= now() - interval '30 days')::bigint AS activity_30d,
      COUNT(*) FILTER (WHERE id IN (SELECT id FROM synthetic_edge))::bigint AS synthetic_total,
      COUNT(*) FILTER (
        WHERE source_provider = 'csv'
          AND id NOT IN (SELECT id FROM synthetic_edge)
      )::bigint AS real_csv_edges,
      COUNT(*) FILTER (
        WHERE source_provider IN ('gorgias', 'shopify', 'bigcommerce', 'woocommerce')
          AND id NOT IN (SELECT id FROM synthetic_edge)
      )::bigint AS real_support_commerce_edges
    FROM public.identifier_co_occurrence_edges
  ),
  cross_merchant AS (
    SELECT
      COUNT(*)::bigint AS total_edge_tuples,
      COUNT(*) FILTER (WHERE is_cross_merchant)::bigint AS cross_merchant_tuples
    FROM public.v_identifier_edges_cross_merchant
  )
  SELECT jsonb_build_object(
    'generated_at', to_jsonb(now()),
    'identity_identifiers', jsonb_build_object(
      'total', (SELECT COUNT(*)::bigint FROM public.identity_identifiers),
      'by_type', COALESCE(
        (
          SELECT jsonb_agg(jsonb_build_object('identifier_type', identifier_type, 'count', cnt) ORDER BY identifier_type)
          FROM (
            SELECT identifier_type, COUNT(*)::bigint AS cnt
            FROM public.identity_identifiers
            GROUP BY identifier_type
          ) t
        ),
        '[]'::jsonb
      ),
      'by_source_provider', COALESCE(
        (
          SELECT jsonb_agg(jsonb_build_object('source_provider', source_provider, 'count', cnt) ORDER BY source_provider)
          FROM (
            SELECT source_provider, COUNT(*)::bigint AS cnt
            FROM public.identity_identifiers
            GROUP BY source_provider
          ) t
        ),
        '[]'::jsonb
      ),
      'synthetic_raw_count', (SELECT COUNT(*)::bigint FROM synthetic_identifier),
      'plaintext_pii_violations', (SELECT cnt FROM plaintext_pii)
    ),
    'identifier_co_occurrence_edges', jsonb_build_object(
      'total', (SELECT total FROM edge_stats),
      'by_source_provider', COALESCE(
        (
          SELECT jsonb_agg(jsonb_build_object('source_provider', source_provider, 'count', cnt) ORDER BY source_provider)
          FROM (
            SELECT source_provider, COUNT(*)::bigint AS cnt
            FROM public.identifier_co_occurrence_edges
            GROUP BY source_provider
          ) t
        ),
        '[]'::jsonb
      ),
      'by_merchant_id', COALESCE(
        (
          SELECT jsonb_agg(jsonb_build_object('merchant_id', merchant_id, 'count', cnt) ORDER BY cnt DESC)
          FROM (
            SELECT merchant_id, COUNT(*)::bigint AS cnt
            FROM public.identifier_co_occurrence_edges
            GROUP BY merchant_id
          ) t
        ),
        '[]'::jsonb
      ),
      'by_pair_type', COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'left_identifier_type', left_identifier_type,
              'right_identifier_type', right_identifier_type,
              'count', cnt
            )
            ORDER BY cnt DESC, left_identifier_type, right_identifier_type
          )
          FROM (
            SELECT
              left_identifier_type,
              right_identifier_type,
              COUNT(*)::bigint AS cnt
            FROM public.identifier_co_occurrence_edges
            GROUP BY left_identifier_type, right_identifier_type
          ) t
        ),
        '[]'::jsonb
      ),
      'seen_count_gt_1', (SELECT seen_count_gt_1 FROM edge_stats),
      'link_strength_avg', (SELECT link_strength_avg FROM edge_stats),
      'link_strength_max', (SELECT link_strength_max FROM edge_stats),
      'distinct_merchants', (SELECT distinct_merchants FROM edge_stats),
      'activity', jsonb_build_object(
        'last_24h', (SELECT activity_24h FROM edge_stats),
        'last_7d', (SELECT activity_7d FROM edge_stats),
        'last_30d', (SELECT activity_30d FROM edge_stats)
      ),
      'synthetic_count', (SELECT synthetic_total FROM edge_stats),
      'real_csv_edges', (SELECT real_csv_edges FROM edge_stats),
      'real_support_commerce_edges', (SELECT real_support_commerce_edges FROM edge_stats)
    ),
    'cross_merchant', (
      SELECT jsonb_build_object(
        'total_edge_tuples', total_edge_tuples,
        'cross_merchant_tuples', cross_merchant_tuples
      )
      FROM cross_merchant
    ),
    'legacy', jsonb_build_object(
      'fraud_entities', (SELECT COUNT(*)::bigint FROM public.fraud_entities),
      'fraud_entity_co_occurrences', (SELECT COUNT(*)::bigint FROM public.fraud_entity_co_occurrences)
    ),
    'synthetic_detection', jsonb_build_object(
      'raw_prefixes', to_jsonb(p_synthetic_raw_prefixes),
      'note', 'Hashed PII cannot be reversed; synthetic rows detected via raw platform/helpdesk ID prefixes only.'
    )
  );
$$;

COMMENT ON FUNCTION public.get_identity_graph_coverage(text[]) IS
  'Step 6.6 coverage snapshot for identity graph Step 7 readiness. '
  'Service_role only. No plaintext PII exposed — aggregates and UUID merchant_id only.';

REVOKE ALL ON FUNCTION public.get_identity_graph_coverage(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_identity_graph_coverage(text[]) TO service_role;

COMMIT;
