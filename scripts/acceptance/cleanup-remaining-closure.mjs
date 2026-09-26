import { createClient } from '@supabase/supabase-js';
import {
  REMAINING_CLOSURE_FIXTURE,
  REMAINING_CLOSURE_ROOT,
  assertRemainingClosureAcknowledgement,
  assertRemainingClosureScriptEnvironment,
  loadRemainingFixturePlan,
  readRemainingClosureJson,
  writeRemainingClosureJson,
} from './remaining-closure-runtime.mjs';

const dryRun = process.argv.includes('--dry-run');
const markerKey = 'acceptance_remaining_closure';
const storageBuckets = new Set(['integration-documents']);

function markerMatches(value, marker) {
  if (!value || typeof value !== 'object') return false;
  const candidate = value[markerKey];
  return candidate
    && typeof candidate === 'object'
    && candidate.fixture === marker.fixture
    && candidate.kind === marker.kind
    && candidate.runId === marker.runId
    && candidate.localOnly === true;
}

function fixtureRows(plan) {
  return Object.values(plan.fixtures);
}

function plannedEmails(plan) {
  return fixtureRows(plan).flatMap((fixture) => [fixture.owner.email, ...(fixture.secondMember ? [fixture.secondMember.email] : [])]);
}

function assertExactStorageTarget(target, plan) {
  if (!target || typeof target !== 'object') throw new Error('Storage cleanup target is invalid');
  if (!storageBuckets.has(target.bucket)) throw new Error(`Storage cleanup bucket is not allow-listed: ${target.bucket}`);
  if (typeof target.path !== 'string' || !target.path.trim()) throw new Error('Storage cleanup target has no exact path');
  const owned = fixtureRows(plan).some((fixture) => target.path.startsWith(`${fixture.merchantId}/`));
  if (!owned) throw new Error(`Storage cleanup target does not belong to a planned fixture: ${target.path}`);
  return { bucket: target.bucket, path: target.path };
}

async function listFixtureUsers(service, plan) {
  const listed = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listed.error) throw new Error(`List fixture users: ${listed.error.message}`);
  const emails = new Set(plannedEmails(plan));
  return (listed.data.users ?? []).filter((user) => user.email && emails.has(user.email.toLowerCase()));
}

async function markerCheckedMerchant(service, fixture) {
  const result = await service.from('merchants').select('id,settings').eq('id', fixture.merchantId).maybeSingle();
  if (result.error) throw new Error(`Read ${fixture.kind} merchant before cleanup: ${result.error.message}`);
  if (!result.data) return null;
  if (!markerMatches(result.data.settings, fixture.marker)) {
    throw new Error(`Refusing cleanup for ${fixture.kind}: merchant marker does not match the current receipt`);
  }
  return result.data;
}

async function collectAgreementStorageTargets(service, plan) {
  const targets = [];
  for (const fixture of fixtureRows(plan)) {
    const agreements = await service
      .from('agreements')
      .select('id,document_url')
      .eq('merchant_id', fixture.merchantId);
    if (agreements.error) throw new Error(`Read ${fixture.kind} agreements before cleanup: ${agreements.error.message}`);
    for (const agreement of agreements.data ?? []) {
      if (!agreement.document_url) continue;
      targets.push(assertExactStorageTarget({ bucket: 'integration-documents', path: agreement.document_url }, plan));
    }
  }
  return targets;
}

function mutationStorageTargets(plan) {
  const state = readRemainingClosureJson('mutation-state.json', { required: false });
  if (!state) return [];
  if (state.fixture !== REMAINING_CLOSURE_FIXTURE || state.runId !== plan.runId) {
    throw new Error('Mutation state does not match the current remaining-closure fixture plan');
  }
  return (state.storageObjects ?? []).map((target) => assertExactStorageTarget(target, plan));
}

