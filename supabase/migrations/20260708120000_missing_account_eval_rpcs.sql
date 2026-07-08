-- Add RPCs referenced by the app but missing from the migration chain.

BEGIN;

CREATE OR REPLACE FUNCTION public.delete_orphan_customer_profiles(p_merchant_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer := 0;
BEGIN
  /*
   * Account deletion removes the merchant's identity_signals before calling
   * this RPC. A customer profile is now orphaned only when none of its identity
   * member hashes are still backed by any remaining merchant signal.
   */
  WITH orphan_profiles AS (
    SELECT cp.id
    FROM public.customer_profiles cp
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.identity_members im
      JOIN public.identity_signals sig
        ON sig.identifier_type = im.identifier_type
       AND sig.identifier_hash = im.identifier_hash
      WHERE im.identity_id = cp.id
    )
  ),
  deleted_profile_rows AS (
    DELETE FROM public.customer_profiles cp
    USING orphan_profiles op
    WHERE cp.id = op.id
    RETURNING cp.id
  )
  SELECT count(*) INTO deleted_count FROM deleted_profile_rows;

  RETURN deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_orphan_customer_profiles(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_orphan_customer_profiles(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.get_eval_history()
RETURNS SETOF public.eval_history
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.eval_history
  ORDER BY run_at DESC
$$;

REVOKE ALL ON FUNCTION public.get_eval_history() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_eval_history() TO service_role;

COMMIT;
