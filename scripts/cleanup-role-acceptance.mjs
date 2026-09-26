import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import {
  ACCEPTANCE_FIXTURE,
  ACCEPTANCE_MERCHANT_ID,
  ACCEPTANCE_ROOT,
  fingerprint,
  localSupabaseEnvironment,
} from './acceptance/local-runtime.mjs';

if (process.env.RELEASE_E2E_LOCAL !== '1') {
  throw new Error('Set RELEASE_E2E_LOCAL=1 to acknowledge this local-only fixture cleanup');
}

const artifactDir = path.join(process.cwd(), ACCEPTANCE_ROOT);
const fixturePath = path.join(artifactDir, 'role-fixture.json');
if (!fs.existsSync(fixturePath)) throw new Error(`Missing fixture receipt ${fixturePath}`);
const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
if (fixture.schemaVersion !== 2 || fixture.fixture !== ACCEPTANCE_FIXTURE || fixture.merchantId !== ACCEPTANCE_MERCHANT_ID || !fixture.runId) {
  throw new Error('Refusing cleanup: fixture marker, merchant ID, schema, or run ID does not match');
}

const { apiUrl, serviceRole } = localSupabaseEnvironment();
const supabase = createClient(apiUrl, serviceRole, { auth: { persistSession: false } });
const ordered = (rows) => [...(rows ?? [])].sort((left, right) => String(left.id).localeCompare(String(right.id)));
async function readDatabaseState() {
  const memberships = await supabase.from('merchant_users').select('id,merchant_id,user_id,invited_email,role,invite_status,invited_by,created_at,accepted_at').eq('merchant_id', ACCEPTANCE_MERCHANT_ID);
  if (memberships.error) throw memberships.error;
  const grants = await supabase.from('user_permission_grants').select('id,merchant_id,grantee_user_id,permission,granted_by,revoked,created_at,revoked_at').eq('merchant_id', ACCEPTANCE_MERCHANT_ID);
  if (grants.error) throw grants.error;
  const state = { memberships: ordered(memberships.data), permissionGrants: ordered(grants.data) };
  return { ...state, fingerprint: fingerprint(state) };
}

const beforeCleanup = await readDatabaseState();
if (beforeCleanup.fingerprint !== fixture.preparedState?.fingerprint) {
  throw new Error(`Refusing cleanup: prepared-state fingerprint changed (${fixture.preparedState?.fingerprint} -> ${beforeCleanup.fingerprint})`);
}

const originalOwner = fixture.preState.memberships.find((membership) => membership.role === 'owner' && membership.invite_status === 'active');
if (!originalOwner) throw new Error('Refusing cleanup: frozen pre-state has no active owner');
const ownerRestore = await supabase.from('merchant_users').upsert(originalOwner, { onConflict: 'id' });
if (ownerRestore.error) throw ownerRestore.error;
for (const membership of fixture.preState.memberships) {
  if (membership.id === originalOwner.id) continue;
  const restored = await supabase.from('merchant_users').upsert(membership, { onConflict: 'id' });
  if (restored.error) throw restored.error;
}
const originalMemberIds = new Set(fixture.preState.memberships.map((membership) => membership.id));
const removableMemberIds = fixture.accounts.map((account) => account.memberId).filter((id) => id && !originalMemberIds.has(id));
if (removableMemberIds.length) {
  const removed = await supabase.from('merchant_users').delete().eq('merchant_id', ACCEPTANCE_MERCHANT_ID).in('id', removableMemberIds);
  if (removed.error) throw removed.error;
}

const grantsDelete = await supabase.from('user_permission_grants').delete().eq('merchant_id', ACCEPTANCE_MERCHANT_ID);
if (grantsDelete.error) throw grantsDelete.error;
if (fixture.preState.permissionGrants.length) {
  const grantsRestore = await supabase.from('user_permission_grants').insert(fixture.preState.permissionGrants);
  if (grantsRestore.error) throw grantsRestore.error;
}

const { data: listed, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (listError) throw listError;
const deletedUsers = [];
for (const account of fixture.accounts) {
  const authPreState = fixture.preState.fixtureUsers.find((candidate) => candidate.email === account.email);
  if (authPreState?.existed) continue;
  const user = listed.users.find((candidate) => candidate.id === account.userId && candidate.email === account.email);
  if (!user) continue;
  if (user.user_metadata?.fixture !== ACCEPTANCE_FIXTURE) throw new Error(`Refusing cleanup for ${account.email}: fixture marker is absent`);
  const result = await supabase.auth.admin.deleteUser(user.id);
  if (result.error) throw result.error;
  deletedUsers.push(account.email);
}

const afterCleanup = await readDatabaseState();
if (afterCleanup.fingerprint !== fixture.preState.fingerprint) {
  throw new Error(`Fixture restoration failed (${fixture.preState.fingerprint} != ${afterCleanup.fingerprint})`);
}
const activeOwners = afterCleanup.memberships.filter((membership) => membership.role === 'owner' && membership.invite_status === 'active' && membership.user_id);
if (activeOwners.length !== 1) throw new Error(`Fixture restoration left ${activeOwners.length} active owners`);

const receipt = {
  schemaVersion: 2,
  fixture: ACCEPTANCE_FIXTURE,
  runId: fixture.runId,
  generatedAt: new Date().toISOString(),
  merchantId: ACCEPTANCE_MERCHANT_ID,
  beforeFingerprint: beforeCleanup.fingerprint,
  expectedBeforeFingerprint: fixture.preparedState.fingerprint,
  afterFingerprint: afterCleanup.fingerprint,
  expectedAfterFingerprint: fixture.preState.fingerprint,
  membershipCount: afterCleanup.memberships.length,
  activeOwner: { memberId: activeOwners[0].id, userId: activeOwners[0].user_id, role: activeOwners[0].role },
  deletedMembershipIds: removableMemberIds,
  deletedUsers,
  exactPreStateRestored: true,
  localOnly: true,
};
fs.writeFileSync(path.join(artifactDir, 'role-fixture-cleanup.json'), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify(receipt, null, 2));