async function mutationInviteUsers(service, plan) {
  const state = readRemainingClosureJson('mutation-state.json', { required: false });
  if (!state) return [];
  if (state.fixture !== REMAINING_CLOSURE_FIXTURE || state.runId !== plan.runId || !Array.isArray(state.invitedAuthUsers ?? [])) {
    throw new Error('Mutation state does not match the current remaining-closure fixture plan');
  }
  const listed = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listed.error) throw new Error(`List invited fixture users: ${listed.error.message}`);
  const byId = new Map((listed.data.users ?? []).map((user) => [user.id, user]));
  const exactUsers = [];
  for (const target of state.invitedAuthUsers) {
    if (!target || typeof target !== 'object' || typeof target.id !== 'string' || typeof target.email !== 'string' || typeof target.memberId !== 'string' || typeof target.merchantId !== 'string') {
      throw new Error('Invited fixture auth target is invalid');
    }
    const fixture = plan.fixtures.settings;
    if (target.merchantId !== fixture.merchantId || !target.email.endsWith('@example.invalid')) {
      throw new Error('Invited fixture auth target is outside the Settings fixture');
    }
    const user = byId.get(target.id);
    if (!user) continue;
    if (user.email?.toLowerCase() !== target.email.toLowerCase()
      || user.user_metadata?.merchant_id !== target.merchantId
      || user.user_metadata?.member_id !== target.memberId) {
      throw new Error(`Refusing cleanup for invited auth identity ${target.id}: invitation metadata does not match the exact receipt`);
    }
    const member = await service
      .from('merchant_users')
      .select('id,merchant_id,user_id,invited_email')
      .eq('id', target.memberId)
      .maybeSingle();
    if (member.error) throw new Error(`Read invited fixture membership before cleanup: ${member.error.message}`);
    if (member.data && (member.data.merchant_id !== target.merchantId || member.data.user_id !== target.id || member.data.invited_email?.toLowerCase() !== target.email.toLowerCase())) {
      throw new Error(`Refusing cleanup for invited auth identity ${target.id}: membership does not match the exact receipt`);
    }
    exactUsers.push(user);
  }
  return exactUsers;
}

async function exactObjectExists(service, bucket, objectPath) {
  const slash = objectPath.lastIndexOf('/');
  const prefix = slash >= 0 ? objectPath.slice(0, slash) : '';
  const name = slash >= 0 ? objectPath.slice(slash + 1) : objectPath;
  const listed = await service.storage.from(bucket).list(prefix, { limit: 100, search: name });
  if (listed.error) throw new Error(`Verify storage cleanup ${bucket}/${objectPath}: ${listed.error.message}`);
  return (listed.data ?? []).some((item) => item.name === name && item.id !== null);
}

async function durableReceipts(service, plan) {
  const rows = [];
  for (const fixture of fixtureRows(plan)) {
    const [deletionJobs, deletionReceipts, erasureReceipts] = await Promise.all([
      service.from('workspace_deletion_jobs').select('id,status,stage,receipt_id').eq('merchant_reference', fixture.merchantId),
      service.from('workspace_deletion_receipts').select('id,job_reference,merchant_reference,verified_at').eq('merchant_reference', fixture.merchantId),
      service.from('data_subject_erasure_receipts').select('id,merchant_id,subject_reference,effective_at').eq('merchant_id', fixture.merchantId),
    ]);
    for (const [label, result] of Object.entries({ deletionJobs, deletionReceipts, erasureReceipts })) {
      if (result.error) throw new Error(`Read durable ${fixture.kind} ${label}: ${result.error.message}`);
    }
    rows.push({
      kind: fixture.kind,
      workspaceDeletionJobs: (deletionJobs.data ?? []).map((row) => ({ id: row.id, status: row.status, stage: row.stage, receiptId: row.receipt_id })),
      workspaceDeletionReceipts: (deletionReceipts.data ?? []).map((row) => ({ id: row.id, jobId: row.job_reference, verifiedAt: row.verified_at })),
      dataSubjectErasureReceipts: (erasureReceipts.data ?? []).map((row) => ({ id: row.id, subjectId: row.subject_reference, effectiveAt: row.effective_at })),
    });
  }
  return rows;
}

/**
 * Merchant deletion is intentionally mediated by the narrow, service-role
 * workspace-deletion purge contract.  A direct DELETE would trip the
 * append-only domain-event guard (and would make cleanup depend on disabling
 * a product safety trigger).  This helper creates an exact, local cleanup job
 * only after the merchant marker has been checked, then uses the same purge
 * and immutable receipt functions as the product flow.
 */
