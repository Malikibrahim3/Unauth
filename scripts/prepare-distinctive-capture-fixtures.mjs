#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';
import { visualFixtureNamespace, visualFixtureId, visualFixtureEmail } from './acceptance/visual-fixture-namespace.mjs';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const FIXTURE_TAG = visualFixtureNamespace ? `distinctive-${visualFixtureNamespace}` : 'distinctive-capture-fixture-v1';
const RELEASE_FIXTURE_TAG = 'release-e2e-local';
const DISPLAY_REFS = Object.freeze({
  orderExternal: '10482',
  orderNumber: '#10482',
  refund: 'RF-10482',
  return: 'RT-10482',
  ticket: 'TKT-4821',
  dispute: 'DSP-10482',
  shipment: 'SHP-10482',
  tracking: 'RM48210482GB',
  workflow: 'Refund evidence request',
  importJob: 'Orders evidence import · August 2026',
});
const RELEASE_MERCHANT_ID = 'a1000000-0000-4000-8000-000000000010';
const RELEASE_MEMBER_ID = 'a1000000-0000-4000-8000-000000000020';
const RELEASE_OWNER_EMAIL = 'stage-h-owner@example.invalid';
const ONBOARDING_MERCHANT_ID = visualFixtureId('d1300000-0000-4000-8000-000000000100');
const ONBOARDING_MEMBER_ID = visualFixtureId('d1300000-0000-4000-8000-000000000101');
const ONBOARDING_OWNER_EMAIL = visualFixtureEmail('distinctive-onboarding@example.invalid', 'visual-onboarding');
const VISUAL_MERCHANT_ID = visualFixtureId('4f5a8c25-6dcb-4b90-9e16-3a91c27d8f44');
const VISUAL_ANALYST_MEMBER_ID = visualFixtureId('e2000000-0000-4000-8000-000000000001');
const VISUAL_ANALYST_EMAIL = visualFixtureEmail('rahul@asterlane.co', 'visual-analyst');
const VISUAL_IMPORT_JOB_ID = visualFixtureId('e2000000-0000-4000-8000-000000000010');
const VISUAL_DISPUTE_ID = visualFixtureId('e2000000-0000-4000-8000-000000000011');
const VISUAL_WORKFLOW_DEFINITION_ID = visualFixtureId('e2000000-0000-4000-8000-000000000012');
const VISUAL_DOMAIN_EVENT_ID = visualFixtureId('e2000000-0000-4000-8000-000000000013');
const VISUAL_WORKFLOW_RUN_ID = visualFixtureId('e2000000-0000-4000-8000-000000000014');
const VISUAL_EXCEPTION_IDS = [
  'e2000000-0000-4000-8000-000000000020',
  'e2000000-0000-4000-8000-000000000021',
  'e2000000-0000-4000-8000-000000000022',
  'e2000000-0000-4000-8000-000000000023',
].map(visualFixtureId);
const VISUAL_PERMISSION_GRANTS = [
  'view_dashboard', 'view_audit', 'view_customers', 'view_lookup', 'view_watchlist',
  'view_chargebacks', 'view_inbox', 'view_saved', 'view_team', 'view_settings',
  'view_audit_trail', 'manage_work_views', 'export_audit', 'lookup_customer',
  'update_customer_status', 'add_customer_note', 'delete_customer_note',
  'manage_watchlist', 'generate_evidence', 'submit_fraud_feedback',
  'submit_payout_decisions', 'manage_work', 'dismiss_transaction', 'hide_job',
  'bulk_delete', 'manage_team', 'manage_settings',
];
const IDS = Object.freeze({
  customer: 'd1300000-0000-4000-8000-000000000000',
  order: 'd1300000-0000-4000-8000-000000000001',
  refund: 'd1300000-0000-4000-8000-000000000002',
  return: 'd1300000-0000-4000-8000-000000000003',
  ticket: 'd1300000-0000-4000-8000-000000000004',
  dispute: 'd1300000-0000-4000-8000-000000000005',
  workflowDefinition: 'd1300000-0000-4000-8000-000000000010',
  domainEvent: 'd1300000-0000-4000-8000-000000000007',
  workflowRun: 'd1300000-0000-4000-8000-000000000011',
  workflowStepEvidence: 'd1300000-0000-4000-8000-000000000012',
  workflowStepTask: 'd1300000-0000-4000-8000-000000000013',
  workflowStepReceipt: 'd1300000-0000-4000-8000-000000000014',
  shipment: 'd1300000-0000-4000-8000-00000000000c',
  importJob: 'd1300000-0000-4000-8000-00000000000d',
});
const FIXED_AT = Object.freeze({
  placed: '2026-08-09T09:15:00.000Z',
  refund: '2026-08-10T11:30:00.000Z',
  returnRequested: '2026-08-09T16:00:00.000Z',
  returnReceived: '2026-08-11T14:20:00.000Z',
  dispute: '2026-08-11T08:45:00.000Z',
  ticket: '2026-08-09T10:05:00.000Z',
  event: '2026-08-12T09:00:00.000Z',
  completed: '2026-08-12T09:00:01.240Z',
});

