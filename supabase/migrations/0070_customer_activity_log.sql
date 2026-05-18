-- Migration 0040: Customer activity log
-- Records key events on customer profiles for a chronological timeline.

CREATE TABLE IF NOT EXISTS customer_activity_log (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  uuid        NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
  merchant_id uuid        NOT NULL REFERENCES merchants(id),
  event_type  text        NOT NULL,
    -- 'profile_created', 'status_changed', 'note_added', 'note_deleted',
    -- 'watchlist_added', 'watchlist_removed', 'evidence_generated',
    -- 'audit_appearance', 'manually_reviewed'
  event_data  jsonb       NOT NULL DEFAULT '{}',
    -- for status_changed: { from: 'new', to: 'under_review' }
    -- for note_added:     { note_preview: first 80 chars }
    -- for evidence_generated: { reference_number: 'UNAUTH-...' }
    -- for audit_appearance:   { audit_label: '...', score: 74 }
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS customer_activity_log_profile_created_at
  ON customer_activity_log(profile_id, created_at DESC);

ALTER TABLE customer_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "merchant_own_activity" ON customer_activity_log
  FOR ALL
  USING   (merchant_id = auth.uid())
  WITH CHECK (merchant_id = auth.uid());
