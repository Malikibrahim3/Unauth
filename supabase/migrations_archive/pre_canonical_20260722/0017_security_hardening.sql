-- ===========================================================================
-- 0017_security_hardening.sql
-- ---------------------------------------------------------------------------
-- Closes three critical data-isolation gaps and adds the live-lookup RPC.
--
-- GAP 1: fraud_transactions
--   Old policy: FOR ALL USING (auth.uid() IS NOT NULL)
--   → any authenticated merchant could read every other merchant's rows
--   Fix: scope to the merchant's own processing_jobs
--
-- GAP 2: customer_profiles
--   Old policy: FOR SELECT TO authenticated USING (true)
--   → all authenticated merchants could read raw PII from all merchants
--   Fix: only see profiles where YOUR merchant_id is in merchant_ids[]
--        Cross-merchant lookup goes through search_customer_profiles() RPC
--        (SECURITY DEFINER, service_role only) with PII masking in the API
--        layer.
--
-- GAP 3: customer_profile_audit_appearances
--   Old policy: FOR SELECT TO authenticated USING (true)
--   Fix: scoped to profiles the merchant contributed to (mirrors gap 2)
--
-- RPC: search_customer_profiles()
--   SECURITY DEFINER function grants the API layer (service role) the ability
--   to search all profiles for the live-lookup feature while keeping the RLS
--   restrictions in place for all direct table access.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. fraud_transactions
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "fraud_transactions_all_authenticated" ON fraud_transactions;

CREATE POLICY "fraud_transactions_write_service" ON fraud_transactions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "fraud_transactions_select_own" ON fraud_transactions
  FOR SELECT TO authenticated USING (
    job_id IN (
      SELECT id FROM processing_jobs WHERE merchant_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 2. customer_profiles
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "customer_profiles_read_authenticated" ON customer_profiles;

CREATE POLICY "customer_profiles_select_own" ON customer_profiles
  FOR SELECT TO authenticated USING (
    merchant_ids @> jsonb_build_array(auth.uid()::text)
  );

-- ---------------------------------------------------------------------------
-- 3. customer_profile_audit_appearances
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "cp_appearances_read_authenticated" ON customer_profile_audit_appearances;

CREATE POLICY "cp_appearances_select_own" ON customer_profile_audit_appearances
  FOR SELECT TO authenticated USING (
    profile_id IN (
      SELECT id FROM customer_profiles
      WHERE merchant_ids @> jsonb_build_array(auth.uid()::text)
    )
  );

-- ---------------------------------------------------------------------------
-- 4. search_customer_profiles() — SECURITY DEFINER RPC for live lookup
--
--    Accepts normalised search terms (all optional, at least one required).
--    Returns full customer_profiles rows — the API route applies PII masking
--    based on whether the calling merchant contributed to each profile.
--
--    Access: service_role ONLY (called from /api/lookup which enforces auth).
--    Clients cannot call this function directly.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION search_customer_profiles(
  p_email   TEXT DEFAULT NULL,
  p_name    TEXT DEFAULT NULL,
  p_address TEXT DEFAULT NULL,
  p_card    TEXT DEFAULT NULL,
  p_ip      TEXT DEFAULT NULL
)
RETURNS SETOF customer_profiles
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT DISTINCT cp.*
  FROM customer_profiles cp
  WHERE
    (p_email   IS NOT NULL AND cp.emails      @> to_jsonb(p_email))
    OR (p_card  IS NOT NULL AND cp.card_last4s @> to_jsonb(p_card))
    OR (p_ip    IS NOT NULL AND cp.ips         @> to_jsonb(p_ip))
    OR (p_address IS NOT NULL AND cp.addresses @> to_jsonb(p_address))
    OR (p_name  IS NOT NULL AND cp.names::text ILIKE '%' || p_name || '%')
  ORDER BY cp.risk_score DESC
  LIMIT 25;
$$;

REVOKE ALL ON FUNCTION search_customer_profiles FROM PUBLIC;
GRANT EXECUTE ON FUNCTION search_customer_profiles TO service_role;
