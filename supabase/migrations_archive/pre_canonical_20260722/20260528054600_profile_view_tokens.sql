BEGIN;

CREATE TABLE IF NOT EXISTS profile_view_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS profile_view_tokens_profile_id_idx
  ON profile_view_tokens (profile_id);

CREATE INDEX IF NOT EXISTS profile_view_tokens_merchant_id_idx
  ON profile_view_tokens (merchant_id);

CREATE INDEX IF NOT EXISTS profile_view_tokens_active_idx
  ON profile_view_tokens (token_hash, expires_at);

ALTER TABLE profile_view_tokens ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON profile_view_tokens FROM authenticated;
REVOKE ALL ON profile_view_tokens FROM anon;
GRANT ALL ON profile_view_tokens TO service_role;

COMMIT;