function parseArgs(argv) {
  const parsed = new Map();
  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    parsed.set(key, next && !next.startsWith('--') ? argv[++index] : true);
  }
  return parsed;
}

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function assertLoopbackUrl(value, label) {
  const url = new URL(value);
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  if (!['127.0.0.1', 'localhost', '::1'].includes(hostname)) {
    throw new Error(`${label} must use a loopback host; refused ${hostname}`);
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error(`${label} must use HTTP(S)`);
  }
  return url.toString().replace(/\/$/, '');
}

function safeJsonObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

async function one(client, table, id) {
  const { data, error } = await client.from(table).select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(`${table} preflight failed: ${error.message}`);
  return data;
}

async function assertUnclaimed(client, table, id, ownsRow) {
  const row = await one(client, table, id);
  if (!row) return;
  if (row.merchant_id !== RELEASE_MERCHANT_ID || !ownsRow(row)) {
    throw new Error(`Refused to overwrite non-fixture row ${table}:${id}`);
  }
}

async function upsert(client, table, payload, onConflict = 'id') {
  const { error } = await client.from(table).upsert(payload, { onConflict });
  if (error) throw new Error(`${table} fixture write failed: ${error.message}`);
}

async function insertIfMissing(client, table, payload) {
  const existing = await one(client, table, payload.id);
  if (existing) return;
  const { error } = await client.from(table).insert(payload);
  if (error) throw new Error(`${table} fixture insert failed: ${error.message}`);
}

async function resolveFixtureOwner(client, email, fixtureTag, setupComplete, allowLegacyUntagged = false, extraMetadata = {}) {
  const { data: users, error: usersError } = await client.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (usersError) throw usersError;
  const existing = users.users.find((user) => user.email === email);
  if (existing) {
    if (existing.user_metadata?.fixture !== fixtureTag && !allowLegacyUntagged) {
      throw new Error(`Refused existing untagged fixture owner ${email}`);
    }
    const { data, error } = await client.auth.admin.updateUserById(existing.id, {
      user_metadata: { ...existing.user_metadata, ...extraMetadata, fixture: fixtureTag, setup_complete: setupComplete },
    });
    if (error || !data.user) throw error ?? new Error(`Fixture owner reset failed for ${email}`);
    return data.user;
  }
  const { data, error } = await client.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { ...extraMetadata, fixture: fixtureTag, setup_complete: setupComplete },
  });
  if (error || !data.user) throw error ?? new Error(`Fixture owner creation failed for ${email}`);
  return data.user;
}

const args = parseArgs(process.argv);
const defaultManifest = 'artifacts/unauth-ui/distinctive-craft-2026-08-13/fixture-manifest.json';

if (args.has('plan')) {
  process.stdout.write(`${JSON.stringify({
    fixtureTag: FIXTURE_TAG,
    localOnly: true,
    releaseMerchantId: RELEASE_MERCHANT_ID,
    onboardingMerchantId: ONBOARDING_MERCHANT_ID,
    records: IDS,
    manifest: path.resolve(String(args.get('manifest') ?? defaultManifest)),
  }, null, 2)}\n`);
  process.exit(0);
}

if (process.env.RELEASE_E2E_LOCAL !== '1') {
  throw new Error('Set RELEASE_E2E_LOCAL=1 to acknowledge local-only synthetic fixture writes');
}

const supabaseUrl = assertLoopbackUrl(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? required('SUPABASE_URL'),
  'Supabase URL',
);
const serviceRole = required('SUPABASE_SERVICE_ROLE_KEY');
const requestedMerchant = required('E2E_MERCHANT_ID');
if (requestedMerchant !== RELEASE_MERCHANT_ID) {
  throw new Error(`E2E_MERCHANT_ID must be the synthetic release tenant ${RELEASE_MERCHANT_ID}`);
}

