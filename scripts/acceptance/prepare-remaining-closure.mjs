import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import {
  REMAINING_CLOSURE_FIXTURE,
  REMAINING_CLOSURE_ROOT,
  assertRemainingClosureAcknowledgement,
  assertRemainingClosureScriptEnvironment,
  captureRemainingClosureBaseline,
  createRemainingFixturePlan,
  fingerprintRows,
  loadRemainingFixturePlan,
  writeRemainingClosureJson,
} from './remaining-closure-runtime.mjs';

const dryRun = process.argv.includes('--dry-run');
const markerKey = 'acceptance_remaining_closure';

function failOnError(result, label) {
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data;
}

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

function plannedUserEmails(plan) {
  return fixtureRows(plan).flatMap((fixture) => [
    fixture.owner.email,
    ...(fixture.secondMember ? [fixture.secondMember.email] : []),
  ]);
}

async function listFixtureUsers(service, plan) {
  const { data, error } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw new Error(`List fixture users: ${error.message}`);
  const emails = new Set(plannedUserEmails(plan));
  return (data.users ?? []).filter((user) => user.email && emails.has(user.email.toLowerCase()));
}

async function assertTargetsAreAbsent(service, plan) {
  for (const fixture of fixtureRows(plan)) {
    const result = await service.from('merchants').select('id,name,settings').eq('id', fixture.merchantId).maybeSingle();
    if (result.error) throw new Error(`Fixture preflight ${fixture.kind}: ${result.error.message}`);
    if (result.data) {
      throw new Error(`Refusing to reuse fixture merchant ${fixture.kind}; planned ID already exists`);
    }
    const storage = await service.storage.from('integration-documents').list(fixture.merchantId, { limit: 1 });
    if (storage.error) throw new Error(`Fixture preflight storage ${fixture.kind}: ${storage.error.message}`);
    if ((storage.data ?? []).length) throw new Error(`Refusing fixture ${fixture.kind}; planned storage prefix is not empty`);
  }
  const users = await listFixtureUsers(service, plan);
  if (users.length) {
    throw new Error(`Refusing to reuse ${users.length} planned fixture auth identity or identities`);
  }
}

async function createFixtureUser(service, fixture, email, password, label) {
  const response = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      fixture: REMAINING_CLOSURE_FIXTURE,
      [markerKey]: fixture.marker,
      setup_complete: true,
      acceptance_label: label,
    },
  });
  if (response.error || !response.data.user) throw new Error(`Create ${fixture.kind} ${label}: ${response.error?.message ?? 'missing user'}`);
  return response.data.user;
}

async function insertMerchant(service, fixture) {
  const data = failOnError(await service.from('merchants').insert({
    id: fixture.merchantId,
    name: fixture.name,
    is_demo: true,
    is_internal: false,
    settings: {
      currency: 'GBP',
      timezone: 'Europe/London',
      setup_complete: true,
      [markerKey]: fixture.marker,
    },
  }).select('id,settings').single(), `Create ${fixture.kind} merchant`);
  if (!markerMatches(data.settings, fixture.marker)) throw new Error(`Created ${fixture.kind} merchant did not retain its fixture marker`);
  return data;
}

async function insertMembership(service, fixture, user, role) {
  return failOnError(await service.from('merchant_users').insert({
    merchant_id: fixture.merchantId,
    user_id: user.id,
    invited_email: user.email,
    role,
    invite_status: 'active',
    accepted_at: new Date().toISOString(),
  }).select('id,merchant_id,user_id,role,invite_status').single(), `Create ${fixture.kind} ${role} membership`);
}

async function prepareSettingsFixture(service, fixture, password) {
  await insertMerchant(service, fixture);
  const owner = await createFixtureUser(service, fixture, fixture.owner.email, password, 'owner');
  const member = await createFixtureUser(service, fixture, fixture.secondMember.email, password, 'second-member');
  const ownerMembership = await insertMembership(service, fixture, owner, 'owner');
  const memberMembership = await insertMembership(service, fixture, member, 'analyst');
  const now = new Date();
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
  failOnError(await service.from('merchant_subscriptions').insert({
    merchant_id: fixture.merchantId,
    plan_id: 'scale',
    status: 'active',
    stripe_customer_id: null,
    stripe_subscription_id: null,
    current_period_start: now.toISOString(),
    current_period_end: periodEnd,
    context_credits_monthly: 10_000,
  }), 'Create Settings subscription');
  failOnError(await service.from('merchant_credits').insert({
    merchant_id: fixture.merchantId,
    monthly_credits_remaining: 10_000,
    topup_credits_remaining: 0,
    cycle_reset_at: periodEnd,
  }), 'Create Settings credits');
  return {
    ownerUserId: owner.id,
    secondMemberUserId: member.id,
    ownerMembershipId: ownerMembership.id,
    secondMemberMembershipId: memberMembership.id,
  };
}

