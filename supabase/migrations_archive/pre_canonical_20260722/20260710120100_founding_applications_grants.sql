-- Grant table privileges for founding_merchant_applications. RLS bypass by the
-- service role does not imply table GRANTs, so without this the API returns
-- "permission denied" (SQLSTATE 42501). Written/read only via the service-role
-- client, so only service_role needs privileges; RLS stays enabled with no
-- public policies, keeping anon/authenticated locked out.

BEGIN;

GRANT ALL ON public.founding_merchant_applications TO service_role;

COMMIT;
