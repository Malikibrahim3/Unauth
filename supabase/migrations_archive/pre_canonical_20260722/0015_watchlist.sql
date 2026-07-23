CREATE TABLE IF NOT EXISTS watchlist_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_profile_id UUID REFERENCES customer_profiles(id) ON DELETE CASCADE,
  email_hash TEXT,
  display_name TEXT,
  display_email TEXT,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_risk TEXT,
  last_seen_at TIMESTAMPTZ,
  UNIQUE (merchant_id, customer_profile_id),
  UNIQUE (merchant_id, email_hash)
);

CREATE INDEX IF NOT EXISTS watchlist_entries_merchant_added ON watchlist_entries(merchant_id, added_at DESC);

ALTER TABLE watchlist_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "merchant reads own watchlist" ON watchlist_entries
  FOR SELECT USING (merchant_id = auth.uid());

CREATE POLICY "merchant writes own watchlist" ON watchlist_entries
  FOR ALL USING (merchant_id = auth.uid()) WITH CHECK (merchant_id = auth.uid());
