-- Manual backfill part 2: remaining skipped support / ops objects (v2-compatible).
-- Sources: 20260528150000, 20260530150000 (sections 1,2,5), 20260528210000 (RPC shim).

BEGIN;

-- ---------------------------------------------------------------------------
-- 20260528150000_support_case_intake_links (v2 FKs: identities + claims)
-- ---------------------------------------------------------------------------
ALTER TABLE public.support_case_intake
  ADD COLUMN IF NOT EXISTS shopify_order_id text,
  ADD COLUMN IF NOT EXISTS customer_profile_id uuid REFERENCES public.identities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS merchant_claim_id uuid REFERENCES public.claims(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS link_status text NOT NULL DEFAULT 'unlinked',
  ADD COLUMN IF NOT EXISTS linked_at timestamptz,
  ADD COLUMN IF NOT EXISTS link_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.support_case_intake
  DROP CONSTRAINT IF EXISTS support_case_intake_link_status_check;

ALTER TABLE public.support_case_intake
  ADD CONSTRAINT support_case_intake_link_status_check
  CHECK (link_status IN ('unlinked', 'linked', 'partial', 'ambiguous', 'not_found'));

CREATE INDEX IF NOT EXISTS support_case_intake_merchant_shopify_order_idx
  ON public.support_case_intake (merchant_id, shopify_order_id);

CREATE INDEX IF NOT EXISTS support_case_intake_merchant_customer_profile_idx
  ON public.support_case_intake (merchant_id, customer_profile_id);

CREATE INDEX IF NOT EXISTS support_case_intake_merchant_claim_idx
  ON public.support_case_intake (merchant_id, merchant_claim_id);

CREATE INDEX IF NOT EXISTS support_case_intake_merchant_link_status_idx
  ON public.support_case_intake (merchant_id, link_status);

-- ---------------------------------------------------------------------------
-- 20260530150000 section 1: support_case_intake signal columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.support_case_intake
  ADD COLUMN IF NOT EXISTS channel text,
  ADD COLUMN IF NOT EXISTS message_count int,
  ADD COLUMN IF NOT EXISTS customer_reply_count int,
  ADD COLUMN IF NOT EXISTS was_reopened boolean,
  ADD COLUMN IF NOT EXISTS macros_used jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS sentiment_score numeric,
  ADD COLUMN IF NOT EXISTS chargeback_threatened boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_claim boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS claim_type text,
  ADD COLUMN IF NOT EXISTS claim_type_confidence numeric,
  ADD COLUMN IF NOT EXISTS provided_evidence boolean,
  ADD COLUMN IF NOT EXISTS accepted_first_resolution boolean,
  ADD COLUMN IF NOT EXISTS resolution_type text,
  ADD COLUMN IF NOT EXISTS escalation_count int,
  ADD COLUMN IF NOT EXISTS time_to_first_claim_message_seconds int;

ALTER TABLE public.support_case_intake
  DROP CONSTRAINT IF EXISTS support_case_intake_claim_type_check;

ALTER TABLE public.support_case_intake
  ADD CONSTRAINT support_case_intake_claim_type_check
  CHECK (claim_type IS NULL OR claim_type IN ('INR', 'damaged', 'wrong_item', 'not_as_described', 'other'));

ALTER TABLE public.support_case_intake
  DROP CONSTRAINT IF EXISTS support_case_intake_claim_type_confidence_check;

ALTER TABLE public.support_case_intake
  ADD CONSTRAINT support_case_intake_claim_type_confidence_check
  CHECK (claim_type_confidence IS NULL OR (claim_type_confidence >= 0 AND claim_type_confidence <= 1));

CREATE INDEX IF NOT EXISTS support_case_intake_merchant_is_claim_idx
  ON public.support_case_intake (merchant_id, is_claim);

CREATE INDEX IF NOT EXISTS support_case_intake_merchant_claim_type_idx
  ON public.support_case_intake (merchant_id, claim_type);

-- ---------------------------------------------------------------------------
-- 20260530150000 section 2: order_claim_context
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_claim_context (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  support_case_id uuid NOT NULL REFERENCES public.support_case_intake(id) ON DELETE CASCADE,
  merchant_id uuid NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  order_ref text,
  order_value numeric,
  order_created_at timestamptz,
  fulfillment_status_at_claim text,
  delivery_status_at_claim text,
  shipping_carrier text,
  tracking_number text,
  days_since_order_at_claim int,
  days_since_delivery_at_claim int,
  payment_method text,
  discount_code_used boolean,
  discount_amount numeric,
  is_first_order boolean,
  shipping_equals_billing boolean,
  was_refunded_previously boolean,
  refund_amount_requested numeric,
  refund_amount_approved numeric,
  partial_refund boolean,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT order_claim_context_support_case_unique UNIQUE (support_case_id)
);

CREATE INDEX IF NOT EXISTS order_claim_context_merchant_idx
  ON public.order_claim_context (merchant_id);

CREATE INDEX IF NOT EXISTS order_claim_context_merchant_order_ref_idx
  ON public.order_claim_context (merchant_id, order_ref);

-- ---------------------------------------------------------------------------
-- 20260530150000 section 5: identity_link_candidates
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.identity_link_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_customer_email_hash text NOT NULL,
  linked_customer_email_hash text NOT NULL,
  merchant_id_a uuid NOT NULL,
  merchant_id_b uuid NOT NULL,
  link_type text NOT NULL,
  link_confidence numeric NOT NULL,
  detected_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT identity_link_candidates_link_type_check
    CHECK (link_type IN ('email_match', 'phone_match', 'address_match', 'device_match', 'name_fuzzy_match')),
  CONSTRAINT identity_link_candidates_confidence_check
    CHECK (link_confidence >= 0 AND link_confidence <= 1),
  CONSTRAINT identity_link_candidates_unique
    UNIQUE (primary_customer_email_hash, linked_customer_email_hash, merchant_id_a, merchant_id_b, link_type)
);

