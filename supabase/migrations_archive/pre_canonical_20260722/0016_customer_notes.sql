CREATE TABLE IF NOT EXISTS customer_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_profile_id UUID REFERENCES customer_profiles(id) ON DELETE CASCADE,
  email_hash TEXT,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS customer_notes_merchant_profile ON customer_notes(merchant_id, customer_profile_id, created_at DESC);

ALTER TABLE customer_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "merchant rw own notes" ON customer_notes
  FOR ALL USING (merchant_id = auth.uid()) WITH CHECK (merchant_id = auth.uid());