async function preparePrivacyFixture(service, fixture, password, runId) {
  await insertMerchant(service, fixture);
  const owner = await createFixtureUser(service, fixture, fixture.owner.email, password, 'owner');
  const ownerMembership = await insertMembership(service, fixture, owner, 'owner');
  const customer = failOnError(await service.from('merchant_customers').insert({
    id: fixture.subjectId,
    merchant_id: fixture.merchantId,
    display_name: 'Acceptance privacy subject',
    email: fixture.owner.email.replace('.owner.', '.subject.'),
    raw_metadata: { [markerKey]: fixture.marker, acceptance_data: 'synthetic' },
  }).select('id').single(), 'Create privacy subject');
  const sourceCustomer = failOnError(await service.from('source_customers').insert({
    id: fixture.sourceCustomerId,
    merchant_id: fixture.merchantId,
    merchant_customer_id: customer.id,
    source: 'manual',
    external_id: `acceptance-subject-${runId}`,
    email: fixture.owner.email.replace('.owner.', '.subject.'),
    first_name: 'Acceptance',
    last_name: 'Subject',
    raw_metadata: { [markerKey]: fixture.marker, personal_data: 'synthetic' },
  }).select('id').single(), 'Create privacy source customer');
  const sourceOrder = failOnError(await service.from('source_orders').insert({
    id: fixture.sourceOrderId,
    merchant_id: fixture.merchantId,
    merchant_customer_id: customer.id,
    source_customer_id: sourceCustomer.id,
    source: 'manual',
    external_id: `acceptance-order-${runId}`,
    order_number: `ACC-${runId.slice(0, 8).toUpperCase()}`,
    browser_ip: '127.0.0.1',
    financial_status: 'paid',
    fulfillment_state: 'unknown',
    total_price: 25,
    currency: 'GBP',
    email: fixture.owner.email.replace('.owner.', '.subject.'),
    customer_email: fixture.owner.email.replace('.owner.', '.subject.'),
    customer_name: 'Acceptance Subject',
    raw_payload_hash: `acceptance-${runId}`,
  }).select('id').single(), 'Create privacy source order');
  const caseRow = failOnError(await service.from('support_payout_cases').insert({
    id: fixture.caseId,
    merchant_id: fixture.merchantId,
    merchant_customer_id: customer.id,
    source_order_id: sourceOrder.id,
    claim_type: 'item_not_received',
    status: 'open',
    detection_method: 'manual',
    detection_detail: { [markerKey]: fixture.marker },
    reason_raw: 'Synthetic acceptance privacy fixture',
    amount_at_risk: 25,
    currency: 'GBP',
    primary_currency: 'GBP',
    case_origin: 'manual',
  }).select('id').single(), 'Create privacy case');
  failOnError(await service.from('case_financial_entries').insert({
    id: fixture.financialEntryId,
    merchant_id: fixture.merchantId,
    support_payout_case_id: caseRow.id,
    state: 'confirmed_loss',
    amount_minor: 2500,
    currency: 'GBP',
    direction: 'debit',
    metadata: { [markerKey]: fixture.marker, provenance: 'local-synthetic-acceptance' },
  }), 'Create retained privacy financial fact');
  failOnError(await service.from('domain_events').insert({
    id: fixture.domainEventId,
    merchant_id: fixture.merchantId,
    event_type: 'acceptance_fixture_created',
    aggregate_type: 'support_payout_case',
    aggregate_id: caseRow.id,
    actor_type: 'user',
    actor_id: owner.id,
    idempotency_key: `acceptance-privacy-${runId}`,
    payload: { [markerKey]: fixture.marker, note: 'Synthetic local acceptance fixture' },
  }), 'Create retained privacy audit fact');
  return { ownerUserId: owner.id, ownerMembershipId: ownerMembership.id, subjectId: customer.id };
}

async function prepareWorkspaceDeletionFixture(service, fixture, password) {
  await insertMerchant(service, fixture);
  const owner = await createFixtureUser(service, fixture, fixture.owner.email, password, 'owner');
  const ownerMembership = await insertMembership(service, fixture, owner, 'owner');
  return { ownerUserId: owner.id, ownerMembershipId: ownerMembership.id };
}

