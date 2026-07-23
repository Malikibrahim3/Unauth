-- Cross-merchant identity hashes on customer_profiles (HMAC via app layer; backfill via scripts/backfill-profile-hashes.mjs)

BEGIN;

ALTER TABLE customer_profiles
  ADD COLUMN IF NOT EXISTS email_hashes jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS phone_hashes jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS address_hashes jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS card_hashes jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ip_hashes jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_customer_profiles_email_hashes_gin
  ON customer_profiles USING gin (email_hashes jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_customer_profiles_address_hashes_gin
  ON customer_profiles USING gin (address_hashes jsonb_path_ops);

DROP FUNCTION IF EXISTS search_customer_profiles(text, text, text, text, text);
DROP FUNCTION IF EXISTS search_customer_profiles(text, text, text, text, text, text, text, text, text);

CREATE OR REPLACE FUNCTION search_customer_profiles(
  p_email        TEXT DEFAULT NULL,
  p_name         TEXT DEFAULT NULL,
  p_address      TEXT DEFAULT NULL,
  p_card         TEXT DEFAULT NULL,
  p_ip           TEXT DEFAULT NULL,
  p_email_hash   TEXT DEFAULT NULL,
  p_address_hash TEXT DEFAULT NULL,
  p_card_hash    TEXT DEFAULT NULL,
  p_ip_hash      TEXT DEFAULT NULL
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
      (p_email_hash IS NOT NULL AND cp.email_hashes @> to_jsonb(p_email_hash))
      OR (p_email IS NOT NULL AND cp.emails @> to_jsonb(p_email))
      OR (p_card_hash IS NOT NULL AND cp.card_hashes @> to_jsonb(p_card_hash))
      OR (p_card IS NOT NULL AND cp.card_last4s @> to_jsonb(p_card))
      OR (p_ip_hash IS NOT NULL AND cp.ip_hashes @> to_jsonb(p_ip_hash))
      OR (p_ip IS NOT NULL AND cp.ips @> to_jsonb(p_ip))
      OR (p_address_hash IS NOT NULL AND cp.address_hashes @> to_jsonb(p_address_hash))
      OR (p_address IS NOT NULL AND cp.addresses @> to_jsonb(p_address))
      OR (p_name IS NOT NULL AND cp.names::text ILIKE '%' || p_name || '%')
    )
    AND cp.total_merchants_seen_at >= 3
  ORDER BY cp.risk_score DESC
  LIMIT 25;
$$;

REVOKE ALL ON FUNCTION search_customer_profiles(text, text, text, text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION search_customer_profiles(text, text, text, text, text, text, text, text, text) TO service_role;

DROP FUNCTION IF EXISTS search_customer_profiles_batch(text[], text[], text[]);
DROP FUNCTION IF EXISTS search_customer_profiles_batch(text[], text[], text[], text[], text[], text[]);

CREATE OR REPLACE FUNCTION search_customer_profiles_batch(
  p_emails       TEXT[] DEFAULT NULL,
  p_cards        TEXT[] DEFAULT NULL,
  p_ips          TEXT[] DEFAULT NULL,
  p_email_hashes TEXT[] DEFAULT NULL,
  p_card_hashes  TEXT[] DEFAULT NULL,
  p_ip_hashes    TEXT[] DEFAULT NULL
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
    (p_email_hashes IS NOT NULL AND cp.email_hashes ?| p_email_hashes)
    OR (p_emails IS NOT NULL AND cp.emails ?| p_emails)
    OR (p_card_hashes IS NOT NULL AND cp.card_hashes ?| p_card_hashes)
    OR (p_cards IS NOT NULL AND cp.card_last4s ?| p_cards)
    OR (p_ip_hashes IS NOT NULL AND cp.ip_hashes ?| p_ip_hashes)
    OR (p_ips IS NOT NULL AND cp.ips ?| p_ips);
$$;

REVOKE ALL ON FUNCTION search_customer_profiles_batch(text[], text[], text[], text[], text[], text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION search_customer_profiles_batch(text[], text[], text[], text[], text[], text[]) TO service_role;

DROP FUNCTION IF EXISTS search_cross_merchant_profiles(text[], text[], text[], text[], int, int);
DROP FUNCTION IF EXISTS search_cross_merchant_profiles(text[], text[], text[], text[], text[], text[], text[], text[], int, int);

CREATE OR REPLACE FUNCTION search_cross_merchant_profiles(
  p_emails         text[] DEFAULT '{}',
  p_ips            text[] DEFAULT '{}',
  p_addresses      text[] DEFAULT '{}',
  p_cards          text[] DEFAULT '{}',
  p_email_hashes   text[] DEFAULT '{}',
  p_ip_hashes      text[] DEFAULT '{}',
  p_address_hashes text[] DEFAULT '{}',
  p_card_hashes    text[] DEFAULT '{}',
  p_min_merchants  int DEFAULT 3,
  p_limit          int DEFAULT 10000
)
RETURNS TABLE (
  id uuid,
  emails jsonb,
  ips jsonb,
  addresses jsonb,
  card_last4s jsonb,
  phones jsonb,
  email_hashes jsonb,
  ip_hashes jsonb,
  address_hashes jsonb,
  card_hashes jsonb,
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
    cp.email_hashes,
    cp.ip_hashes,
    cp.address_hashes,
    cp.card_hashes,
    cp.total_orders,
    cp.total_refund_claims,
    cp.total_merchants_seen_at,
    cp.merchant_ids
  FROM customer_profiles cp
  WHERE cp.total_merchants_seen_at >= GREATEST(COALESCE(p_min_merchants, 3), 1)
    AND (
      (COALESCE(array_length(p_email_hashes, 1), 0) > 0 AND EXISTS (
        SELECT 1 FROM unnest(p_email_hashes) v WHERE cp.email_hashes @> to_jsonb(ARRAY[v])
      ))
      OR (COALESCE(array_length(p_emails, 1), 0) > 0 AND EXISTS (
        SELECT 1 FROM unnest(p_emails) v WHERE cp.emails @> to_jsonb(ARRAY[v])
      ))
      OR (COALESCE(array_length(p_ip_hashes, 1), 0) > 0 AND EXISTS (
        SELECT 1 FROM unnest(p_ip_hashes) v WHERE cp.ip_hashes @> to_jsonb(ARRAY[v])
      ))
      OR (COALESCE(array_length(p_ips, 1), 0) > 0 AND EXISTS (
        SELECT 1 FROM unnest(p_ips) v WHERE cp.ips @> to_jsonb(ARRAY[v])
      ))
      OR (COALESCE(array_length(p_address_hashes, 1), 0) > 0 AND EXISTS (
        SELECT 1 FROM unnest(p_address_hashes) v WHERE cp.address_hashes @> to_jsonb(ARRAY[v])
      ))
      OR (COALESCE(array_length(p_addresses, 1), 0) > 0 AND EXISTS (
        SELECT 1 FROM unnest(p_addresses) v WHERE cp.addresses @> to_jsonb(ARRAY[v])
      ))
      OR (COALESCE(array_length(p_card_hashes, 1), 0) > 0 AND EXISTS (
        SELECT 1 FROM unnest(p_card_hashes) v WHERE cp.card_hashes @> to_jsonb(ARRAY[v])
      ))
      OR (COALESCE(array_length(p_cards, 1), 0) > 0 AND EXISTS (
        SELECT 1 FROM unnest(p_cards) v WHERE cp.card_last4s @> to_jsonb(ARRAY[v])
      ))
    )
  ORDER BY cp.total_merchants_seen_at DESC, cp.last_seen DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 10000), 1), 20000);
$$;

REVOKE ALL ON FUNCTION search_cross_merchant_profiles(text[], text[], text[], text[], text[], text[], text[], text[], int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION search_cross_merchant_profiles(text[], text[], text[], text[], text[], text[], text[], text[], int, int) TO service_role;

COMMIT;
