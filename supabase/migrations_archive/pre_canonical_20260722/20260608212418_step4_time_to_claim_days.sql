-- Phase 2 Step 4a: Canonical time_to_claim_days on order_claim_context + view update.
--
-- Writes time_to_claim_days at claim ingestion (Step 4 ingestion mapper).
-- Updates v_time_to_claim_buckets to prefer canonical column with proxy fallback.

BEGIN;

ALTER TABLE public.order_claim_context
  ADD COLUMN IF NOT EXISTS time_to_claim_days integer;

COMMENT ON COLUMN public.order_claim_context.time_to_claim_days IS
  'Canonical days from delivery to claim opened. Written at claim ingestion. '
  'Equals days_since_delivery_at_claim when delivery date is known; NULL otherwise.';

CREATE OR REPLACE VIEW public.v_time_to_claim_buckets
WITH (security_invoker = true)
AS
SELECT
  occ.id AS order_claim_context_id,
  occ.support_case_id,
  occ.merchant_id,
  occ.order_ref,
  COALESCE(occ.time_to_claim_days, occ.days_since_delivery_at_claim) AS time_to_claim_days,
  CASE
    WHEN COALESCE(occ.time_to_claim_days, occ.days_since_delivery_at_claim) IS NULL THEN 'unknown'
    WHEN COALESCE(occ.time_to_claim_days, occ.days_since_delivery_at_claim) <= 0 THEN 'same_day'
    WHEN COALESCE(occ.time_to_claim_days, occ.days_since_delivery_at_claim) BETWEEN 1 AND 2 THEN '1_to_2_days'
    WHEN COALESCE(occ.time_to_claim_days, occ.days_since_delivery_at_claim) BETWEEN 3 AND 7 THEN '3_to_7_days'
    WHEN COALESCE(occ.time_to_claim_days, occ.days_since_delivery_at_claim) BETWEEN 8 AND 14 THEN '8_to_14_days'
    WHEN COALESCE(occ.time_to_claim_days, occ.days_since_delivery_at_claim) BETWEEN 15 AND 30 THEN '15_to_30_days'
    WHEN COALESCE(occ.time_to_claim_days, occ.days_since_delivery_at_claim) > 30 THEN 'over_30_days'
    ELSE 'unknown'
  END AS time_to_claim_bucket,
  occ.created_at
FROM public.order_claim_context occ;

COMMENT ON VIEW public.v_time_to_claim_buckets IS
  'Derived time-to-claim buckets. Sources canonical order_claim_context.time_to_claim_days '
  'with days_since_delivery_at_claim as fallback for rows ingested before Step 4.';

REVOKE ALL ON public.v_time_to_claim_buckets FROM anon, authenticated;
GRANT SELECT ON public.v_time_to_claim_buckets TO service_role;

COMMIT;