const supabase = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });
const { data: merchant, error: merchantError } = await supabase
  .from('merchants')
  .select('id,name,is_demo,is_internal,settings')
  .eq('id', RELEASE_MERCHANT_ID)
  .maybeSingle();
if (merchantError) throw merchantError;
const merchantSettings = safeJsonObject(merchant?.settings);
if (
  !merchant
  || merchant.is_demo !== true
  || merchant.is_internal !== true
  || merchantSettings.fixture !== 'release-e2e-local'
) {
  throw new Error('Synthetic release tenant is missing or not marked is_demo + is_internal + release-e2e-local');
}

// Isolated parity consumes existing release records read-only. Only its new
// namespaced visual/onboarding tenants are written in this mode.
let releaseOwner;
if (!visualFixtureNamespace) {
await Promise.all([
  assertUnclaimed(supabase, 'merchant_customers', IDS.customer, (row) => safeJsonObject(row.raw_metadata).fixture === FIXTURE_TAG),
  assertUnclaimed(supabase, 'source_orders', IDS.order, (row) => String(row.note ?? '').includes(FIXTURE_TAG) || row.order_number === DISPLAY_REFS.orderNumber),
  assertUnclaimed(supabase, 'source_refunds', IDS.refund, (row) => String(row.external_id ?? '').startsWith(FIXTURE_TAG) || row.external_id === DISPLAY_REFS.refund),
  assertUnclaimed(supabase, 'source_returns', IDS.return, (row) => safeJsonObject(row.raw_metadata).fixture === FIXTURE_TAG),
  assertUnclaimed(supabase, 'source_tickets', IDS.ticket, (row) => (Array.isArray(row.tags) && row.tags.includes(FIXTURE_TAG)) || row.external_id === DISPLAY_REFS.ticket),
  assertUnclaimed(supabase, 'source_disputes', IDS.dispute, (row) => String(row.external_id ?? '').startsWith(FIXTURE_TAG) || row.external_id === DISPLAY_REFS.dispute),
  assertUnclaimed(supabase, 'workflow_definitions', IDS.workflowDefinition, (row) => String(row.description ?? '').includes(FIXTURE_TAG) || row.name === DISPLAY_REFS.workflow),
  assertUnclaimed(supabase, 'domain_events', IDS.domainEvent, (row) => String(row.idempotency_key ?? '').startsWith(FIXTURE_TAG)),
  assertUnclaimed(supabase, 'workflow_runs', IDS.workflowRun, (row) => row.workflow_definition_id === IDS.workflowDefinition),
  assertUnclaimed(supabase, 'source_shipments', IDS.shipment, (row) => safeJsonObject(row.raw_metadata).fixture === FIXTURE_TAG),
  assertUnclaimed(supabase, 'sync_jobs', IDS.importJob, (row) => String(row.label ?? '').includes(FIXTURE_TAG) || row.label === DISPLAY_REFS.importJob),
]);

await upsert(supabase, 'merchant_customers', {
  id: IDS.customer,
  merchant_id: RELEASE_MERCHANT_ID,
  display_name: 'Avery Stone',
  email: 'avery.stone@example.invalid',
  raw_metadata: { fixture: FIXTURE_TAG, synthetic: true },
  resolution_status: 'active',
  matcher_version: FIXTURE_TAG,
  last_resolved_at: FIXED_AT.returnReceived,
  created_at: FIXED_AT.placed,
  updated_at: FIXED_AT.returnReceived,
});

await upsert(supabase, 'source_orders', {
  id: IDS.order,
  merchant_id: RELEASE_MERCHANT_ID,
  external_id: DISPLAY_REFS.orderExternal,
  order_number: DISPLAY_REFS.orderNumber,
  source: 'manual',
  financial_status: 'partially_refunded',
  fulfillment_state: 'returned',
  currency: 'GBP',
  subtotal_price: 184.5,
  total_discounts: 0,
  total_price: 184.5,
  order_value: 184.5,
  line_items_count: 2,
  placed_at: FIXED_AT.placed,
  processed_at: FIXED_AT.placed,
  ingested_at: FIXED_AT.placed,
  updated_at: FIXED_AT.returnReceived,
  note: 'Return received; refund settlement needs review.',
  tags: ['returns', 'refund-review'],
  merchant_customer_id: IDS.customer,
});

await Promise.all([
  upsert(supabase, 'source_refunds', {
    id: IDS.refund,
    merchant_id: RELEASE_MERCHANT_ID,
    source_order_id: IDS.order,
    external_id: DISPLAY_REFS.refund,
    amount: 64.5,
    currency: 'GBP',
    reason: 'Returned item received and inspected',
    is_full_refund: false,
    refunded_at: FIXED_AT.refund,
    raw_payload_hash: crypto.createHash('sha256').update(`${FIXTURE_TAG}:refund`).digest('hex'),
    ingested_at: FIXED_AT.refund,
  }),
  upsert(supabase, 'source_returns', {
    id: IDS.return,
    merchant_id: RELEASE_MERCHANT_ID,
    source_order_id: IDS.order,
    external_id: DISPLAY_REFS.return,
    status: 'received',
    source_status: 'inspection_complete',
    disposition: 'restock',
    requested_at: FIXED_AT.returnRequested,
    received_at: FIXED_AT.returnReceived,
    inspected_at: FIXED_AT.returnReceived,
    refund_reference: DISPLAY_REFS.refund,
    raw_metadata: { fixture: FIXTURE_TAG, synthetic: true },
    created_at: FIXED_AT.returnRequested,
    updated_at: FIXED_AT.returnReceived,
  }),
  upsert(supabase, 'source_tickets', {
    id: IDS.ticket,
    merchant_id: RELEASE_MERCHANT_ID,
    provider: 'gorgias',
    external_id: DISPLAY_REFS.ticket,
    subject: 'Return received but refund not visible',
    status: 'open',
    channel: 'email',
    tags: ['returns', 'refund-review'],
    is_spam: false,
    message_count: 4,
    customer_reply_count: 2,
    was_reopened: false,
    linked_order_external_ids: [DISPLAY_REFS.orderExternal],
    opened_at_provider: FIXED_AT.ticket,
    created_at_provider: FIXED_AT.ticket,
    updated_at_provider: FIXED_AT.returnReceived,
    raw_payload_hash: crypto.createHash('sha256').update(`${FIXTURE_TAG}:ticket`).digest('hex'),
    ingested_at: FIXED_AT.ticket,
    updated_at: FIXED_AT.returnReceived,
  }),
  upsert(supabase, 'source_disputes', {
    id: IDS.dispute,
    merchant_id: RELEASE_MERCHANT_ID,
    source_order_id: IDS.order,
    external_id: DISPLAY_REFS.dispute,
    dispute_type: 'chargeback',
    reason: 'Product not received',
    amount: 184.5,
    currency: 'GBP',
    status: 'under_review',
    initiated_at: FIXED_AT.dispute,
    ingested_at: FIXED_AT.dispute,
  }),
  upsert(supabase, 'source_shipments', {
    id: IDS.shipment,
    merchant_id: RELEASE_MERCHANT_ID,
    source_order_id: IDS.order,
    external_id: DISPLAY_REFS.shipment,
    tracking_number: DISPLAY_REFS.tracking,
    carrier: 'Royal Mail',
    service: 'Tracked 24',
    status: 'delivered',
    source_status: 'delivered',
    shipped_at: FIXED_AT.placed,
    delivered_at: FIXED_AT.returnRequested,
    raw_metadata: { fixture: FIXTURE_TAG, synthetic: true },
    created_at: FIXED_AT.placed,
    updated_at: FIXED_AT.returnRequested,
  }),
  upsert(supabase, 'sync_jobs', {
    id: IDS.importJob,
    merchant_id: RELEASE_MERCHANT_ID,
    job_kind: 'csv_import',
    source: 'manual',
    status: 'completed',
    label: DISPLAY_REFS.importJob,
    file_hash: crypto.createHash('sha256').update(`${FIXTURE_TAG}:import`).digest('hex'),
    column_map: { order_number: 'order_number', amount: 'amount', currency: 'currency' },
    total_rows: 24,
    processed_rows: 22,
    failed_rows: 2,
    error_log: [
      { row: 8, code: 'missing_currency', field: 'currency' },
      { row: 17, code: 'invalid_amount', field: 'amount' },
    ],
    hidden: false,
    created_at: FIXED_AT.event,
    started_at: FIXED_AT.event,
    completed_at: FIXED_AT.completed,
    updated_at: FIXED_AT.completed,
  }),
]);

await upsert(supabase, 'workflow_definitions', {
  id: IDS.workflowDefinition,
  merchant_id: RELEASE_MERCHANT_ID,
  name: DISPLAY_REFS.workflow,
  description: 'Collect refund and return evidence, then create a bounded review task for the merchant team.',
  trigger_event_type: 'source.refund.ingested',
  conditions: [{ field: 'refund.currency', operator: 'eq', value: 'GBP' }],
  outputs: [
    { type: 'request_evidence', evidenceType: 'return_inspection', title: 'Collect refund receipt and return inspection' },
    { type: 'create_task', title: 'Verify refund settlement', dueInHours: 24 },
  ],
  active: true,
  status: 'published',
  version: 1,
  published_at: FIXED_AT.event,
  created_at: FIXED_AT.placed,
  updated_at: FIXED_AT.event,
});

await insertIfMissing(supabase, 'domain_events', {
  id: IDS.domainEvent,
  merchant_id: RELEASE_MERCHANT_ID,
  event_type: 'source.refund.ingested',
  aggregate_type: 'refund',
  aggregate_id: IDS.refund,
  actor_type: 'system',
  idempotency_key: `${FIXTURE_TAG}:domain-event:001`,
  occurred_at: FIXED_AT.event,
  recorded_at: FIXED_AT.event,
  payload: {
    refund_id: IDS.refund,
    amount_minor: 6450,
    currency: 'GBP',
    completeness: 'known',
  },
  created_at: FIXED_AT.event,
});

await upsert(supabase, 'workflow_runs', {
  id: IDS.workflowRun,
  merchant_id: RELEASE_MERCHANT_ID,
  workflow_definition_id: IDS.workflowDefinition,
  domain_event_id: IDS.domainEvent,
  status: 'completed',
  error: null,
  started_at: FIXED_AT.event,
  completed_at: FIXED_AT.completed,
});

await Promise.all([
  upsert(supabase, 'workflow_step_runs', {
    id: IDS.workflowStepEvidence,
    merchant_id: RELEASE_MERCHANT_ID,
    workflow_run_id: IDS.workflowRun,
    step_index: 0,
    output_type: 'request_evidence',
    status: 'completed',
    result: { consumed: ['refund_receipt'], missing: ['return_inspection'] },
    error: null,
    created_at: '2026-08-12T09:00:00.100Z',
    completed_at: '2026-08-12T09:00:00.420Z',
  }),
  upsert(supabase, 'workflow_step_runs', {
    id: IDS.workflowStepTask,
    merchant_id: RELEASE_MERCHANT_ID,
    workflow_run_id: IDS.workflowRun,
    step_index: 1,
    output_type: 'create_task',
    status: 'completed',
    result: { title: 'Verify refund settlement', responsibility: 'merchant_operator' },
    error: null,
    created_at: '2026-08-12T09:00:00.430Z',
    completed_at: '2026-08-12T09:00:00.840Z',
  }),
  upsert(supabase, 'workflow_step_runs', {
    id: IDS.workflowStepReceipt,
    merchant_id: RELEASE_MERCHANT_ID,
    workflow_run_id: IDS.workflowRun,
    step_index: 2,
    output_type: 'record_outcome',
    status: 'completed',
    result: { outcome: 'task_created', external_action: false },
    error: null,
    created_at: '2026-08-12T09:00:00.850Z',
    completed_at: FIXED_AT.completed,
  }),
]);

const { data: activeReleaseOwners, error: activeReleaseOwnersError } = await supabase
  .from('merchant_users')
  .select('id,merchant_id,invited_email')
  .eq('merchant_id', RELEASE_MERCHANT_ID)
  .eq('role', 'owner')
  .eq('invite_status', 'active');
if (activeReleaseOwnersError) throw activeReleaseOwnersError;
if (activeReleaseOwners?.some((member) => member.id !== RELEASE_MEMBER_ID)) {
  throw new Error(`Refused unexpected active owner for release fixture ${RELEASE_MERCHANT_ID}`);
}
const existingReleaseMember = await one(supabase, 'merchant_users', RELEASE_MEMBER_ID);
if (
  existingReleaseMember
  && (
    existingReleaseMember.merchant_id !== RELEASE_MERCHANT_ID
    || existingReleaseMember.invited_email !== RELEASE_OWNER_EMAIL
  )
) {
  throw new Error(`Refused non-fixture release membership ${RELEASE_MEMBER_ID}`);
}
releaseOwner = await resolveFixtureOwner(
  supabase,
  RELEASE_OWNER_EMAIL,
  RELEASE_FIXTURE_TAG,
  true,
  true,
);
await upsert(supabase, 'merchant_users', {
  id: RELEASE_MEMBER_ID,
  merchant_id: RELEASE_MERCHANT_ID,
  user_id: releaseOwner.id,
  invited_email: RELEASE_OWNER_EMAIL,
  role: 'owner',
  invite_status: 'active',
  accepted_at: FIXED_AT.event,
});

}

