-- Soft-delete columns for watchlist_entries and customer_notes.
-- User-facing "remove" actions now set these flags instead of hard-deleting rows.
-- This preserves merchant-flagged signals as training/model data.

ALTER TABLE watchlist_entries
  ADD COLUMN IF NOT EXISTS removed_by_merchant BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE customer_notes
  ADD COLUMN IF NOT EXISTS deleted_by_merchant BOOLEAN NOT NULL DEFAULT FALSE;

-- Index to make active-record queries fast (the common case filters removed=false)
CREATE INDEX IF NOT EXISTS watchlist_entries_active ON watchlist_entries(merchant_id, removed_by_merchant, added_at DESC);
CREATE INDEX IF NOT EXISTS customer_notes_active ON customer_notes(merchant_id, customer_profile_id, deleted_by_merchant, created_at DESC);
