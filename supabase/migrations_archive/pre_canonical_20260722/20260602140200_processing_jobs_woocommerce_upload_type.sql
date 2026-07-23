BEGIN;

ALTER TABLE public.processing_jobs DROP CONSTRAINT IF EXISTS processing_jobs_upload_type_check;
ALTER TABLE public.processing_jobs
  ADD CONSTRAINT processing_jobs_upload_type_check
  CHECK (upload_type IN (
    'standard', 'historical', 'investigation', 'shopify', 'woocommerce', 'bigcommerce'
  ));

COMMIT;
