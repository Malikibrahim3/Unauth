-- ===========================================================================
-- 0025_drop_audit_runs.sql
-- ---------------------------------------------------------------------------
-- Drops the legacy audit_runs table now that processing_jobs is the single
-- source of truth for all upload runs (unified in 0020_processing_jobs_unify).
--
-- Pre-conditions verified:
--   • grep -r "audit_runs" app/ components/ lib/ returns zero code-level queries
--   • processing_jobs has merchant_id-scoped RLS (added in 0006_processing_jobs)
--   • transactions.run_id FK references audit_runs — this constraint is dropped
--     before the table is removed (transactions table itself is retained; the
--     run_id column becomes an unconstrained legacy column and can be cleaned up
--     in a future migration once the inbox / transaction-detail pages migrate to
--     fraud_transactions).
-- ===========================================================================

BEGIN;

-- Step 1: Remove the FK constraint that blocks the DROP TABLE.
-- The constraint was created implicitly by:
--   run_id UUID NOT NULL REFERENCES audit_runs(id) ON DELETE CASCADE
-- in 0001_initial.sql.  Postgres names it transactions_run_id_fkey by default.
ALTER TABLE transactions
  DROP CONSTRAINT IF EXISTS transactions_run_id_fkey;

-- Step 2: Drop the table and all of its dependent objects (RLS policies,
-- indexes) that were never moved to processing_jobs.
DROP TABLE IF EXISTS audit_runs;

COMMIT;