const visualMerchant = await one(supabase, 'merchants', VISUAL_MERCHANT_ID);
if (
  !visualMerchant
  || visualMerchant.is_demo !== true
  || safeJsonObject(visualMerchant.settings).synthetic_fixture?.dataset_id !== 'asterlane-august-2026-loss-desk'
) {
  throw new Error('Canonical local Asterlane visual fixture is missing or is not marked synthetic');
}
const { error: visualMerchantNameError } = await supabase
  .from('merchants')
  .update({ name: 'Asterlane' })
  .eq('id', VISUAL_MERCHANT_ID);
if (visualMerchantNameError) throw new Error(`Canonical visual workspace name update failed: ${visualMerchantNameError.message}`);
await upsert(supabase, 'sync_jobs', {
  id: VISUAL_IMPORT_JOB_ID,
  merchant_id: VISUAL_MERCHANT_ID,
  job_kind: 'csv_import',
  source: 'manual',
  status: 'completed',
  label: 'Orders evidence import · August 2026',
  file_hash: crypto.createHash('sha256').update(`${FIXTURE_TAG}:asterlane-import`).digest('hex'),
  column_map: { order_number: 'order_number', amount: 'amount', currency: 'currency' },
  total_rows: 218,
  processed_rows: 202,
  failed_rows: 16,
  error_log: [{ row: 17, code: 'missing_currency', field: 'currency' }],
  hidden: false,
  created_at: FIXED_AT.event,
  started_at: FIXED_AT.event,
  completed_at: FIXED_AT.completed,
  updated_at: FIXED_AT.completed,
});
const { data: visualOrder, error: visualOrderError } = await supabase
  .from('source_orders')
  .select('id,currency,total_price')
  .eq('merchant_id', VISUAL_MERCHANT_ID)
  .order('placed_at')
  .limit(1)
  .maybeSingle();
