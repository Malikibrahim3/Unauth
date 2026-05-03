-- ===========================================================================
-- 0037_fix_processing_jobs_rls.sql
-- ---------------------------------------------------------------------------
-- The original RLS policies on processing_jobs (added in 0006) assumed
--   auth.uid() = merchant_id
-- which was correct when the schema kept user_id == merchant_id 1:1. After
-- the merchants table was added (0001) and team membership was introduced
-- (0035_team_members.sql), `merchants.id` and `auth.users.id` are distinct
-- UUIDs joined via `merchants.user_id`. The legacy policies therefore
-- silently blocked EVERY authenticated read of processing_jobs, manifesting
-- as a 404 on /audit/{runId} immediately after a successful upload.
--
-- This migration replaces the policies to scope by merchant ownership AND
-- active team membership, matching the pattern used by every other
-- merchant-scoped table in the codebase (see 0035_team_members.sql).
-- ===========================================================================

BEGIN;

DROP POLICY IF EXISTS "processing_jobs_select_own" ON processing_jobs;
DROP POLICY IF EXISTS "processing_jobs_insert_own" ON processing_jobs;
DROP POLICY IF EXISTS "processing_jobs_update_own" ON processing_jobs;

CREATE POLICY "processing_jobs_select_own" ON processing_jobs
  FOR SELECT TO authenticated USING (
    merchant_id IN (
      SELECT id FROM merchants WHERE user_id = auth.uid()
      UNION
      SELECT merchant_id FROM merchant_members
        WHERE user_id = auth.uid() AND invite_status = 'active'
    )
  );

CREATE POLICY "processing_jobs_insert_own" ON processing_jobs
  FOR INSERT TO authenticated WITH CHECK (
    merchant_id IN (
      SELECT id FROM merchants WHERE user_id = auth.uid()
      UNION
      SELECT merchant_id FROM merchant_members
        WHERE user_id = auth.uid() AND invite_status = 'active'
    )
  );

CREATE POLICY "processing_jobs_update_own" ON processing_jobs
  FOR UPDATE TO authenticated USING (
    merchant_id IN (
      SELECT id FROM merchants WHERE user_id = auth.uid()
      UNION
      SELECT merchant_id FROM merchant_members
        WHERE user_id = auth.uid() AND invite_status = 'active'
    )
  );

CREATE POLICY "processing_jobs_delete_own" ON processing_jobs
  FOR DELETE TO authenticated USING (
    merchant_id IN (
      SELECT id FROM merchants WHERE user_id = auth.uid()
      UNION
      SELECT merchant_id FROM merchant_members
        WHERE user_id = auth.uid() AND invite_status = 'active'
    )
  );

-- Service role bypasses RLS, but make it explicit anyway for clarity.
GRANT ALL ON processing_jobs TO service_role;

COMMIT;
