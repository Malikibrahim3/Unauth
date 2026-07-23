import { spawnSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const MERCHANT_ID = 'a1000000-0000-4000-8000-000000000010';
const OWNER_MEMBER_ID = 'a1000000-0000-4000-8000-000000000020';
const RULE_ID = 'a1000000-0000-4000-8000-000000000030';
const RULE_VERSION_ID = 'a1000000-0000-4000-8000-000000000031';
const WORKFLOW_ID = 'a1000000-0000-4000-8000-000000000040';
const OWNER_EMAIL = 'stage-h-owner@example.invalid';

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function assertLocalUrl(value) {
  const url = new URL(value);
  if (!['127.0.0.1', 'localhost', '::1'].includes(url.hostname)) {
    throw new Error(`Release E2E fixture refused non-local Supabase host ${url.hostname}`);
  }
  return url.toString().replace(/\/$/, '');
}

if (process.env.RELEASE_E2E_LOCAL !== '1') {
  throw new Error('Set RELEASE_E2E_LOCAL=1 to acknowledge this local-only synthetic fixture');
}

const supabaseUrl = assertLocalUrl(required('NEXT_PUBLIC_SUPABASE_URL'));
const serviceRole = required('SUPABASE_SERVICE_ROLE_KEY');
const supabase = createClient(supabaseUrl, serviceRole, {
  auth: { persistSession: false },
});

const { data: userList, error: listError } = await supabase.auth.admin.listUsers({
  page: 1,
  perPage: 1000,
});
if (listError) throw listError;

let owner = userList.users.find((user) => user.email === OWNER_EMAIL);
if (!owner) {
  const { data, error } = await supabase.auth.admin.createUser({
    email: OWNER_EMAIL,
    email_confirm: true,
    user_metadata: { fixture: 'release-e2e-local' },
  });
  if (error || !data.user) {
    throw error ?? new Error('Synthetic release owner creation failed');
  }
  owner = data.user;
}

const { error: merchantError } = await supabase.from('merchants').upsert(
  {
    id: MERCHANT_ID,
    name: 'Elara & Co Apparel',
    is_demo: true,
    is_internal: true,
    settings: {
      timezone: 'Europe/London',
      fixture: 'release-e2e-local',
      setup_complete: true,
    },
  },
  { onConflict: 'id' },
);
if (merchantError) throw merchantError;

const { error: memberError } = await supabase.from('merchant_users').upsert(
  {
    id: OWNER_MEMBER_ID,
    merchant_id: MERCHANT_ID,
    user_id: owner.id,
    invited_email: OWNER_EMAIL,
    role: 'owner',
    invite_status: 'active',
    accepted_at: new Date().toISOString(),
  },
  { onConflict: 'id' },
);
if (memberError) throw memberError;

const demoSeed = spawnSync('node', ['scripts/seed-demo-v2.mjs'], {
  cwd: process.cwd(),
  env: process.env,
  encoding: 'utf8',
  maxBuffer: 16 * 1024 * 1024,
});
if (demoSeed.status !== 0) {
  if (demoSeed.stdout) process.stdout.write(demoSeed.stdout);
  if (demoSeed.stderr) process.stderr.write(demoSeed.stderr);
  throw new Error('Canonical demo seed failed');
}
if (demoSeed.stdout) process.stdout.write(demoSeed.stdout);

const { data: cases, error: caseError } = await supabase
  .from('support_payout_cases')
  .select('id,amount_at_risk,currency,submitted_at,created_at')
  .eq('merchant_id', MERCHANT_ID)
  .order('created_at', { ascending: true });
if (caseError) throw caseError;

const primaryCase = cases?.[0];
if (!primaryCase) {
  throw new Error('Canonical demo seed did not create a payout case');
}

const { error: exceptionError } = await supabase.from('case_exceptions').upsert(
  {
    merchant_id: MERCHANT_ID,
    support_payout_case_id: primaryCase.id,
    exception_type: 'conflicting_financials',
    confidence: 'probable',
    status: 'open',
    title: 'Review conflicting source totals',
    detail: 'Synthetic release fixture: connected source totals need a merchant decision.',
    context: { fixture: 'release-e2e-local' },
    subject_entity_type: 'support_payout_case',
    subject_entity_id: primaryCase.id,
    source_system: 'release_e2e_fixture',
    dedup_key: 'release-e2e:connected-case-exception',
  },
  { onConflict: 'merchant_id,dedup_key' },
);
if (exceptionError) throw exceptionError;

const { error: notificationError } = await supabase.from('notifications').upsert(
  {
    merchant_id: MERCHANT_ID,
    recipient_user_id: owner.id,
    kind: 'approaching_deadline',
    title: 'Review payout case evidence',
    body: 'Synthetic release fixture notification for the connected merchant workflow.',
    target_href: `/claims/${primaryCase.id}`,
    deduplication_key: 'release-e2e:workflow-notification',
    read_at: null,
  },
  { onConflict: 'merchant_id,recipient_user_id,deduplication_key' },
);
if (notificationError) throw notificationError;

const { error: ruleError } = await supabase.from('merchant_rules').upsert(
  {
    id: RULE_ID,
    merchant_id: MERCHANT_ID,
    name: 'Evidence-first payout review',
    description: 'Routes incomplete payout evidence to manual review.',
    priority: 0,
    conditions: [],
    condition_operator: 'and',
    action: 'manual_review',
    is_active: true,
    is_default_template: false,
    archived_at: null,
  },
  { onConflict: 'id' },
);
if (ruleError) throw ruleError;

const { error: ruleVersionError } = await supabase
  .from('merchant_rule_versions')
  .upsert(
    {
      id: RULE_VERSION_ID,
      merchant_id: MERCHANT_ID,
      merchant_rule_id: RULE_ID,
      version: 1,
      status: 'published',
      name: 'Evidence-first payout review',
      description: 'Routes incomplete payout evidence to manual review.',
      priority: 0,
      conditions: [],
      condition_operator: 'and',
      action: 'manual_review',
      created_by: owner.id,
      published_by: owner.id,
      published_at: '2026-07-01T09:00:00.000Z',
    },
    { onConflict: 'id' },
  );
if (ruleVersionError) throw ruleVersionError;

const { error: workflowError } = await supabase
  .from('workflow_definitions')
  .upsert(
    {
      id: WORKFLOW_ID,
      merchant_id: MERCHANT_ID,
      name: 'Evidence follow-up',
      description: 'Creates a bounded task when a payout case needs evidence.',
      trigger_event_type: 'case.created',
      conditions: [],
      outputs: [
        {
          type: 'create_task',
          title: 'Collect payout evidence',
          priority: 'high',
          dueInHours: 24,
        },
      ],
      active: true,
      status: 'published',
      version: 1,
      created_by: owner.id,
      updated_by: owner.id,
      published_by: owner.id,
      published_at: '2026-07-01T09:00:00.000Z',
    },
    { onConflict: 'id' },
  );
if (workflowError) throw workflowError;

const { data: existingEntries, error: existingError } = await supabase
  .from('case_financial_entries')
  .select('idempotency_key')
  .eq('merchant_id', MERCHANT_ID)
  .like('idempotency_key', 'release-e2e:%');
if (existingError) throw existingError;

const existingKeys = new Set(
  (existingEntries ?? []).map((entry) => entry.idempotency_key),
);
const entries = [];

function addFinancialEntry(caseRow, state, amountMinor, caseIndex) {
  const idempotencyKey = `release-e2e:${caseRow.id}:${state}`;
  if (existingKeys.has(idempotencyKey)) return;
  const direction =
    state === 'recovered'
      ? 'credit'
      : state === 'paid' || state === 'confirmed_loss'
        ? 'debit'
        : 'memo';
  entries.push({
    merchant_id: MERCHANT_ID,
    support_payout_case_id: caseRow.id,
    state,
    amount_minor: Math.max(0, Math.round(amountMinor)),
    currency: String(caseRow.currency || 'GBP').toUpperCase(),
    direction,
    effective_at:
      caseRow.submitted_at ?? caseRow.created_at ?? new Date().toISOString(),
    idempotency_key: idempotencyKey,
    metadata: { fixture: 'release-e2e-local', case_index: caseIndex },
  });
}

(cases ?? []).forEach((caseRow, index) => {
  const amount = Math.max(
    0,
    Math.round(Number(caseRow.amount_at_risk ?? 0) * 100),
  );
  addFinancialEntry(caseRow, 'requested', amount, index);
  addFinancialEntry(caseRow, 'exposed', amount, index);
  if (index % 3 === 0) {
    addFinancialEntry(caseRow, 'approved', amount, index);
    addFinancialEntry(caseRow, 'paid', amount, index);
    addFinancialEntry(caseRow, 'confirmed_loss', amount * 0.8, index);
    addFinancialEntry(caseRow, 'recoverable', amount * 0.5, index);
    addFinancialEntry(caseRow, 'recovered', amount * 0.2, index);
    if (index % 6 === 0) {
      addFinancialEntry(caseRow, 'written_off', amount * 0.1, index);
    }
  } else if (index % 3 === 1) {
    addFinancialEntry(caseRow, 'prevented', amount, index);
  }
  if (index % 5 === 0) {
    addFinancialEntry(caseRow, 'estimated_loss', amount * 0.7, index);
  }
});

if (entries.length > 0) {
  const { error } = await supabase.from('case_financial_entries').insert(entries);
  if (error) throw error;
}

for (const caseRow of cases ?? []) {
  const { error } = await supabase.rpc('recompute_case_financial_summary', {
    p_merchant_id: MERCHANT_ID,
    p_case_id: caseRow.id,
  });
  if (error) throw error;
}

console.log(
  `Synthetic release fixture ready (${cases?.length ?? 0} cases; ${entries.length} new financial entries).`,
);
