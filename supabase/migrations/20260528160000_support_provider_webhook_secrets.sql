-- Per-merchant Gorgias webhook secrets (hashed only; never store plaintext).

ALTER TABLE public.support_provider_connections
  ADD COLUMN IF NOT EXISTS webhook_secret_hash text,
  ADD COLUMN IF NOT EXISTS webhook_secret_created_at timestamptz,
  ADD COLUMN IF NOT EXISTS webhook_secret_rotated_at timestamptz;

COMMENT ON COLUMN public.support_provider_connections.webhook_secret_hash IS
  'HMAC-SHA256 digest of the Gorgias webhook secret (peppered via INTERNAL_HMAC_SECRET). Plaintext shown once at connection creation.';