async function readFixtureSnapshot(service, plan) {
  const snapshots = {};
  for (const fixture of fixtureRows(plan)) {
    const [merchant, members, subscription, credits, apiKeys, agreements, jobs] = await Promise.all([
      service.from('merchants').select('id,name,settings,created_at,updated_at').eq('id', fixture.merchantId),
      service.from('merchant_users').select('id,merchant_id,user_id,role,invite_status,created_at,accepted_at').eq('merchant_id', fixture.merchantId),
      service.from('merchant_subscriptions').select('id,merchant_id,plan_id,status,current_period_start,current_period_end,downgrade_to_plan_id').eq('merchant_id', fixture.merchantId),
      service.from('merchant_credits').select('merchant_id,monthly_credits_remaining,topup_credits_remaining,cycle_reset_at').eq('merchant_id', fixture.merchantId),
      service.from('merchant_api_keys').select('id,merchant_id,key_prefix,scopes,rate_limit_per_minute,revoked_at').eq('merchant_id', fixture.merchantId),
      service.from('agreements').select('id,merchant_id,document_url,status,file_mime_type,file_size_bytes').eq('merchant_id', fixture.merchantId),
      service.from('document_upload_jobs').select('id,merchant_id,agreement_id,status').eq('merchant_id', fixture.merchantId),
    ]);
    for (const [label, result] of Object.entries({ merchant, members, subscription, credits, apiKeys, agreements, jobs })) {
      if (result.error) throw new Error(`Snapshot ${fixture.kind} ${label}: ${result.error.message}`);
    }
    const tables = {
      merchants: merchant.data ?? [],
      merchant_users: members.data ?? [],
      merchant_subscriptions: subscription.data ?? [],
      merchant_credits: credits.data ?? [],
      merchant_api_keys: apiKeys.data ?? [],
      agreements: agreements.data ?? [],
      document_upload_jobs: jobs.data ?? [],
    };
    if (fixture.kind === 'privacy') {
      const [customers, sourceCustomers, sourceOrders, cases, financialEntries, domainEvents] = await Promise.all([
        service.from('merchant_customers').select('id,merchant_id,display_name,email,erased_at,erasure_receipt_id').eq('merchant_id', fixture.merchantId),
        service.from('source_customers').select('id,merchant_id,merchant_customer_id,email,first_name,last_name,raw_metadata').eq('merchant_id', fixture.merchantId),
        service.from('source_orders').select('id,merchant_id,merchant_customer_id,source_customer_id,email,customer_email,customer_name').eq('merchant_id', fixture.merchantId),
        service.from('support_payout_cases').select('id,merchant_id,merchant_customer_id,source_order_id,reason_raw').eq('merchant_id', fixture.merchantId),
        service.from('case_financial_entries').select('id,merchant_id,support_payout_case_id,state,amount_minor,currency,metadata').eq('merchant_id', fixture.merchantId),
        service.from('domain_events').select('id,merchant_id,aggregate_id,event_type,payload').eq('merchant_id', fixture.merchantId),
      ]);
      for (const [label, result] of Object.entries({ customers, sourceCustomers, sourceOrders, cases, financialEntries, domainEvents })) {
        if (result.error) throw new Error(`Snapshot privacy ${label}: ${result.error.message}`);
      }
      Object.assign(tables, {
        merchant_customers: customers.data ?? [],
        source_customers: sourceCustomers.data ?? [],
        source_orders: sourceOrders.data ?? [],
        support_payout_cases: cases.data ?? [],
        case_financial_entries: financialEntries.data ?? [],
        domain_events: domainEvents.data ?? [],
      });
    }
    snapshots[fixture.kind] = {
      merchantId: fixture.merchantId,
      rowCounts: Object.fromEntries(Object.entries(tables).map(([table, rows]) => [table, rows.length])),
      tableFingerprints: Object.fromEntries(Object.entries(tables).map(([table, rows]) => [table, fingerprintRows(rows)])),
      fixtureMarker: fixture.marker,
    };
  }
  return snapshots;
}

async function rollbackPartialFixtures(service, plan) {
  const deletedMerchantIds = [];
  for (const fixture of fixtureRows(plan)) {
    const merchant = await service.from('merchants').select('id,settings').eq('id', fixture.merchantId).maybeSingle();
    if (merchant.error) continue;
    if (!merchant.data) continue;
    if (!markerMatches(merchant.data.settings, fixture.marker)) {
      throw new Error(`Rollback refused ${fixture.kind}: fixture marker does not match`);
    }
    const removed = await service.from('merchants').delete().eq('id', fixture.merchantId);
    if (removed.error) throw new Error(`Rollback merchant ${fixture.kind}: ${removed.error.message}`);
    deletedMerchantIds.push(fixture.merchantId);
  }
  const users = await listFixtureUsers(service, plan);
  const deletedUserIds = [];
  for (const user of users) {
    const marker = user.user_metadata?.[markerKey];
    const matchingFixture = fixtureRows(plan).find((fixture) => markerMatches({ [markerKey]: marker }, fixture.marker));
    if (!matchingFixture) throw new Error(`Rollback refused auth user ${user.id}: fixture marker does not match`);
    const deleted = await service.auth.admin.deleteUser(user.id);
    if (deleted.error) throw new Error(`Rollback fixture auth user: ${deleted.error.message}`);
    deletedUserIds.push(user.id);
  }
  return { deletedMerchantIds, deletedUserIds };
}