if (visualOrderError || !visualOrder?.id) throw visualOrderError ?? new Error('Canonical visual fixture has no source order');
await upsert(supabase, 'source_disputes', {
  id: VISUAL_DISPUTE_ID,
  merchant_id: VISUAL_MERCHANT_ID,
  source_order_id: visualOrder.id,
  external_id: 'DSP-88214',
  dispute_type: 'chargeback',
  reason: 'Product not received',
  amount: Number(visualOrder.total_price ?? 0),
  currency: visualOrder.currency ?? 'GBP',
  status: 'under_review',
  initiated_at: FIXED_AT.dispute,
  ingested_at: FIXED_AT.dispute,
});
const { data: visualRefund, error: visualRefundError } = await supabase
  .from('source_refunds')
  .select('id,currency,amount')
  .eq('merchant_id', VISUAL_MERCHANT_ID)
  .order('ingested_at')
  .limit(1)
  .maybeSingle();
if (visualRefundError || !visualRefund?.id) throw visualRefundError ?? new Error('Canonical visual fixture has no source refund');
await upsert(supabase, 'workflow_definitions', {
  id: VISUAL_WORKFLOW_DEFINITION_ID,
  merchant_id: VISUAL_MERCHANT_ID,
  name: 'Refund evidence request',
  description: 'Collect refund and return evidence, then create a bounded review task for the merchant team.',
  trigger_event_type: 'source.refund.ingested',
  conditions: [{ field: 'refund.currency', operator: 'eq', value: 'GBP' }],
  outputs: [
    { type: 'request_evidence', evidenceType: 'return_inspection', title: 'Collect refund receipt and return inspection' },
    { type: 'create_task', title: 'Verify refund settlement', dueInHours: 24 },
  ],
  active: true,
  status: 'published',
  version: 1,
  published_at: FIXED_AT.event,
  created_at: FIXED_AT.placed,
  updated_at: FIXED_AT.event,
});
await insertIfMissing(supabase, 'domain_events', {
  id: VISUAL_DOMAIN_EVENT_ID,
  merchant_id: VISUAL_MERCHANT_ID,
  event_type: 'source.refund.ingested',
  aggregate_type: 'refund',
  aggregate_id: visualRefund.id,
  actor_type: 'system',
  idempotency_key: `${FIXTURE_TAG}:asterlane-domain-event:001`,
  occurred_at: FIXED_AT.event,
  recorded_at: FIXED_AT.event,
  payload: {
    refund_id: visualRefund.id,
    amount: Number(visualRefund.amount ?? 0),
    currency: visualRefund.currency ?? 'GBP',
    completeness: 'known',
  },
  created_at: FIXED_AT.event,
});
await upsert(supabase, 'workflow_runs', {
  id: VISUAL_WORKFLOW_RUN_ID,
  merchant_id: VISUAL_MERCHANT_ID,
  workflow_definition_id: VISUAL_WORKFLOW_DEFINITION_ID,
  domain_event_id: VISUAL_DOMAIN_EVENT_ID,
  status: 'completed',
  error: null,
  started_at: FIXED_AT.event,
  completed_at: FIXED_AT.completed,
});
const { data: visualCases, error: visualCasesError } = await supabase
  .from('support_payout_cases')
  .select('id')
  .eq('merchant_id', VISUAL_MERCHANT_ID)
  .order('created_at')
  .limit(VISUAL_EXCEPTION_IDS.length);
