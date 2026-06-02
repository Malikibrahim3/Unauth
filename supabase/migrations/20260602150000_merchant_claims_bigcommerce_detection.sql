BEGIN;

ALTER TABLE public.merchant_claims
  DROP CONSTRAINT IF EXISTS merchant_claims_detection_method_check;

ALTER TABLE public.merchant_claims
  ADD CONSTRAINT merchant_claims_detection_method_check
  CHECK (detection_method IN (
    'tag',
    'keyword_fallback',
    'manual',
    'shopify_dispute',
    'woocommerce_refund',
    'bigcommerce_refund'
  ));

COMMIT;