async function purgeExactMerchant(service, fixture, ownerUserId, runId) {
  const idempotencyKey = `acceptance-cleanup:${runId}:${fixture.kind}`;
  let job = await service
    .from('workspace_deletion_jobs')
    .select('id,merchant_reference,actor_user_reference,status,stage')
    .eq('merchant_reference', fixture.merchantId)
    .eq('actor_user_reference', ownerUserId)
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();
  if (job.error) throw new Error(`Read exact ${fixture.kind} cleanup job: ${job.error.message}`);
  if (!job.data) {
    job = await service.from('workspace_deletion_jobs').insert({
      merchant_reference: fixture.merchantId,
      actor_user_reference: ownerUserId,
      idempotency_key: idempotencyKey,
      status: 'running',
      stage: 'database_cleanup',
      preflight: { fixture: REMAINING_CLOSURE_FIXTURE, kind: fixture.kind, runId, localOnly: true },
      storage_manifest: [],
      progress: { cleanup_started_at: new Date().toISOString() },
    }).select('id,merchant_reference,actor_user_reference,status,stage').single();
    if (job.error || !job.data) throw new Error(`Create exact ${fixture.kind} cleanup job: ${job.error?.message ?? 'missing job'}`);
  }
  const purged = await service.rpc('purge_workspace_database_v1', {
    p_job_id: job.data.id,
    p_merchant_id: fixture.merchantId,
    p_actor_user_id: ownerUserId,
  });
  if (purged.error) throw new Error(`Delete exact ${fixture.kind} merchant: ${purged.error.message}`);
  const check = await service.from('merchants').select('id').eq('id', fixture.merchantId).maybeSingle();
  if (check.error) throw new Error(`Verify ${fixture.kind} merchant cleanup: ${check.error.message}`);
  if (check.data) throw new Error(`Exact ${fixture.kind} merchant remains after cleanup`);
  const finalized = await service.rpc('finalize_workspace_deletion_v1', {
    p_job_id: job.data.id,
    p_verification: {
      merchant_row_absent: true,
      storage_targets_verified: 0,
      auth_identity_retained: true,
      fixture: REMAINING_CLOSURE_FIXTURE,
      kind: fixture.kind,
      runId,
      localOnly: true,
    },
  });
  if (finalized.error) throw new Error(`Finalize exact ${fixture.kind} cleanup receipt: ${finalized.error.message}`);
  return { jobId: job.data.id, receiptId: finalized.data?.id ?? null };
}

function mergeExecution(update) {
  const prior = readRemainingClosureJson('execution.json', { required: false }) ?? {};
  writeRemainingClosureJson('execution.json', { ...prior, cleanup: update });
}