CREATE INDEX IF NOT EXISTS identity_link_candidates_primary_idx
  ON public.identity_link_candidates (primary_customer_email_hash);

CREATE INDEX IF NOT EXISTS identity_link_candidates_linked_idx
  ON public.identity_link_candidates (linked_customer_email_hash);

-- ---------------------------------------------------------------------------
-- RLS for new tables (service-role only)
-- ---------------------------------------------------------------------------
ALTER TABLE public.order_claim_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.identity_link_candidates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_role_only_order_claim_context_all ON public.order_claim_context;
CREATE POLICY service_role_only_order_claim_context_all
  ON public.order_claim_context FOR ALL TO public
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS service_role_only_identity_link_candidates_all ON public.identity_link_candidates;
CREATE POLICY service_role_only_identity_link_candidates_all
  ON public.identity_link_candidates FOR ALL TO public
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

REVOKE ALL ON public.order_claim_context FROM authenticated;
REVOKE ALL ON public.order_claim_context FROM anon;
REVOKE ALL ON public.identity_link_candidates FROM authenticated;
REVOKE ALL ON public.identity_link_candidates FROM anon;

GRANT ALL ON public.order_claim_context TO service_role;
GRANT ALL ON public.identity_link_candidates TO service_role;

-- ---------------------------------------------------------------------------
-- commerce_store_connections compatibility view (read fallback for legacy queries)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.commerce_store_connections AS
SELECT
  id,
  merchant_id,
  platform::text AS platform,
  store_key,
  COALESCE(store_url, '') AS store_url,
  status::text AS status,
  credentials_encrypted,
  uninstalled_at,
  last_sync_at,
  last_error,
  created_at,
  updated_at
FROM public.store_connections
WHERE platform::text IN ('woocommerce', 'bigcommerce');

GRANT SELECT ON public.commerce_store_connections TO service_role;

