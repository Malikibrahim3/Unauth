-- Shared ecommerce connection store for WooCommerce and BigCommerce.

BEGIN;

CREATE TABLE IF NOT EXISTS public.commerce_store_connections (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id           uuid NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  platform              text NOT NULL CHECK (platform IN ('woocommerce', 'bigcommerce')),
  store_key             text NOT NULL,
  store_url             text NOT NULL,
  status                text NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'disabled', 'revoked', 'error')),
  credentials_encrypted text NOT NULL,
  uninstalled_at        timestamptz,
  last_sync_at          timestamptz,
  last_error            text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT commerce_store_connections_merchant_platform_store_unique
    UNIQUE (merchant_id, platform, store_key)
);

CREATE INDEX IF NOT EXISTS commerce_store_connections_merchant_platform_idx
  ON public.commerce_store_connections (merchant_id, platform);

CREATE INDEX IF NOT EXISTS commerce_store_connections_store_key_platform_idx
  ON public.commerce_store_connections (platform, store_key)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS commerce_store_connections_status_idx
  ON public.commerce_store_connections (status);

ALTER TABLE public.commerce_store_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_only_commerce_store_connections_all"
  ON public.commerce_store_connections;
CREATE POLICY "service_role_only_commerce_store_connections_all"
  ON public.commerce_store_connections
  FOR ALL
  TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMIT;
