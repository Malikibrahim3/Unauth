-- Link support_case_intake rows to Shopify orders, customer profiles, and merchant claims.

BEGIN;

ALTER TABLE public.support_case_intake
  ADD COLUMN IF NOT EXISTS shopify_order_id text,
  ADD COLUMN IF NOT EXISTS customer_profile_id uuid REFERENCES public.customer_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS merchant_claim_id uuid REFERENCES public.merchant_claims(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS link_status text NOT NULL DEFAULT 'unlinked',
  ADD COLUMN IF NOT EXISTS linked_at timestamptz,
  ADD COLUMN IF NOT EXISTS link_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.support_case_intake
  DROP CONSTRAINT IF EXISTS support_case_intake_link_status_check;

ALTER TABLE public.support_case_intake
  ADD CONSTRAINT support_case_intake_link_status_check
  CHECK (link_status IN ('unlinked', 'linked', 'partial', 'ambiguous', 'not_found'));

CREATE INDEX IF NOT EXISTS support_case_intake_merchant_shopify_order_idx
  ON public.support_case_intake (merchant_id, shopify_order_id);

CREATE INDEX IF NOT EXISTS support_case_intake_merchant_customer_profile_idx
  ON public.support_case_intake (merchant_id, customer_profile_id);

CREATE INDEX IF NOT EXISTS support_case_intake_merchant_claim_idx
  ON public.support_case_intake (merchant_id, merchant_claim_id);

CREATE INDEX IF NOT EXISTS support_case_intake_merchant_link_status_idx
  ON public.support_case_intake (merchant_id, link_status);

COMMIT;
