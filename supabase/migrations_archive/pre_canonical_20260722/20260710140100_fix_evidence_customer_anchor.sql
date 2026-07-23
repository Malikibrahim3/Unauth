BEGIN;

ALTER TABLE public.evidence_packages
  DROP CONSTRAINT IF EXISTS evidence_packages_customer_profile_id_fkey;
ALTER TABLE public.evidence_packages
  ADD CONSTRAINT evidence_packages_customer_profile_id_fkey
  FOREIGN KEY (customer_profile_id)
  REFERENCES public.source_customers(id)
  ON DELETE SET NULL;

ALTER TABLE public.profile_view_tokens
  DROP CONSTRAINT IF EXISTS profile_view_tokens_profile_id_fkey;
ALTER TABLE public.profile_view_tokens
  ADD CONSTRAINT profile_view_tokens_profile_id_fkey
  FOREIGN KEY (profile_id)
  REFERENCES public.source_customers(id)
  ON DELETE CASCADE;

COMMIT;
