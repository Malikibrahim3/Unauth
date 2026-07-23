BEGIN;

CREATE TABLE IF NOT EXISTS public.evidence_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  customer_profile_id uuid REFERENCES public.identities(id) ON DELETE SET NULL,
  generated_for_order_id uuid REFERENCES public.source_orders(id) ON DELETE SET NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  reference_number text NOT NULL UNIQUE,
  pdf_storage_path text,
  narrative_summary text,
  signal_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  cross_merchant_indicator boolean NOT NULL DEFAULT false,
  ce3_eligible boolean NOT NULL DEFAULT false,
  ce3_qualifying_signals jsonb NOT NULL DEFAULT '[]'::jsonb,
  ce3_prior_transactions jsonb NOT NULL DEFAULT '[]'::jsonb,
  merchant_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS evidence_packages_merchant_id_idx
  ON public.evidence_packages (merchant_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS evidence_packages_customer_profile_id_idx
  ON public.evidence_packages (customer_profile_id);
CREATE INDEX IF NOT EXISTS evidence_packages_generated_for_order_id_idx
  ON public.evidence_packages (generated_for_order_id);

ALTER TABLE public.evidence_packages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS evidence_packages_member_all ON public.evidence_packages;
CREATE POLICY evidence_packages_member_all ON public.evidence_packages
  FOR ALL TO authenticated
  USING (public.is_merchant_member(merchant_id))
  WITH CHECK (public.is_merchant_member(merchant_id));
GRANT ALL ON public.evidence_packages TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evidence_packages TO authenticated;

CREATE TABLE IF NOT EXISTS public.evidence_download_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id uuid NOT NULL REFERENCES public.evidence_packages(id) ON DELETE CASCADE,
  merchant_id uuid NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS evidence_download_tokens_evidence_id_idx
  ON public.evidence_download_tokens (evidence_id);
CREATE INDEX IF NOT EXISTS evidence_download_tokens_merchant_id_idx
  ON public.evidence_download_tokens (merchant_id);
CREATE INDEX IF NOT EXISTS evidence_download_tokens_active_idx
  ON public.evidence_download_tokens (token_hash, expires_at)
  WHERE used_at IS NULL;

ALTER TABLE public.evidence_download_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.evidence_download_tokens FROM anon, authenticated;
GRANT ALL ON public.evidence_download_tokens TO service_role;

CREATE TABLE IF NOT EXISTS public.profile_view_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.identities(id) ON DELETE CASCADE,
  merchant_id uuid NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS profile_view_tokens_profile_id_idx
  ON public.profile_view_tokens (profile_id);
CREATE INDEX IF NOT EXISTS profile_view_tokens_merchant_id_idx
  ON public.profile_view_tokens (merchant_id);
CREATE INDEX IF NOT EXISTS profile_view_tokens_active_idx
  ON public.profile_view_tokens (token_hash, expires_at);

ALTER TABLE public.profile_view_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.profile_view_tokens FROM anon, authenticated;
GRANT ALL ON public.profile_view_tokens TO service_role;

CREATE SEQUENCE IF NOT EXISTS public.evidence_package_daily_seq;

CREATE OR REPLACE FUNCTION public.generate_evidence_reference()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  today text := to_char(now(), 'YYYYMMDD');
  seq_val bigint;
BEGIN
  seq_val := nextval('public.evidence_package_daily_seq');
  RETURN 'UNAUTH-' || today || '-' || lpad(seq_val::text, 6, '0');
END;
$$;

GRANT USAGE, SELECT ON SEQUENCE public.evidence_package_daily_seq TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_evidence_reference() TO service_role;

COMMIT;
