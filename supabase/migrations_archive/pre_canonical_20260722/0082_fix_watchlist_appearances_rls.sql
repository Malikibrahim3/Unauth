-- watchlist_appearances.merchant_id references merchants.id, not auth.users.id.
-- The original policy compared merchant_id directly to auth.uid(), which hid
-- a merchant's own rows from browser-client reads and made dashboard counts
-- unreliable. Keep service-role jobs unchanged while aligning user reads with
-- merchant ownership.

DROP POLICY IF EXISTS "merchant_own_appearances" ON watchlist_appearances;

CREATE POLICY "merchant_own_appearances" ON watchlist_appearances
  FOR ALL
  USING (
    merchant_id IN (
      SELECT id FROM merchants WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    merchant_id IN (
      SELECT id FROM merchants WHERE user_id = auth.uid()
    )
  );
