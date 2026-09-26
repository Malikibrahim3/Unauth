import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import {
  ACCEPTANCE_FIXTURE,
  ACCEPTANCE_MERCHANT_ID,
  ACCEPTANCE_ROOT,
  fingerprint,
  localSupabaseEnvironment,
  requireRolePassword,
} from './acceptance/local-runtime.mjs';

if (process.env.RELEASE_E2E_LOCAL !== '1') {
  throw new Error('Set RELEASE_E2E_LOCAL=1 to acknowledge this local-only synthetic fixture');
}

const password = requireRolePassword();
const artifactDir = path.join(process.cwd(), ACCEPTANCE_ROOT);
const profileSource = JSON.parse(fs.readFileSync(new URL('./acceptance/role-profiles.json', import.meta.url), 'utf8'));
const { apiUrl, serviceRole } = localSupabaseEnvironment();
const supabase = createClient(apiUrl, serviceRole, { auth: { persistSession: false } });

const roleRows = [
  // Keep the role-matrix owner distinct from the baseline release owner. The
  // role fixture temporarily transfers the membership and then restores it;
  // reusing the baseline auth account would also rotate its password and
  // metadata, which the membership-only cleanup cannot restore.
  { id: 'owner', persona: null, role: 'owner', email: 'stage-h-role-owner@example.invalid', memberId: 'a1000000-0000-4000-8000-000000000020', delegatedPermissions: [] },
  { id: 'admin', persona: null, role: 'admin', email: 'stage-h-admin@example.invalid', memberId: 'a1000000-0000-4000-8000-000000000021', delegatedPermissions: [] },
  { id: 'analyst', persona: null, role: 'analyst', email: 'stage-h-analyst@example.invalid', memberId: 'a1000000-0000-4000-8000-000000000022', delegatedPermissions: [] },
  { id: 'viewer', persona: null, role: 'viewer', email: 'stage-h-viewer@example.invalid', memberId: 'a1000000-0000-4000-8000-000000000023', delegatedPermissions: [] },
  ...profileSource,
];

function ordered(rows) {
  return [...(rows ?? [])].sort((left, right) => String(left.id).localeCompare(String(right.id)));
}

async function readDatabaseState() {
  const memberships = await supabase
    .from('merchant_users')
    .select('id,merchant_id,user_id,invited_email,role,invite_status,invited_by,created_at,accepted_at')
    .eq('merchant_id', ACCEPTANCE_MERCHANT_ID);
  if (memberships.error) throw memberships.error;
  const grants = await supabase
    .from('user_permission_grants')
    .select('id,merchant_id,grantee_user_id,permission,granted_by,revoked,created_at,revoked_at')
    .eq('merchant_id', ACCEPTANCE_MERCHANT_ID);
  if (grants.error) throw grants.error;
  const state = { memberships: ordered(memberships.data), permissionGrants: ordered(grants.data) };
  return { ...state, fingerprint: fingerprint(state) };
}

const { data: listed, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (listError) throw listError;
const fixtureUserPreState = roleRows.map((row) => {
  const user = listed.users.find((candidate) => candidate.email === row.email);
  return { email: row.email, existed: Boolean(user), userId: user?.id ?? null, fixtureMarker: user?.user_metadata?.fixture ?? null };
});
const preState = await readDatabaseState();
const prepared = [];

for (const row of roleRows) {
  let user = listed.users.find((candidate) => candidate.email === row.email);
  if (!user) {
    const created = await supabase.auth.admin.createUser({
      email: row.email,
      password,
      email_confirm: true,
      user_metadata: { fixture: ACCEPTANCE_FIXTURE, role: row.role, persona: row.persona, setup_complete: true },
    });
    if (created.error || !created.data.user) throw created.error ?? new Error(`Failed to create ${row.id}`);
    user = created.data.user;
  } else {
    if (user.user_metadata?.fixture && user.user_metadata.fixture !== ACCEPTANCE_FIXTURE) {
      throw new Error(`Refusing to repurpose ${row.email}: fixture marker belongs to another run`);
    }
    const updated = await supabase.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
      user_metadata: { ...(user.user_metadata ?? {}), fixture: ACCEPTANCE_FIXTURE, role: row.role, persona: row.persona, setup_complete: true },
    });
    if (updated.error) throw updated.error;
    user = updated.data.user ?? user;
  }

  let memberId = row.memberId;
  if (row.role === 'owner') {
    const currentOwner = preState.memberships.find((membership) => membership.role === 'owner' && membership.invite_status === 'active');
    if (!currentOwner) throw new Error('Acceptance merchant has no active owner to restore after the run');
    memberId = currentOwner.id;
    const ownerUpdate = await supabase.from('merchant_users').update({
      user_id: user.id,
      invited_email: row.email,
      role: 'owner',
      invite_status: 'active',
      accepted_at: new Date().toISOString(),
    }).eq('id', currentOwner.id).eq('merchant_id', ACCEPTANCE_MERCHANT_ID);
    if (ownerUpdate.error) throw ownerUpdate.error;
  } else {
    const existing = await supabase.from('merchant_users').select('id').eq('merchant_id', ACCEPTANCE_MERCHANT_ID).eq('invited_email', row.email).maybeSingle();
    if (existing.error) throw existing.error;
    memberId = existing.data?.id ?? row.memberId;
    const membership = await supabase.from('merchant_users').upsert({
      id: memberId,
      merchant_id: ACCEPTANCE_MERCHANT_ID,
      user_id: user.id,
      invited_email: row.email,
      role: row.role,
      invite_status: 'active',
      accepted_at: new Date().toISOString(),
    }, { onConflict: 'id' });
    if (membership.error) throw membership.error;
  }

  for (const permission of row.delegatedPermissions) {
    const grant = await supabase.from('user_permission_grants').upsert({
      merchant_id: ACCEPTANCE_MERCHANT_ID,
      grantee_user_id: user.id,
      permission,
      revoked: false,
      revoked_at: null,
    }, { onConflict: 'merchant_id,grantee_user_id,permission' });
    if (grant.error) throw grant.error;
  }
  prepared.push({ id: row.id, persona: row.persona, role: row.role, email: row.email, userId: user.id, memberId, delegatedPermissions: row.delegatedPermissions });
}

const preparedState = await readDatabaseState();
const receipt = {
  schemaVersion: 2,
  fixture: ACCEPTANCE_FIXTURE,
  runId: randomUUID(),
  generatedAt: new Date().toISOString(),
  merchantId: ACCEPTANCE_MERCHANT_ID,
  password: { source: 'RELEASE_ROLE_PASSWORD', persisted: false },
  preState: { ...preState, fixtureUsers: fixtureUserPreState },
  preparedState,
  accounts: prepared,
};
fs.mkdirSync(artifactDir, { recursive: true });
fs.writeFileSync(path.join(artifactDir, 'role-fixture.json'), `${JSON.stringify(receipt, null, 2)}\n`, { mode: 0o600 });
console.log(JSON.stringify({
  merchantId: ACCEPTANCE_MERCHANT_ID,
  runId: receipt.runId,
  preStateFingerprint: preState.fingerprint,
  preparedStateFingerprint: preparedState.fingerprint,
  accounts: prepared.map(({ id, persona, role, email, memberId, delegatedPermissions }) => ({ id, persona, role, email, memberId, delegatedPermissions })),
}, null, 2));
