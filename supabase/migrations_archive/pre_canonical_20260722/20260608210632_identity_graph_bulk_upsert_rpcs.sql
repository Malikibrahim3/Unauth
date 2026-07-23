-- Phase 2 Step 2: Bulk upsert RPCs for identity graph dual-write.
--
-- link_strength on conflict (canonical — see PHASE_2_IMPLEMENTATION_SPEC.md):
--   seen_count    = seen_count + EXCLUDED.seen_count
--   link_strength = 1.0 + (seen_count + EXCLUDED.seen_count - 1) * 0.5
-- Uses pre-increment seen_count for the strength calculation (same as single +1 case).

BEGIN;

CREATE OR REPLACE FUNCTION public.bulk_upsert_identity_identifiers(
  p_identifiers jsonb,
  p_source_provider text DEFAULT 'unknown'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.identity_identifiers (
    identifier_type,
    identifier_hash,
    source_provider,
    raw_vs_hashed_storage,
    first_seen_at,
    last_seen_at
  )
  SELECT
    (p->>'identifier_type')::text,
    (p->>'identifier_hash')::text,
    COALESCE(p_source_provider, 'unknown'),
    COALESCE(NULLIF(trim(p->>'raw_vs_hashed_storage'), ''), 'hashed'),
    now(),
    now()
  FROM jsonb_array_elements(p_identifiers) AS p
  WHERE
    (p->>'identifier_type') IS NOT NULL
    AND length(trim(p->>'identifier_type')) > 0
    AND (p->>'identifier_hash') IS NOT NULL
    AND length(trim(p->>'identifier_hash')) > 0
  ON CONFLICT (identifier_type, identifier_hash) DO UPDATE SET
    last_seen_at        = now(),
    source_provider     = EXCLUDED.source_provider,
    raw_vs_hashed_storage = EXCLUDED.raw_vs_hashed_storage,
    updated_at          = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.bulk_upsert_identifier_co_occurrence_edges(
  p_merchant_id uuid,
  p_edges jsonb,
  p_source_provider text DEFAULT 'unknown'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.identifier_co_occurrence_edges (
    merchant_id,
    left_identifier_type,
    left_identifier_hash,
    right_identifier_type,
    right_identifier_hash,
    source_provider,
    seen_count,
    link_strength,
    first_seen_at,
    last_seen_at
  )
  SELECT
    p_merchant_id,
    (p->>'left_type')::text,
    (p->>'left_hash')::text,
    (p->>'right_type')::text,
    (p->>'right_hash')::text,
    COALESCE(p_source_provider, 'unknown'),
    GREATEST(COALESCE((p->>'count_delta')::int, 1), 1),
    (1.0 + (GREATEST(COALESCE((p->>'count_delta')::int, 1), 1) - 1) * 0.5)::numeric(6, 2),
    now(),
    now()
  FROM jsonb_array_elements(p_edges) AS p
  WHERE
    p_merchant_id IS NOT NULL
    AND (p->>'left_type') IS NOT NULL
    AND length(trim(p->>'left_type')) > 0
    AND (p->>'left_hash') IS NOT NULL
    AND length(trim(p->>'left_hash')) > 0
    AND (p->>'right_type') IS NOT NULL
    AND length(trim(p->>'right_type')) > 0
    AND (p->>'right_hash') IS NOT NULL
    AND length(trim(p->>'right_hash')) > 0
    AND (p->>'left_type', p->>'left_hash')
        < (p->>'right_type', p->>'right_hash')
  ON CONFLICT (
    merchant_id,
    left_identifier_type,
    left_identifier_hash,
    right_identifier_type,
    right_identifier_hash
  ) DO UPDATE SET
    seen_count      = identifier_co_occurrence_edges.seen_count + EXCLUDED.seen_count,
    link_strength   = (
      1.0 + (identifier_co_occurrence_edges.seen_count + EXCLUDED.seen_count - 1) * 0.5
    )::numeric(6, 2),
    last_seen_at    = now(),
    source_provider = EXCLUDED.source_provider,
    updated_at      = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.bulk_upsert_identity_identifiers(jsonb, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.bulk_upsert_identifier_co_occurrence_edges(uuid, jsonb, text) TO service_role;

COMMIT;
