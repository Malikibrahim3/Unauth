-- Add RPCs referenced by the app but missing from the migration chain.
--
-- NOTE: both functions below target tables that do not exist in the current v2
-- schema (public.customer_profiles and public.eval_history). They are created
-- only when their dependency table is present, so this migration applies
-- cleanly against v2 (where they are skipped) and against any future schema
-- that reintroduces those tables. The account-delete orphan-cleanup path and
-- the internal /eval page depend on the corresponding v2 tables being defined
-- first — tracked as follow-up work, not resolved here.

BEGIN;

DO $do$
BEGIN
  IF to_regclass('public.customer_profiles') IS NOT NULL THEN
    EXECUTE $fn$
      CREATE OR REPLACE FUNCTION public.delete_orphan_customer_profiles(p_merchant_id uuid)
      RETURNS integer
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $body$
      DECLARE
        deleted_count integer := 0;
      BEGIN
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
      $body$;
    $fn$;

    REVOKE ALL ON FUNCTION public.delete_orphan_customer_profiles(uuid) FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION public.delete_orphan_customer_profiles(uuid) TO service_role;
  END IF;

  IF to_regclass('public.eval_history') IS NOT NULL THEN
    EXECUTE $fn$
      CREATE OR REPLACE FUNCTION public.get_eval_history()
      RETURNS SETOF public.eval_history
      LANGUAGE sql
      STABLE
      SECURITY DEFINER
      SET search_path = public
      AS $body$
        SELECT *
        FROM public.eval_history
        ORDER BY run_at DESC
      $body$;
    $fn$;

    REVOKE ALL ON FUNCTION public.get_eval_history() FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION public.get_eval_history() TO service_role;
  END IF;
END
$do$;

COMMIT;
