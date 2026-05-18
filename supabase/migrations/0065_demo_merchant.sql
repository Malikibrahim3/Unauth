-- =============================================================================
-- 0032_demo_merchant.sql
-- ---------------------------------------------------------------------------
-- Adds is_demo boolean to merchants table (if not present from prior migration).
-- The actual demo merchant row is inserted separately via seed script.
-- =============================================================================

ALTER TABLE merchants
  ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
