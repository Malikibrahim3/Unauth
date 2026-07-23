-- Generalise processed_webhooks idempotency to platform + store + native webhook id.
-- Run during low traffic; fails loudly if backfill leaves NULL idempotency_key rows.

BEGIN;

ALTER TABLE public.processed_webhooks
  ADD COLUMN IF NOT EXISTS platform text,
  ADD COLUMN IF NOT EXISTS store_key text,
  ADD COLUMN IF NOT EXISTS idempotency_key text;

UPDATE public.processed_webhooks
SET
  platform = 'shopify',
  store_key = shop_domain,
  idempotency_key = 'shopify:' || shop_domain || ':' || webhook_id
WHERE idempotency_key IS NULL
  AND shop_domain IS NOT NULL;

UPDATE public.processed_webhooks
SET
  idempotency_key = 'legacy:' || webhook_id
WHERE idempotency_key IS NULL;

DO $$
DECLARE
  null_count integer;
BEGIN
  SELECT COUNT(*) INTO null_count
  FROM public.processed_webhooks
  WHERE idempotency_key IS NULL;

  IF null_count > 0 THEN
    RAISE EXCEPTION
      'processed_webhooks_backfill_incomplete: % rows still have NULL idempotency_key after backfill',
      null_count;
  END IF;
END $$;

ALTER TABLE public.processed_webhooks
  ALTER COLUMN idempotency_key SET NOT NULL;

ALTER TABLE public.processed_webhooks
  DROP CONSTRAINT IF EXISTS processed_webhooks_pkey;

ALTER TABLE public.processed_webhooks
  ADD PRIMARY KEY (idempotency_key);

CREATE INDEX IF NOT EXISTS idx_processed_webhooks_platform_store
  ON public.processed_webhooks (platform, store_key, processed_at DESC);

COMMIT;
