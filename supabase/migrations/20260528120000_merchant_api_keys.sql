-- Merchant API keys for public /api/v1 integrations (Chrome extension, helpdesk apps, etc.)
-- Plaintext keys are never stored; only SHA-256 hashes.

BEGIN;

CREATE TABLE IF NOT EXISTS merchant_api_keys (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id           uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  key_hash              text NOT NULL UNIQUE,
  key_prefix            text NOT NULL,
  name                  text NOT NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  last_used_at          timestamptz,
  revoked_at            timestamptz,
  rate_limit_per_minute integer NOT NULL DEFAULT 60
);

CREATE INDEX IF NOT EXISTS merchant_api_keys_merchant_id_idx
  ON merchant_api_keys (merchant_id);

CREATE INDEX IF NOT EXISTS merchant_api_keys_active_hash_idx
  ON merchant_api_keys (key_hash)
  WHERE revoked_at IS NULL;

ALTER TABLE merchant_api_keys ENABLE ROW LEVEL SECURITY;

-- Service role validates Bearer tokens and updates last_used_at.
REVOKE ALL ON merchant_api_keys FROM authenticated;
REVOKE ALL ON merchant_api_keys FROM anon;
GRANT ALL ON merchant_api_keys TO service_role;

COMMIT;
