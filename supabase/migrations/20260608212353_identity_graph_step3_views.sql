-- Phase 2 Step 3: Compatibility and derived views (no table changes).
--
-- Views created:
--   v_identifier_edges_cross_merchant  — network-level; is_cross_merchant derived
--   v_audit_transactions_legacy        — structural shim over audit_transactions
--   v_time_to_claim_buckets            — bucket enum from order_claim_context proxy
--
-- Deferred (after Step 4): v_merchant_identity_store_history,
--   v_network_cluster_intelligence, v_network_identifier_reach
--
-- NOT applied by this file's author unless explicitly approved.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. v_identifier_edges_cross_merchant
--    Cross-merchant signal = same edge tuple across multiple merchant_id values.
--    is_cross_merchant is derived here; k-anonymity thresholding stays in query layer.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_identifier_edges_cross_merchant
WITH (security_invoker = true)
AS
SELECT
  left_identifier_type,
  left_identifier_hash,
  right_identifier_type,
  right_identifier_hash,
  COUNT(DISTINCT merchant_id) AS participating_merchant_count,
  (COUNT(DISTINCT merchant_id) >= 2) AS is_cross_merchant
FROM public.identifier_co_occurrence_edges
GROUP BY
  left_identifier_type,
  left_identifier_hash,
  right_identifier_type,
  right_identifier_hash;

COMMENT ON VIEW public.v_identifier_edges_cross_merchant IS
  'Network-level edge reach. is_cross_merchant derived when participating_merchant_count >= 2. '
  'k-anonymity / aggregation thresholds applied at service-role query layer, not in this view.';

REVOKE ALL ON public.v_identifier_edges_cross_merchant FROM anon, authenticated;
GRANT SELECT ON public.v_identifier_edges_cross_merchant TO service_role;

-- ---------------------------------------------------------------------------
-- 2. v_audit_transactions_legacy
--    Structural compatibility shim — explicit column list mirrors audit_transactions.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_audit_transactions_legacy
WITH (security_invoker = true)
AS
SELECT
  id,
  job_id,
  order_id,
  customer_email,
  customer_name,
  shipping_address,
  billing_address,
  order_value,
  payment_method,
  card_last4,
  device_ip,
  account_created_at,
  previous_order_count,
  delivery_status,
  refund_claimed,
  refund_reason,
  chargeback_filed,
  match_score,
  fraud_flags,
  risk_level,
  processed_at,
  feedback_outcome,
  feedback_at,
  identity_confidence_grade,
  engine_version_id,
  match_status,
  candidate_cluster_id,
  confirmed_identity_id,
  false_positive_reported,
  false_positive_reported_at,
  identity_score,
  signals_matched,
  behavioural_flags,
  recommended_action,
  ce3_eligible,
  ce3_qualifying_transactions,
  cluster_id,
  dismissed_by_merchant,
  identity_match_score,
  identity_match_grade,
  identity_evidence,
  matched_datapoints,
  changed_datapoints,
  evidence_summary,
  context_flags,
  context_summary,
  ce3_signal_hashes,
  order_date,
  review_worthy,
  source,
  shop_domain,
  merchant_id
FROM public.audit_transactions;

COMMENT ON VIEW public.v_audit_transactions_legacy IS
  'Step 4 compatibility shim. Mirrors audit_transactions columns until callers migrate '
  'to platform_order_events + order_scoring_results.';

-- Inherits audit_transactions RLS via security_invoker — no extra grants.

-- ---------------------------------------------------------------------------
-- 3. v_time_to_claim_buckets
--    v1 proxy: uses order_claim_context.days_since_delivery_at_claim until
--    time_to_claim_days is written directly at claim ingestion.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_time_to_claim_buckets
WITH (security_invoker = true)
AS
SELECT
  occ.id AS order_claim_context_id,
  occ.support_case_id,
  occ.merchant_id,
  occ.order_ref,
  occ.days_since_delivery_at_claim AS time_to_claim_days,
  CASE
    WHEN occ.days_since_delivery_at_claim IS NULL THEN 'unknown'
    WHEN occ.days_since_delivery_at_claim <= 0 THEN 'same_day'
    WHEN occ.days_since_delivery_at_claim BETWEEN 1 AND 2 THEN '1_to_2_days'
    WHEN occ.days_since_delivery_at_claim BETWEEN 3 AND 7 THEN '3_to_7_days'
    WHEN occ.days_since_delivery_at_claim BETWEEN 8 AND 14 THEN '8_to_14_days'
    WHEN occ.days_since_delivery_at_claim BETWEEN 15 AND 30 THEN '15_to_30_days'
    WHEN occ.days_since_delivery_at_claim > 30 THEN 'over_30_days'
    ELSE 'unknown'
  END AS time_to_claim_bucket,
  occ.created_at
FROM public.order_claim_context occ;

COMMENT ON VIEW public.v_time_to_claim_buckets IS
  'Derived time-to-claim buckets. '
  'v1 PROXY: time_to_claim_days column aliases order_claim_context.days_since_delivery_at_claim — '
  'NOT the canonical time_to_claim_days field. When claim ingestion writes time_to_claim_days '
  'directly (Step 4+), update this view to source that column instead.';

REVOKE ALL ON public.v_time_to_claim_buckets FROM anon, authenticated;
GRANT SELECT ON public.v_time_to_claim_buckets TO service_role;

COMMIT;