-- ---------------------------------------------------------------------------
-- 20260528210000 shim: chunk RPCs over sync_job_chunks / sync_jobs
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.register_processing_job_chunks(
  p_job_id uuid,
  p_merchant_id uuid,
  p_total_chunks int,
  p_storage_path text,
  p_column_map jsonb DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_total_chunks < 1 THEN
    RETURN;
  END IF;

  UPDATE public.sync_jobs
  SET storage_path = p_storage_path,
      column_map = p_column_map,
      updated_at = now()
  WHERE id = p_job_id
    AND merchant_id = p_merchant_id;

  INSERT INTO public.sync_job_chunks (job_id, chunk_index, status)
  SELECT p_job_id, g.i, 'pending'::sync_job_status
  FROM generate_series(0, p_total_chunks - 1) AS g(i)
  ON CONFLICT (job_id, chunk_index) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.begin_processing_job_chunk(
  p_job_id uuid,
  p_chunk_index int
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status sync_job_status;
BEGIN
  SELECT status INTO v_status
  FROM public.sync_job_chunks
  WHERE job_id = p_job_id AND chunk_index = p_chunk_index
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 'missing';
  END IF;

  IF v_status = 'completed' THEN
    RETURN 'completed';
  END IF;

  UPDATE public.sync_job_chunks
  SET status = 'running'::sync_job_status,
      claimed_at = COALESCE(claimed_at, now())
  WHERE job_id = p_job_id AND chunk_index = p_chunk_index;

  RETURN 'processing';
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_processing_job_chunk(
  p_job_id uuid,
  p_chunk_index int
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.sync_job_chunks
  SET status = 'completed'::sync_job_status,
      completed_at = now(),
      last_error = NULL
  WHERE job_id = p_job_id AND chunk_index = p_chunk_index;
END;
$$;

CREATE OR REPLACE FUNCTION public.fail_processing_job_chunk(
  p_job_id uuid,
  p_chunk_index int,
  p_error text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.sync_job_chunks
  SET status = 'failed'::sync_job_status,
      last_error = p_error,
      completed_at = now()
  WHERE job_id = p_job_id AND chunk_index = p_chunk_index;
END;
$$;

CREATE OR REPLACE FUNCTION public.next_pending_processing_chunk_index(p_job_id uuid)
RETURNS int
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT chunk_index
  FROM public.sync_job_chunks
  WHERE job_id = p_job_id AND status = 'pending'::sync_job_status
  ORDER BY chunk_index ASC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.all_processing_job_chunks_complete(p_job_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.sync_job_chunks
    WHERE job_id = p_job_id AND status <> 'completed'::sync_job_status
  )
  AND EXISTS (
    SELECT 1 FROM public.sync_job_chunks WHERE job_id = p_job_id
  );
$$;

CREATE OR REPLACE FUNCTION public.try_claim_job_finalize(p_job_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claimed boolean;
BEGIN
  IF NOT public.all_processing_job_chunks_complete(p_job_id) THEN
    RETURN false;
  END IF;

  UPDATE public.sync_jobs
  SET finalize_claimed_at = now(),
      updated_at = now()
  WHERE id = p_job_id
    AND finalize_claimed_at IS NULL
    AND status NOT IN ('completed'::sync_job_status, 'failed'::sync_job_status)
  RETURNING true INTO v_claimed;

  RETURN COALESCE(v_claimed, false);
END;
$$;

REVOKE ALL ON FUNCTION public.register_processing_job_chunks(uuid, uuid, int, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.begin_processing_job_chunk(uuid, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_processing_job_chunk(uuid, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fail_processing_job_chunk(uuid, int, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.next_pending_processing_chunk_index(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.all_processing_job_chunks_complete(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.try_claim_job_finalize(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.register_processing_job_chunks(uuid, uuid, int, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.begin_processing_job_chunk(uuid, int) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_processing_job_chunk(uuid, int) TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_processing_job_chunk(uuid, int, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.next_pending_processing_chunk_index(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.all_processing_job_chunks_complete(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.try_claim_job_finalize(uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- 0081 audit summaries (v2: audit_id -> sync_jobs, source from source_orders)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_customer_summaries (
  audit_id uuid NOT NULL REFERENCES public.sync_jobs(id) ON DELETE CASCADE,
  merchant_id uuid NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  customer_key text NOT NULL,
  customer_email text,
  customer_name text,
  order_count integer NOT NULL DEFAULT 0,
  total_spend numeric NOT NULL DEFAULT 0,
  max_score numeric NOT NULL DEFAULT 0,
  first_seen timestamptz,
  last_seen timestamptz,
  highest_grade text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (audit_id, customer_key)
);

CREATE INDEX IF NOT EXISTS idx_audit_customer_summaries_merchant_audit_score
  ON public.audit_customer_summaries(merchant_id, audit_id, max_score DESC, order_count DESC);

CREATE INDEX IF NOT EXISTS idx_audit_customer_summaries_audit_updated
  ON public.audit_customer_summaries(audit_id, updated_at DESC);

ALTER TABLE public.audit_customer_summaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_customer_summaries_service_all ON public.audit_customer_summaries;
CREATE POLICY audit_customer_summaries_service_all
  ON public.audit_customer_summaries
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.audit_result_summaries (
  audit_id uuid PRIMARY KEY REFERENCES public.sync_jobs(id) ON DELETE CASCADE,
  merchant_id uuid NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  flagged_transactions integer NOT NULL DEFAULT 0,
  definite_count integer NOT NULL DEFAULT 0,
  probable_count integer NOT NULL DEFAULT 0,
  possible_count integer NOT NULL DEFAULT 0,
  weak_count integer NOT NULL DEFAULT 0,
  linked_cluster_count integer NOT NULL DEFAULT 0,
  customer_count integer NOT NULL DEFAULT 0,
  value_at_risk numeric NOT NULL DEFAULT 0,
  estimated_exposure numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_result_summaries_merchant_audit
  ON public.audit_result_summaries(merchant_id, audit_id);

ALTER TABLE public.audit_result_summaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_result_summaries_service_all ON public.audit_result_summaries;
CREATE POLICY audit_result_summaries_service_all
  ON public.audit_result_summaries
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

GRANT ALL ON public.audit_customer_summaries TO service_role;
GRANT ALL ON public.audit_result_summaries TO service_role;

-- Add audit scoring columns to source_orders when absent (CSV audit pipeline).
ALTER TABLE public.source_orders
  ADD COLUMN IF NOT EXISTS job_id uuid REFERENCES public.sync_jobs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS customer_email text,
  ADD COLUMN IF NOT EXISTS customer_name text,
  ADD COLUMN IF NOT EXISTS order_value numeric,
  ADD COLUMN IF NOT EXISTS processed_at timestamptz,
  ADD COLUMN IF NOT EXISTS identity_score numeric,
  ADD COLUMN IF NOT EXISTS identity_confidence_grade text,
  ADD COLUMN IF NOT EXISTS match_status text,
  ADD COLUMN IF NOT EXISTS dismissed_by_merchant boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cluster_id uuid;

CREATE INDEX IF NOT EXISTS idx_source_orders_job_id
  ON public.source_orders(job_id)
  WHERE job_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.refresh_audit_customer_summaries(
  p_audit_id uuid,
  p_merchant_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rows_written integer := 0;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.sync_jobs
    WHERE id = p_audit_id
      AND merchant_id = p_merchant_id
  ) THEN
    RAISE EXCEPTION 'Audit % is not owned by merchant %', p_audit_id, p_merchant_id
      USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.audit_customer_summaries
  WHERE audit_id = p_audit_id
    AND merchant_id = p_merchant_id;

  WITH inserted AS (
    INSERT INTO public.audit_customer_summaries (
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
      COALESCE(NULLIF(LOWER(TRIM(customer_email)), ''), NULLIF(LOWER(TRIM(customer_name)), ''), NULLIF(LOWER(TRIM(email)), ''), 'unknown customer') AS customer_key,
      MIN(NULLIF(COALESCE(customer_email, email), '')) AS customer_email,
      MIN(NULLIF(customer_name, '')) AS customer_name,
      COUNT(*)::integer AS order_count,
      COALESCE(SUM(COALESCE(order_value, total_price, 0)), 0) AS total_spend,
      COALESCE(MAX(identity_score), 0) AS max_score,
      MIN(COALESCE(processed_at, placed_at, ingested_at)) AS first_seen,
      MAX(COALESCE(processed_at, placed_at, ingested_at)) AS last_seen,
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
      now()
    FROM public.source_orders
    WHERE job_id = p_audit_id
      AND merchant_id = p_merchant_id
      AND (
        identity_confidence_grade IN ('probable', 'definite')
        OR match_status IN ('probable', 'definite')
      )
      AND dismissed_by_merchant IS NOT TRUE
    GROUP BY COALESCE(NULLIF(LOWER(TRIM(customer_email)), ''), NULLIF(LOWER(TRIM(customer_name)), ''), NULLIF(LOWER(TRIM(email)), ''), 'unknown customer')
    RETURNING 1
  )
  SELECT COUNT(*)::integer INTO rows_written FROM inserted;

  INSERT INTO public.audit_result_summaries (
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
    now()
  FROM (
    SELECT
      COUNT(*) FILTER (
        WHERE (
          identity_confidence_grade IN ('probable', 'definite')
          OR match_status IN ('probable', 'definite')
        )
        AND dismissed_by_merchant IS NOT TRUE
      )::integer AS flagged_transactions,
      COUNT(*) FILTER (WHERE identity_confidence_grade = 'definite')::integer AS definite_count,
      COUNT(*) FILTER (WHERE identity_confidence_grade = 'probable')::integer AS probable_count,
      COUNT(*) FILTER (WHERE identity_confidence_grade = 'possible')::integer AS possible_count,
      COUNT(*) FILTER (WHERE identity_confidence_grade = 'weak')::integer AS weak_count,
      COUNT(cluster_id)::integer AS linked_cluster_count
    FROM public.source_orders
    WHERE job_id = p_audit_id
      AND merchant_id = p_merchant_id
  ) tx
  CROSS JOIN (
    SELECT
      COUNT(*)::integer AS customer_count,
      COALESCE(SUM(total_spend), 0) AS value_at_risk
    FROM public.audit_customer_summaries
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
        updated_at = now();

  RETURN rows_written;
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_audit_customer_summaries(uuid, uuid) TO service_role;

COMMIT;
