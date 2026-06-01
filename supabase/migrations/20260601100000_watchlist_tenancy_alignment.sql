-- Tenancy alignment for watchlist_entries.
--
-- Historically watchlist_entries.merchant_id referenced auth.users(id) and RLS
-- compared it against auth.uid(). The rest of the merchant-owned data model keys
-- off merchants(id) (see 0079 for customer_notes and 0082 for watchlist
-- appearances). This migration brings watchlist_entries in line:
--   1) backfill legacy user-id rows to the owning merchants.id
--   2) drop orphan rows that map to no merchant
--   3) repoint the FK to merchants(id)
--   4) replace auth.uid()-based RLS with merchant_members membership

-- 1) Drop the existing FK so we can rewrite merchant_id values.
ALTER TABLE watchlist_entries
  DROP CONSTRAINT IF EXISTS watchlist_entries_merchant_id_fkey;

-- 2) Backfill: legacy rows store the owner's auth.users id; map to merchants.id.
UPDATE watchlist_entries we
  SET merchant_id = m.id
  FROM merchants m
  WHERE we.merchant_id = m.user_id
    AND we.merchant_id <> m.id;

-- 3) Remove any rows that still do not resolve to a merchant (orphans),
--    otherwise the new FK would fail to validate.
DELETE FROM watchlist_entries we
  WHERE NOT EXISTS (
    SELECT 1 FROM merchants m WHERE m.id = we.merchant_id
  );

-- 4) Repoint the FK to merchants(id).
ALTER TABLE watchlist_entries
  ADD CONSTRAINT watchlist_entries_merchant_id_fkey
  FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE;

-- 5) Standardize RLS around merchant_members membership.
DROP POLICY IF EXISTS "merchant reads own watchlist" ON watchlist_entries;
DROP POLICY IF EXISTS "merchant writes own watchlist" ON watchlist_entries;

CREATE POLICY watchlist_entries_select_member
  ON watchlist_entries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM merchants m
      WHERE m.id = watchlist_entries.merchant_id
        AND m.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM merchant_members mm
      WHERE mm.user_id = auth.uid()
        AND mm.merchant_id = watchlist_entries.merchant_id
        AND mm.invite_status = 'active'
    )
  );

CREATE POLICY watchlist_entries_write_member
  ON watchlist_entries
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM merchants m
      WHERE m.id = watchlist_entries.merchant_id
        AND m.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM merchant_members mm
      WHERE mm.user_id = auth.uid()
        AND mm.merchant_id = watchlist_entries.merchant_id
        AND mm.invite_status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM merchants m
      WHERE m.id = watchlist_entries.merchant_id
        AND m.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM merchant_members mm
      WHERE mm.user_id = auth.uid()
        AND mm.merchant_id = watchlist_entries.merchant_id
        AND mm.invite_status = 'active'
    )
  );