assertRemainingClosureAcknowledgement();
const plan = loadRemainingFixturePlan();
let service = null;
try {
  const environment = assertRemainingClosureScriptEnvironment();
  service = createClient(environment.supabaseUrl, environment.serviceRole, { auth: { persistSession: false } });
  const presentMerchants = [];
  for (const fixture of fixtureRows(plan)) {
    const merchant = await markerCheckedMerchant(service, fixture);
    if (merchant) presentMerchants.push(fixture);
  }
  const storageTargets = [...await collectAgreementStorageTargets(service, plan), ...mutationStorageTargets(plan)];
  const exactStorageTargets = [...new Map(storageTargets.map((target) => [`${target.bucket}:${target.path}`, target])).values()];
  const fixtureUsers = await listFixtureUsers(service, plan);
  const invitedUsers = await mutationInviteUsers(service, plan);
  for (const user of fixtureUsers) {
    const marker = user.user_metadata?.[markerKey];
    const matched = fixtureRows(plan).some((fixture) => markerMatches({ [markerKey]: marker }, fixture.marker));
    if (!matched) throw new Error(`Refusing cleanup for an auth identity with a non-matching fixture marker`);
  }

  if (dryRun) {
    const receipt = {
      schemaVersion: 1,
      fixture: REMAINING_CLOSURE_FIXTURE,
      runId: plan.runId,
      phase: 'FAR-0',
      generatedAt: new Date().toISOString(),
      state: 'dry-run-passed',
      localOnly: true,
      exactTargets: {
        merchantIds: presentMerchants.map((fixture) => fixture.merchantId),
        authUserIds: [...new Set([...fixtureUsers, ...invitedUsers].map((user) => user.id))],
        storageObjects: exactStorageTargets,
      },
      deletePerformed: false,
    };
    writeRemainingClosureJson('cleanup-dry-run.json', receipt);
    mergeExecution({ state: 'dry-run-passed', generatedAt: receipt.generatedAt, exactTargets: receipt.exactTargets });
    console.log(JSON.stringify({ phase: 'FAR-0', cleanup: 'dry-run-passed', runId: plan.runId, artifactRoot: REMAINING_CLOSURE_ROOT }, null, 2));
  } else {
    for (const target of exactStorageTargets) {
      const removal = await service.storage.from(target.bucket).remove([target.path]);
      if (removal.error) throw new Error(`Remove exact storage object ${target.bucket}/${target.path}: ${removal.error.message}`);
      if (await exactObjectExists(service, target.bucket, target.path)) {
        throw new Error(`Exact storage object remains after cleanup: ${target.bucket}/${target.path}`);
      }
    }
    const deletedMerchantIds = [];
    const fixtureUsersByEmail = new Map(
      fixtureUsers
        .filter((user) => user.email)
        .map((user) => [user.email.toLowerCase(), user]),
    );
    const cleanupReceipts = [];
    for (const fixture of presentMerchants) {
      const owner = fixtureUsersByEmail.get(fixture.owner.email.toLowerCase());
      if (!owner) throw new Error(`Missing exact ${fixture.kind} owner identity for cleanup`);
      cleanupReceipts.push({ fixture: fixture.kind, ...(await purgeExactMerchant(service, fixture, owner.id, plan.runId)) });
      deletedMerchantIds.push(fixture.merchantId);
    }
    const deletedUserIds = [];
    for (const user of [...fixtureUsers, ...invitedUsers]) {
      const deleted = await service.auth.admin.deleteUser(user.id);
      if (deleted.error) throw new Error(`Delete exact fixture auth identity: ${deleted.error.message}`);
      deletedUserIds.push(user.id);
    }
    const remainingUsers = await listFixtureUsers(service, plan);
    const remainingInvitedUsers = await mutationInviteUsers(service, plan);
    if (remainingUsers.length || remainingInvitedUsers.length) throw new Error(`Fixture auth cleanup left ${remainingUsers.length + remainingInvitedUsers.length} matching identity or identities`);
    const durable = await durableReceipts(service, plan);
    const receipt = {
      schemaVersion: 1,
      fixture: REMAINING_CLOSURE_FIXTURE,
      runId: plan.runId,
      phase: 'FAR-0',
      generatedAt: new Date().toISOString(),
      localOnly: true,
      deletedMerchantIds,
      deletedUserIds,
      removedStorageObjects: exactStorageTargets,
      workspaceDeletionCleanupReceipts: cleanupReceipts,
      durableProductReceiptsRetained: durable,
      exactPreStateRestored: true,
      note: 'The fixtures began as absent exact IDs. Merchant rows, their scoped rows, registered exact storage objects, and matching fixture auth identities are absent after cleanup. Append-only product deletion/erasure receipts remain by contract and are recorded above.',
    };
    writeRemainingClosureJson('cleanup-receipt.json', receipt);
    // Mark the exact plan reusable only after every merchant/auth target has
    // been deleted and read back. This keeps a completed local cleanup from
    // being mistaken for an in-flight prepared fixture on the next run.
    writeRemainingClosureJson('fixture-plan.json', {
      ...plan,
      state: 'cleaned',
      cleanedAt: receipt.generatedAt,
    });
    mergeExecution({ state: 'cleaned', generatedAt: receipt.generatedAt, receipt: 'cleanup-receipt.json' });
    console.log(JSON.stringify({
      phase: 'FAR-0',
      cleanup: 'completed',
      runId: plan.runId,
      deletedMerchants: deletedMerchantIds.length,
      deletedUsers: deletedUserIds.length,
      removedStorageObjects: exactStorageTargets.length,
    }, null, 2));
  }
} catch (error) {
  const blocker = error instanceof Error ? error.message : String(error);
  const receipt = {
    schemaVersion: 1,
    fixture: REMAINING_CLOSURE_FIXTURE,
    runId: plan.runId,
    phase: 'FAR-0',
    generatedAt: new Date().toISOString(),
    localOnly: true,
    state: 'blocked',
    blocker,
  };
  writeRemainingClosureJson('cleanup-blocked.json', receipt);
  mergeExecution({ state: 'cleanup-blocked', generatedAt: receipt.generatedAt, blocker });
  console.error(`FAR-0 remaining-closure cleanup blocked: ${blocker}`);
  process.exitCode = 1;
}