if (visualCasesError || (visualCases?.length ?? 0) !== VISUAL_EXCEPTION_IDS.length) {
  throw visualCasesError ?? new Error('Canonical visual fixture has insufficient cases for reconciliation exceptions');
}
const visualExceptionTitles = [
  'Evri paid short on a damage claim',
  'UPS capped at declared value',
  'UPS claim unpaid, still inside its window',
  'Held import rows, never posted',
];
for (let index = 0; index < VISUAL_EXCEPTION_IDS.length; index += 1) {
  await upsert(supabase, 'case_exceptions', {
    id: VISUAL_EXCEPTION_IDS[index],
    merchant_id: VISUAL_MERCHANT_ID,
    support_payout_case_id: visualCases[index].id,
    exception_type: 'match_uncertainty',
    confidence: 'probable',
    status: 'open',
    title: visualExceptionTitles[index],
    detail: 'Synthetic August 2026 visual-authority reconciliation fixture.',
    context: { synthetic: true, seed: FIXTURE_TAG, period: '2026-08' },
    subject_entity_type: 'support_payout_case',
    subject_entity_id: visualCases[index].id,
    source_system: 'visual_authority_fixture',
    dedup_key: `${FIXTURE_TAG}:asterlane-reconciliation:${index + 1}`,
    created_at: FIXED_AT.event,
    updated_at: FIXED_AT.event,
  });
}
const visualAnalyst = await resolveFixtureOwner(
  supabase,
  VISUAL_ANALYST_EMAIL,
  FIXTURE_TAG,
  true,
  false,
  { full_name: 'Rahul Mehta', role: 'analyst', persona: 'supplied-visual-authority' },
);
await upsert(supabase, 'merchant_users', {
  id: VISUAL_ANALYST_MEMBER_ID,
  merchant_id: VISUAL_MERCHANT_ID,
  user_id: visualAnalyst.id,
  invited_email: VISUAL_ANALYST_EMAIL,
  role: 'analyst',
  invite_status: 'active',
  accepted_at: FIXED_AT.event,
});
for (const permission of VISUAL_PERMISSION_GRANTS) {
  const { error } = await supabase.from('user_permission_grants').upsert({
    merchant_id: VISUAL_MERCHANT_ID,
    grantee_user_id: visualAnalyst.id,
    permission,
    revoked: false,
    revoked_at: null,
  }, { onConflict: 'merchant_id,grantee_user_id,permission' });
  if (error) throw new Error(`visual analyst permission fixture write failed: ${error.message}`);
}
const verifiedVisualMember = await one(supabase, 'merchant_users', VISUAL_ANALYST_MEMBER_ID);
if (!verifiedVisualMember || verifiedVisualMember.user_id !== visualAnalyst.id || verifiedVisualMember.role !== 'analyst') {
  throw new Error('Canonical visual analyst membership failed persisted read-back verification');
}
const verifiedReleaseMember = await one(supabase, 'merchant_users', RELEASE_MEMBER_ID);
if (
  !verifiedReleaseMember
  || verifiedReleaseMember.merchant_id !== RELEASE_MERCHANT_ID
  || (!visualFixtureNamespace && verifiedReleaseMember.user_id !== releaseOwner.id)
  || verifiedReleaseMember.invited_email !== RELEASE_OWNER_EMAIL
  || verifiedReleaseMember.role !== 'owner'
  || verifiedReleaseMember.invite_status !== 'active'
) {
  throw new Error('Synthetic release owner membership failed persisted read-back verification');
}
const { data: verifiedReleaseOwner, error: verifiedReleaseOwnerError } = await supabase.auth.admin.getUserById(verifiedReleaseMember.user_id);
if (verifiedReleaseOwnerError || verifiedReleaseOwner.user?.email !== RELEASE_OWNER_EMAIL) {
  throw verifiedReleaseOwnerError ?? new Error('Synthetic release owner auth identity failed persisted read-back verification');
}

