-- =============================================================================
-- 0027_access_audit_log_cross_merchant.sql
-- ---------------------------------------------------------------------------
-- Extends access_audit_log for cross-merchant signal audit trail.
-- Adds: queried_hashes (the normalised hash values queried — NOT plaintext),
--       matched_merchant_count (how many other merchants were matched),
--       and a default for query_type so cross-merchant inserts are clean.
-- =============================================================================

ALTER TABLE access_audit_log
  ADD COLUMN IF NOT EXISTS queried_hashes  text[],
  ADD COLUMN IF NOT EXISTS matched_merchant_count int;

-- Provide a default so cross-merchant signal inserts don't need to supply it
ALTER TABLE access_audit_log
  ALTER COLUMN query_type SET DEFAULT 'cross_merchant';

-- RLS: service role only — no authenticated or anon access
REVOKE ALL ON access_audit_log FROM authenticated;
REVOKE ALL ON access_audit_log FROM anon;
