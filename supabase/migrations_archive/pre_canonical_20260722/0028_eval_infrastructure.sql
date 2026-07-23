-- ===========================================================================
-- 0026_eval_infrastructure.sql
-- ---------------------------------------------------------------------------
-- Creates the eval_history table for persisting engine eval run records, and
-- adds the is_internal column to merchants for gating the internal /eval page.
-- No RLS on eval_history — service role only, internal use.
-- ===========================================================================

BEGIN;

-- Eval history: one row per npm run eval execution
CREATE TABLE IF NOT EXISTS eval_history (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at           timestamptz NOT NULL DEFAULT now(),
  dataset_path     text        NOT NULL,
  row_count        int,
  labelled_count   int,
  precision_score  numeric(5,4),
  recall_score     numeric(5,4),
  f1_score         numeric(5,4),
  full_report      jsonb,
  engine_version   text
);

-- No RLS — accessible only via service role key in eval scripts.
-- Revoke access from client roles to prevent accidental exposure.
REVOKE ALL ON eval_history FROM anon, authenticated;

-- is_internal flag: true only for Unauth staff/demo accounts.
ALTER TABLE merchants
  ADD COLUMN IF NOT EXISTS is_internal boolean NOT NULL DEFAULT false;

COMMIT;
