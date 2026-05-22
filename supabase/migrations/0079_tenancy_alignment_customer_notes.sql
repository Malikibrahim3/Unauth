-- Tenancy alignment:
-- 1) customer_notes.merchant_id must reference merchants(id), not auth.users(id)
-- 2) add created_by_user_id for staff attribution
-- 3) standardize RLS around merchant_members membership

ALTER TABLE customer_notes
  DROP CONSTRAINT IF EXISTS customer_notes_merchant_id_fkey;

ALTER TABLE customer_notes
  ADD CONSTRAINT customer_notes_merchant_id_fkey
  FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE;

ALTER TABLE customer_notes
  ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

DROP POLICY IF EXISTS "merchant rw own notes" ON customer_notes;

CREATE POLICY customer_notes_select_member
  ON customer_notes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM merchant_members mm
      WHERE mm.user_id = auth.uid()
        AND mm.merchant_id = customer_notes.merchant_id
        AND mm.invite_status = 'active'
    )
  );

CREATE POLICY customer_notes_insert_member
  ON customer_notes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM merchant_members mm
      WHERE mm.user_id = auth.uid()
        AND mm.merchant_id = customer_notes.merchant_id
        AND mm.invite_status = 'active'
    )
  );

CREATE POLICY customer_notes_update_member
  ON customer_notes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM merchant_members mm
      WHERE mm.user_id = auth.uid()
        AND mm.merchant_id = customer_notes.merchant_id
        AND mm.invite_status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM merchant_members mm
      WHERE mm.user_id = auth.uid()
        AND mm.merchant_id = customer_notes.merchant_id
        AND mm.invite_status = 'active'
    )
  );

CREATE POLICY customer_notes_delete_member
  ON customer_notes
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM merchant_members mm
      WHERE mm.user_id = auth.uid()
        AND mm.merchant_id = customer_notes.merchant_id
        AND mm.invite_status = 'active'
    )
  );