const onboardingOwner = await resolveFixtureOwner(
  supabase,
  ONBOARDING_OWNER_EMAIL,
  FIXTURE_TAG,
  false,
);
const existingOnboarding = await one(supabase, 'merchants', ONBOARDING_MERCHANT_ID);
if (existingOnboarding && safeJsonObject(existingOnboarding.settings).fixture !== FIXTURE_TAG) {
  throw new Error(`Refused untagged onboarding merchant ${ONBOARDING_MERCHANT_ID}`);
}
await upsert(supabase, 'merchants', {
  id: ONBOARDING_MERCHANT_ID,
  name: 'Evidence Operations Setup Preview',
  is_demo: true,
  is_internal: true,
  settings: { fixture: FIXTURE_TAG, setup_complete: false, timezone: 'Europe/London' },
});
await upsert(supabase, 'merchant_users', {
  id: ONBOARDING_MEMBER_ID,
  merchant_id: ONBOARDING_MERCHANT_ID,
  user_id: onboardingOwner.id,
  invited_email: ONBOARDING_OWNER_EMAIL,
  role: 'owner',
  invite_status: 'active',
  accepted_at: FIXED_AT.event,
});

const recordChecks = await Promise.all([
  ['source_orders', IDS.order],
  ['source_refunds', IDS.refund],
  ['source_returns', IDS.return],
  ['source_tickets', IDS.ticket],
  ['source_disputes', IDS.dispute],
  ['workflow_definitions', IDS.workflowDefinition],
  ['domain_events', IDS.domainEvent],
  ['workflow_runs', IDS.workflowRun],
].map(async ([table, id]) => ({ table, id, present: Boolean(await one(supabase, table, id)) })));
if (recordChecks.some((record) => !record.present)) {
  throw new Error('One or more distinctive capture records failed post-write verification');
}

