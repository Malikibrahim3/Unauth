-- =========================================================
-- PERMISSIONS & AUDIT TRAIL
-- Bank-grade RBAC: delegated permission grants + full action trail
-- =========================================================

-- ---------------------------------------------------------
-- 1. user_action_log
--    Immutable audit trail for every sensitive action taken
--    by any user in the system. Written via service role only.
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_action_log (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id     UUID        NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  actor_user_id   UUID        NOT NULL,
  actor_role      TEXT        NOT NULL,
  action          TEXT        NOT NULL,
  resource_type   TEXT,
  resource_id     TEXT,
  metadata        JSONB,
  request_ip      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ual_merchant_time ON user_action_log(merchant_id, created_at DESC);
CREATE INDEX idx_ual_actor         ON user_action_log(actor_user_id, created_at DESC);
CREATE INDEX idx_ual_action        ON user_action_log(action);
CREATE INDEX idx_ual_resource      ON user_action_log(resource_type, resource_id);

ALTER TABLE user_action_log ENABLE ROW LEVEL SECURITY;

-- Owner + service role can read
CREATE POLICY "ual_owner_select" ON user_action_log
  FOR SELECT USING (
    merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
  );

-- No user can write directly — only service_role
REVOKE INSERT, UPDATE, DELETE ON user_action_log FROM authenticated, anon;
GRANT ALL ON user_action_log TO service_role;


-- ---------------------------------------------------------
-- 2. user_permission_grants
--    Allows owners to delegate specific granular permissions
--    to individual team members, beyond their base role.
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_permission_grants (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id     UUID        NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  grantor_user_id UUID        NOT NULL,
  grantee_user_id UUID        NOT NULL,
  permission      TEXT        NOT NULL,
  revoked         BOOLEAN     NOT NULL DEFAULT false,
  granted_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at      TIMESTAMPTZ,

  UNIQUE (merchant_id, grantee_user_id, permission)
);

CREATE INDEX idx_upg_merchant ON user_permission_grants(merchant_id);
CREATE INDEX idx_upg_grantee  ON user_permission_grants(grantee_user_id, revoked);

ALTER TABLE user_permission_grants ENABLE ROW LEVEL SECURITY;

-- Owner can manage all grants for their merchant
CREATE POLICY "upg_owner_all" ON user_permission_grants
  FOR ALL USING (
    merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
  );

-- Members can read their own active grants
CREATE POLICY "upg_member_select_own" ON user_permission_grants
  FOR SELECT USING (grantee_user_id = auth.uid() AND revoked = false);

GRANT ALL ON user_permission_grants TO service_role;