function existingOrNewBaseline() {
  try {
    return loadRemainingFixturePlan({ required: false }) ? null : captureRemainingClosureBaseline();
  } catch {
    return captureRemainingClosureBaseline();
  }
}

assertRemainingClosureAcknowledgement();

const existingPlan = loadRemainingFixturePlan({ required: false });
const baseline = existingOrNewBaseline();
if (baseline) writeRemainingClosureJson('baseline.json', baseline);
const plan = existingPlan ?? createRemainingFixturePlan();
if (!existingPlan) writeRemainingClosureJson('fixture-plan.json', plan);

let service = null;
let environment = null;
let prepared = false;
try {
  environment = assertRemainingClosureScriptEnvironment();
  service = createClient(environment.supabaseUrl, environment.serviceRole, { auth: { persistSession: false } });
  await assertTargetsAreAbsent(service, plan);

  if (dryRun) {
    const receipt = {
      schemaVersion: 1,
      fixture: REMAINING_CLOSURE_FIXTURE,
      runId: plan.runId,
      phase: 'FAR-0',
      state: 'dry-run-passed',
      generatedAt: new Date().toISOString(),
      localOnly: true,
      checks: {
        loopbackSupabase: environment.supabaseUrl,
        configuredLoopbackApp: environment.appUrl,
        exactTargetsAbsent: true,
        cleanupWouldUseExactIdsOnly: true,
        credentialsPersisted: false,
      },
    };
    writeRemainingClosureJson('execution.json', receipt);
    console.log(JSON.stringify({ phase: 'FAR-0', state: receipt.state, runId: plan.runId, artifactRoot: REMAINING_CLOSURE_ROOT }, null, 2));
  } else {
    if (plan.state === 'prepared') throw new Error('Remaining-closure fixtures are already prepared; clean them before a new run');
    const password = randomBytes(32).toString('base64url');
    const settings = await prepareSettingsFixture(service, plan.fixtures.settings, password);
    const privacy = await preparePrivacyFixture(service, plan.fixtures.privacy, password, plan.runId);
    const workspaceDeletion = await prepareWorkspaceDeletionFixture(service, plan.fixtures.workspaceDeletion, password);
    const snapshot = await readFixtureSnapshot(service, plan);
    const preparedPlan = {
      ...plan,
      state: 'prepared',
      preparedAt: new Date().toISOString(),
      preparedIdentities: { settings, privacy, workspaceDeletion },
    };
    writeRemainingClosureJson('fixture-plan.json', preparedPlan);
    writeRemainingClosureJson('fixture-receipt.json', {
      schemaVersion: 1,
      fixture: REMAINING_CLOSURE_FIXTURE,
      runId: plan.runId,
      phase: 'FAR-0',
      generatedAt: new Date().toISOString(),
      localOnly: true,
      credentials: { generatedInMemory: true, persisted: false, printed: false },
      fixtureIds: Object.fromEntries(fixtureRows(plan).map((fixture) => [fixture.kind, fixture.merchantId])),
      preparedSnapshot: snapshot,
      exactCleanupPlan: 'Cleanup verifies each fixture marker and deletes only its exact merchant ID, registered storage paths, and matching auth users.',
    });
    writeRemainingClosureJson('execution.json', {
      schemaVersion: 1,
      fixture: REMAINING_CLOSURE_FIXTURE,
      runId: plan.runId,
      phase: 'FAR-0',
      state: 'prepared',
      generatedAt: new Date().toISOString(),
      localOnly: true,
      providerCalls: 0,
      emailDelivery: 'local Supabase mail catcher only',
      credentialsPersisted: false,
    });
    prepared = true;
    console.log(JSON.stringify({
      phase: 'FAR-0',
      state: 'prepared',
      runId: plan.runId,
      fixtureMerchantIds: Object.fromEntries(fixtureRows(plan).map((fixture) => [fixture.kind, fixture.merchantId])),
      credentialsPersisted: false,
    }, null, 2));
  }
} catch (error) {
  const failure = error instanceof Error ? error.message : String(error);
  let rollback = null;
  if (service && !dryRun && !prepared) {
    try {
      rollback = await rollbackPartialFixtures(service, plan);
    } catch (rollbackError) {
      rollback = { failed: rollbackError instanceof Error ? rollbackError.message : String(rollbackError) };
    }
  }
  writeRemainingClosureJson('execution.json', {
    schemaVersion: 1,
    fixture: REMAINING_CLOSURE_FIXTURE,
    runId: plan.runId,
    phase: 'FAR-0',
    state: 'blocked',
    generatedAt: new Date().toISOString(),
    localOnly: true,
    blocker: failure,
    rollback,
  });
  console.error(`FAR-0 remaining-closure preparation blocked: ${failure}`);
  process.exitCode = 1;
}
