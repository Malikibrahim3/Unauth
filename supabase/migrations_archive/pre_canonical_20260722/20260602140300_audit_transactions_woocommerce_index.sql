BEGIN;

CREATE INDEX IF NOT EXISTS idx_audit_transactions_woocommerce_store
  ON public.audit_transactions (shop_domain, processed_at DESC)
  WHERE source = 'woocommerce';

COMMIT;
