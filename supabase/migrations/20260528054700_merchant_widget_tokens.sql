BEGIN;

CREATE TABLE IF NOT EXISTS merchant_widget_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  api_key_id uuid NOT NULL REFERENCES merchant_api_keys(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  token_prefix text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

CREATE INDEX IF NOT EXISTS merchant_widget_tokens_merchant_id_idx
  ON merchant_widget_tokens (merchant_id);

CREATE INDEX IF NOT EXISTS merchant_widget_tokens_api_key_id_idx
  ON merchant_widget_tokens (api_key_id);

CREATE INDEX IF NOT EXISTS merchant_widget_tokens_active_hash_idx
  ON merchant_widget_tokens (token_hash)
  WHERE revoked_at IS NULL;

ALTER TABLE merchant_widget_tokens ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON merchant_widget_tokens FROM authenticated;
REVOKE ALL ON merchant_widget_tokens FROM anon;
GRANT ALL ON merchant_widget_tokens TO service_role;

COMMIT;
