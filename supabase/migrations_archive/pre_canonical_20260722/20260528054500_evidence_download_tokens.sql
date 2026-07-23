BEGIN;

CREATE TABLE IF NOT EXISTS evidence_download_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id uuid NOT NULL REFERENCES evidence_packages(id) ON DELETE CASCADE,
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS evidence_download_tokens_evidence_id_idx
  ON evidence_download_tokens (evidence_id);

CREATE INDEX IF NOT EXISTS evidence_download_tokens_merchant_id_idx
  ON evidence_download_tokens (merchant_id);

CREATE INDEX IF NOT EXISTS evidence_download_tokens_active_idx
  ON evidence_download_tokens (token_hash, expires_at)
  WHERE used_at IS NULL;

ALTER TABLE evidence_download_tokens ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON evidence_download_tokens FROM authenticated;
REVOKE ALL ON evidence_download_tokens FROM anon;
GRANT ALL ON evidence_download_tokens TO service_role;

COMMIT;