const manifestPath = path.resolve(String(args.get('manifest') ?? defaultManifest));
const fixtureManifest = {
  schemaVersion: 1,
  fixtureTag: FIXTURE_TAG,
  generatedAt: new Date().toISOString(),
  localOnly: true,
  supabaseOrigin: new URL(supabaseUrl).origin,
  merchantId: RELEASE_MERCHANT_ID,
  releaseOwnerEmail: RELEASE_OWNER_EMAIL,
  onboardingMerchantId: ONBOARDING_MERCHANT_ID,
  onboardingOwnerEmail: ONBOARDING_OWNER_EMAIL,
  visualMerchantId: VISUAL_MERCHANT_ID,
  visualMemberRole: 'analyst',
  visualMemberEmail: VISUAL_ANALYST_EMAIL,
  records: IDS,
  routes: {
    order: `/orders/${IDS.order}`,
    refund: `/refunds/${IDS.refund}`,
    return: `/returns/${IDS.return}`,
    ticket: `/tickets/${IDS.ticket}`,
    dispute: `/disputes/${IDS.dispute}`,
    flow: `/controls/flows/${IDS.workflowDefinition}`,
    flowRun: `/controls/flows/runs/${IDS.workflowRun}`,
  },
  recordChecks,
};
fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
fs.writeFileSync(manifestPath, `${JSON.stringify(fixtureManifest, null, 2)}\n`, { mode: 0o600 });
process.stdout.write(`Distinctive capture fixtures verified for local synthetic tenant ${RELEASE_MERCHANT_ID}.\n`);
process.stdout.write(`Fixture manifest: ${path.relative(process.cwd(), manifestPath)}\n`);
process.stdout.write(`Allow both local capture tenants: E2E_ALLOWED_MERCHANT_IDS=${RELEASE_MERCHANT_ID},${ONBOARDING_MERCHANT_ID}\n`);
