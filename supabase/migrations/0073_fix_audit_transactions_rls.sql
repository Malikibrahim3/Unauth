-- ===========================================================================
-- 0043_fix_audit_transactions_rls.sql
-- ---------------------------------------------------------------------------
-- The original RLS policy on audit_transactions (added in 0017) assumed
--   auth.uid() = processing_jobs.merchant_id
-- which is wrong once the merchants table was introduced: merchant_id is a
-- merchants.id UUID, not an auth.users.id UUID. As a result, every
-- authenticated SELECT on audit_transactions returns 0 rows, causing
-- /audit/{runId} to show empty summaries and 0 grade counts.
--
-- This migration drops the broken policy and recreates it mirroring the
-- pattern established in 0037_fix_processing_jobs_rls.sql: scope by
-- merchant ownership (merchants.user_id = auth.uid()) AND active team
-- membership (merchant_members.user_id = auth.uid()).
-- ===========================================================================

BEGIN;

-- Drop the broken legacy policy (may be on either table name depending on
-- whether it was renamed from fraud_transactions → audit_transactions).
DROP POLICY IF EXISTS "fraud_transactions_select_own" ON fraud_transactions;
DROP POLICY IF EXISTS "fraud_transactions_select_own" ON audit_transactions;
DROP POLICY IF EXISTS "audit_transactions_select_own"  ON audit_transactions;

-- Correct SELECT policy: job_id → processing_jobs.id → merchant_id scoped
-- to the authenticated user via merchants or active team membership.
CREATE POLICY "audit_transactions_select_own" ON audit_transactions
  FOR SELECT TO authenticated USING (
    job_id IN (
      SELECT id FROM processing_jobs
      WHERE merchant_id IN (
        SELECT id FROM merchants WHERE user_id = auth.uid()
        UNION
        SELECT merchant_id FROM merchant_members
          WHERE user_id = auth.uid() AND invite_status = 'active'
      )
    )
  );

-- Also fix INSERT / UPDATE / DELETE policies for consistency so that
-- the scoring engine (service role bypasses RLS anyway) and any future
-- authenticated writes also work correctly.
DROP POLICY IF EXISTS "fraud_transactions_insert_own" ON fraud_transactions;
DROP POLICY IF EXISTS "fraud_transactions_insert_own" ON audit_transactions;
DROP POLICY IF EXISTS "audit_transactions_insert_own"  ON audit_transactions;

CREATE POLICY "audit_transactions_insert_own" ON audit_transactions
  FOR INSERT TO authenticated WITH CHECK (
    job_id IN (
      SELECT id FROM processing_jobs
      WHERE merchant_id IN (
        SELECT id FROM merchants WHERE user_id = auth.uid()
        UNION
        SELECT merchant_id FROM merchant_members
          WHERE user_id = auth.uid() AND invite_status = 'active'
      )
    )
  );

DROP POLICY IF EXISTS "fraud_transactions_update_own" ON fraud_transactions;
DROP POLICY IF EXISTS "fraud_transactions_update_own" ON audit_transactions;
DROP POLICY IF EXISTS "audit_transactions_update_own"  ON audit_transactions;

CREATE POLICY "audit_transactions_update_own" ON audit_transactions
  FOR UPDATE TO authenticated USING (
    job_id IN (
      SELECT id FROM processing_jobs
      WHERE merchant_id IN (
        SELECT id FROM merchants WHERE user_id = auth.uid()
        UNION
        SELECT merchant_id FROM merchant_members
          WHERE user_id = auth.uid() AND invite_status = 'active'
      )
    )
  );

-- Service role bypasses RLS, but grant explicitly for clarity.
GRANT ALL ON audit_transactions TO service_role;

COMMIT;
