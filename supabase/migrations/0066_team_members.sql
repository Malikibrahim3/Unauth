-- =========================================================
-- MERCHANT TEAM MEMBERS
-- Allows merchants to invite multiple users to their account
-- with role-based access control.
-- =========================================================

CREATE TABLE IF NOT EXISTS merchant_members (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id    UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  user_id        UUID REFERENCES auth.users(id) ON DELETE SET NULL,   -- null until invite accepted
  invited_email  TEXT NOT NULL,
  role           TEXT NOT NULL DEFAULT 'analyst'
                   CHECK (role IN ('owner', 'admin', 'analyst', 'viewer')),
  invite_status  TEXT NOT NULL DEFAULT 'pending'
                   CHECK (invite_status IN ('pending', 'active', 'revoked')),
  invited_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at    TIMESTAMPTZ,

  UNIQUE (merchant_id, invited_email)
);

CREATE INDEX idx_merchant_members_merchant  ON merchant_members(merchant_id);
CREATE INDEX idx_merchant_members_user      ON merchant_members(user_id);
CREATE INDEX idx_merchant_members_email     ON merchant_members(invited_email);

ALTER TABLE merchant_members ENABLE ROW LEVEL SECURITY;

-- Merchant owner can see all members of their merchant
CREATE POLICY "members_select_own_merchant" ON merchant_members
  FOR SELECT USING (
    merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
  );

-- Merchant owner can insert (invite) members
CREATE POLICY "members_insert_own_merchant" ON merchant_members
  FOR INSERT WITH CHECK (
    merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
  );

-- Merchant owner can update roles / status
CREATE POLICY "members_update_own_merchant" ON merchant_members
  FOR UPDATE USING (
    merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
  );

-- Merchant owner can delete members
CREATE POLICY "members_delete_own_merchant" ON merchant_members
  FOR DELETE USING (
    merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
  );

-- A member can see their own record (so they can verify access after accepting invite)
CREATE POLICY "members_select_own_self" ON merchant_members
  FOR SELECT USING (user_id = auth.uid());

-- Service role needs full access for invite flows
GRANT ALL ON merchant_members TO service_role;

-- =========================================================
-- ROLE PERMISSIONS reference (informational, enforced in app)
-- owner  : all permissions, cannot be removed
-- admin  : manage team, all features
-- analyst: run audits, lookup, watchlist, notes, dismiss/feedback
-- viewer : read-only access to all data
-- =========================================================
