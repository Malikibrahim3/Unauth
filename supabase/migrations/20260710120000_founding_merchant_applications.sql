-- Founding-merchant application form submissions (landing "apply" flow).
-- The POST /api/founding-merchant-applications route upserts into this table
-- via the service-role client; it was referenced in code but never created in
-- the v2 schema, so every application submission 500'd. Columns mirror the
-- route's upsert payload exactly.

BEGIN;

CREATE TABLE IF NOT EXISTS public.founding_merchant_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL UNIQUE REFERENCES public.merchants(id) ON DELETE CASCADE,
  created_by_user_id uuid,
  store_name text NOT NULL,
  monthly_order_volume text NOT NULL,
  monthly_refund_chargeback_volume text,
  fraud_problem text NOT NULL,
  agreed_to_terms_at timestamptz,
  internal_notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Written and read only through the service-role client. Enable RLS with no
-- public policies so anon/authenticated roles get nothing and service_role
-- (which bypasses RLS) remains the sole accessor.
ALTER TABLE public.founding_merchant_applications ENABLE ROW LEVEL SECURITY;

COMMIT;
