-- ===========================================================================
-- 0021_lookup_hardening.sql
-- ---------------------------------------------------------------------------
-- 1. Rate-limiting table for /api/lookup
-- 2. K-anonymity enforcement on search_customer_profiles RPC
-- 3. Batch customer-profile search for the scoring engine
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Lookup rate-limiting table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lookup_daily_counts (
  merchant_id UUID NOT NULL,
  lookup_date DATE NOT NULL DEFAULT CURRENT_DATE,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (merchant_id, lookup_date)
);

ALTER TABLE lookup_daily_counts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lookup_counts_own" ON lookup_daily_counts
  FOR ALL USING (merchant_id = auth.uid()) WITH CHECK (merchant_id = auth.uid());

GRANT ALL ON lookup_daily_counts TO service_role;

-- ---------------------------------------------------------------------------
-- 2. K-anonymity enforcement on search_customer_profiles
--    Profiles with fewer than 3 merchants are dropped unless the caller
--    contributed to that profile (i.e., they are one of the 1-2 merchants).
--    SECURITY DEFINER so the API layer can enforce this before PII masking.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS search_customer_profiles(text,text,text,text,text);
CREATE OR REPLACE FUNCTION search_customer_profiles(
  p_email   TEXT DEFAULT NULL,
  p_name    TEXT DEFAULT NULL,
  p_address TEXT DEFAULT NULL,
  p_card    TEXT DEFAULT NULL,
  p_ip      TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  primary_email TEXT,
  emails JSONB,
  ips JSONB,
  addresses JSONB,
  card_last4s JSONB,
  phones JSONB,
  names JSONB,
  risk_score NUMERIC,
  risk_level TEXT,
  fraud_flags JSONB,
  total_orders INTEGER,
  total_refund_claims INTEGER,
  total_chargebacks INTEGER,
  total_merchants_seen_at INTEGER,
  refund_rate NUMERIC,
  refund_timestamps JSONB,
  fastest_claim_days NUMERIC,
  avg_claim_days NUMERIC,
  refund_acceleration_score NUMERIC,
  merchant_ids JSONB,
  first_seen TIMESTAMPTZ,
  last_seen TIMESTAMPTZ,
  last_audit_id UUID,
  profile_confidence NUMERIC,
  manually_reviewed BOOLEAN,
  merchant_notes TEXT,
  on_watchlist BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    cp.id,
    cp.primary_email,
    cp.emails,
    cp.ips,
    cp.addresses,
    cp.card_last4s,
    cp.phones,
    cp.names,
    cp.risk_score,
    cp.risk_level,
    cp.fraud_flags,
    cp.total_orders,
    cp.total_refund_claims,
    cp.total_chargebacks,
    cp.total_merchants_seen_at,
    cp.refund_rate,
    cp.refund_timestamps,
    cp.fastest_claim_days,
    cp.avg_claim_days,
    cp.refund_acceleration_score,
    cp.merchant_ids,
    cp.first_seen,
    cp.last_seen,
    cp.last_audit_id,
    cp.profile_confidence,
    cp.manually_reviewed,
    cp.merchant_notes,
    cp.on_watchlist
  FROM customer_profiles cp
  WHERE
    (
      (p_email   IS NOT NULL AND cp.emails      @> to_jsonb(p_email))
      OR (p_card  IS NOT NULL AND cp.card_last4s @> to_jsonb(p_card))
      OR (p_ip    IS NOT NULL AND cp.ips         @> to_jsonb(p_ip))
      OR (p_address IS NOT NULL AND cp.addresses @> to_jsonb(p_address))
      OR (p_name  IS NOT NULL AND cp.names::text ILIKE '%' || p_name || '%')
    )
    -- K-anonymity: only return profiles seen at 3+ merchants.
    -- Profiles with 1-2 merchants are too easy to enumerate.
    AND cp.total_merchants_seen_at >= 3
  ORDER BY cp.risk_score DESC
  LIMIT 25;
$$;

REVOKE ALL ON FUNCTION search_customer_profiles FROM PUBLIC;
GRANT EXECUTE ON FUNCTION search_customer_profiles TO service_role;

-- ---------------------------------------------------------------------------
-- 3. Batch customer-profile search for the scoring engine
--    SECURITY DEFINER — called from worker.ts service client only.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS search_customer_profiles_batch(text[],text[],text[]);
CREATE OR REPLACE FUNCTION search_customer_profiles_batch(
  p_emails TEXT[] DEFAULT NULL,
  p_cards  TEXT[] DEFAULT NULL,
  p_ips    TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  primary_email TEXT,
  emails JSONB,
  ips JSONB,
  addresses JSONB,
  card_last4s JSONB,
  names JSONB,
  risk_score NUMERIC,
  risk_level TEXT,
  fraud_flags JSONB,
  total_orders INTEGER,
  total_refund_claims INTEGER,
  total_merchants_seen_at INTEGER,
  refund_rate NUMERIC,
  merchant_ids JSONB
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    cp.id,
    cp.primary_email,
    cp.emails,
    cp.ips,
    cp.addresses,
    cp.card_last4s,
    cp.names,
    cp.risk_score,
    cp.risk_level,
    cp.fraud_flags,
    cp.total_orders,
    cp.total_refund_claims,
    cp.total_merchants_seen_at,
    cp.refund_rate,
    cp.merchant_ids
  FROM customer_profiles cp
  WHERE
    (p_emails IS NOT NULL AND cp.emails ?| p_emails)
    OR (p_cards  IS NOT NULL AND cp.card_last4s ?| p_cards)
    OR (p_ips    IS NOT NULL AND cp.ips ?| p_ips);
$$;

REVOKE ALL ON FUNCTION search_customer_profiles_batch FROM PUBLIC;
GRANT EXECUTE ON FUNCTION search_customer_profiles_batch TO service_role;
