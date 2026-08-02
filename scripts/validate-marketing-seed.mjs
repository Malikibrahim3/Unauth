import { buildMarketingFixture } from './marketing-seed/fixture.mjs';
import { CAPTURE_URLS, DEFAULT_AS_OF, MARKETING_STORY } from './marketing-seed/manifest.mjs';
import { quoteSql, resolveLocalDatabase, runSql } from './marketing-seed/local-database.mjs';

const asOf = process.argv.find((arg) => arg.startsWith('--as-of='))?.slice('--as-of='.length) ?? DEFAULT_AS_OF;
const fixture = buildMarketingFixture(asOf);
const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
};

const tables = fixture.tables;
const allText = JSON.stringify(tables);
const forbidden = [
  /\bUnauth Test\b/i, /simeon/i, /\bdemo(?:nstration)?\b/i, /\bsample\b/i,
  /\bseeded\b/i, /demo_seed/i, /@gmail\.com/i, /sr71labs/i,
];
for (const pattern of forbidden) check(!pattern.test(allText), `Forbidden visible fixture text matched ${pattern}`);
const emails = [...allText.matchAll(/[A-Z0-9._%+-]+@([A-Z0-9.-]+\.[A-Z]{2,})/gi)].map((match) => match[0]);
check(emails.every((email) => email.endsWith('.invalid')), 'Every fixture email must use the non-routable .invalid namespace');
check(tables.merchants[0].name === MARKETING_STORY.merchant.name, 'Merchant identity differs from the story manifest');
check(
  tables.merchants.some((merchant) =>
    merchant.id === MARKETING_STORY.onboarding.merchant.id
    && merchant.settings?.setup_complete === false),
  'Incomplete onboarding merchant is missing',
);
check(
  tables.merchant_users.some((membership) =>
    membership.merchant_id === MARKETING_STORY.onboarding.merchant.id
    && membership.user_id === MARKETING_STORY.onboarding.operator.id
    && membership.role === 'owner'),
  'Incomplete onboarding merchant lacks its owner membership',
);
check(tables.store_connections[0].store_key === MARKETING_STORY.merchant.storeDomain, 'Commerce account differs from the story manifest');
check(tables.helpdesk_connections.length === 1 && tables.helpdesk_connections[0].provider === 'gorgias', 'Exactly one Gorgias helpdesk must be configured');
check(tables.work_saved_views.length > 0 && tables.work_saved_views.some((view) => view.id === MARKETING_STORY.capture.workView), 'Marketing Work fixture must include its stable saved view');
check(
  tables.pending_provider_account_selections.some((selection) =>
    selection.id === MARKETING_STORY.capture.shipbobSelection
    && selection.accounts.length >= 2),
  'ShipBob selection route lacks a populated capture handoff',
);

const connected = tables.merchant_integrations.filter((row) => row.status === 'connected');
const attention = tables.merchant_integrations.filter((row) => row.status === 'degraded');
check(connected.length === 3 && attention.length === 1, 'Connection portfolio must contain three healthy sources and one attention source');
check(attention.every((row) => row.last_error_code && row.last_error_at), 'Attention connections must derive an actionable state in the production read model');
check(new Set(tables.merchant_integrations.map((row) => row.provider_account_name)).size === tables.merchant_integrations.length, 'Every connection needs a distinct merchant-recognisable account label');

const customerIds = new Set(tables.merchant_customers.map((row) => row.id));
const identityIds = new Set(tables.identities.map((row) => row.id));
const orderIds = new Set(tables.source_orders.map((row) => row.id));
const orderLineIds = new Set(tables.source_order_lines.map((row) => row.id));
const caseIds = new Set(tables.support_payout_cases.map((row) => row.id));
const lossIds = new Set(tables.loss_cases.map((row) => row.id));
check(tables.source_customers.every((row) => customerIds.has(row.merchant_customer_id)), 'Source customer is orphaned');
check(tables.merchant_customers.every((row) => identityIds.has(row.identity_id)), 'Merchant customer is orphaned from its identity');
const heroIdentityId = tables.merchant_customers.find((customer) => customer.id === MARKETING_STORY.capture.customer)?.identity_id;
const heroSourceCustomer = tables.source_customers.find((customer) => customer.id === MARKETING_STORY.capture.customer);
const heroSignal = tables.identity_signals.find((signal) => signal.source_customer_id === heroSourceCustomer?.id);
check(Boolean(heroSignal), 'Hero customer lacks a merchant-owned identity signal');
check(tables.identity_members.some((member) => member.identity_id === heroIdentityId && member.identifier_hash === heroSignal?.identifier_hash), 'Hero customer identity signal does not resolve through the production read model');
check(tables.identity_notes.some((row) => row.identity_id === heroIdentityId), 'Hero customer lacks a merchant note');
check(tables.source_orders.every((row) => customerIds.has(row.merchant_customer_id)), 'Order is orphaned from its customer');
check(tables.source_order_lines.every((row) => orderIds.has(row.source_order_id)), 'Order line is orphaned');
check(tables.source_disputes.every((row) => !row.source_order_id || orderIds.has(row.source_order_id)), 'Dispute is orphaned');
check(tables.source_refunds.every((row) => orderIds.has(row.source_order_id)), 'Refund is orphaned');
check(tables.source_returns.every((row) => !row.source_order_id || orderIds.has(row.source_order_id)), 'Return is orphaned');
check(tables.support_payout_cases.every((row) => orderIds.has(row.source_order_id) && customerIds.has(row.merchant_customer_id)), 'Case is orphaned');
check(tables.case_claimed_items.every((row) => caseIds.has(row.support_payout_case_id) && orderLineIds.has(row.source_order_line_id)), 'Claimed item is orphaned');
check(tables.evidence_items.every((row) => caseIds.has(row.claim_id)), 'Evidence item is orphaned');
check(tables.source_shipment_lines.every((row) => orderLineIds.has(row.source_order_line_id)), 'Shipment line is orphaned from its order line');
check(tables.recovery_cases.every((row) => caseIds.has(row.support_payout_case_id) && lossIds.has(row.loss_case_id)), 'Recovery is orphaned');

for (const arithmetic of fixture.validation.orderArithmetic) {
  check(
    arithmetic.line_subtotal_minor - arithmetic.discount_minor + arithmetic.shipping_minor + arithmetic.tax_minor === arithmetic.total_minor,
    `Order arithmetic does not reconcile for ${arithmetic.id}`,
  );
  const sourceOrder = tables.source_orders.find((row) => row.id === arithmetic.id);
  check(Math.round(Number(sourceOrder.total_price) * 100) === arithmetic.total_minor, `Order total differs from canonical total for ${arithmetic.id}`);
  const lineTotal = tables.source_order_lines.filter((line) => line.source_order_id === arithmetic.id).reduce((sum, line) => sum + line.total_minor, 0);
  check(lineTotal === arithmetic.line_subtotal_minor, `Order lines do not reconcile for ${arithmetic.id}`);
}

const customersWithCompleteAggregates = tables.source_customers.filter((row) => row.orders_count > 0 && Number(row.total_spent) > 0);
check(customersWithCompleteAggregates.length / tables.source_customers.length >= 0.95, 'Fewer than 95% of customers have lifetime value and order date inputs');
for (const customer of tables.source_customers) {
  const linked = tables.source_orders.filter((order) => order.merchant_customer_id === customer.merchant_customer_id);
  check(customer.orders_count === linked.length, `Customer order count differs for ${customer.id}`);
  check(Math.round(Number(customer.total_spent) * 100) === linked.reduce((sum, order) => sum + Math.round(Number(order.total_price) * 100), 0), `Customer lifetime value differs for ${customer.id}`);
}
check(tables.support_payout_cases.length / tables.source_orders.length < 0.25, 'Cases must represent fewer than 25% of orders');

const heroCaseIds = [
  MARKETING_STORY.capture.caseDecisionReady,
  MARKETING_STORY.capture.caseActiveRecovery,
  MARKETING_STORY.capture.caseResolvedRecovered,
];
for (const heroId of heroCaseIds) {
  const hero = tables.support_payout_cases.find((row) => row.id === heroId);
  check(Boolean(hero), `Missing hero case ${heroId}`);
  check(tables.case_claimed_items.some((row) => row.support_payout_case_id === heroId && row.match_status === 'confirmed'), `Hero case lacks claimed line ${heroId}`);
  check(tables.evidence_items.filter((row) => row.claim_id === heroId).length >= 4, `Hero case lacks four evidence items ${heroId}`);
  check(tables.claim_events.filter((row) => row.claim_id === heroId).length >= 4, `Hero case lacks four activity events ${heroId}`);
  check(tables.case_comments.some((row) => row.support_payout_case_id === heroId), `Hero case lacks team activity ${heroId}`);
  check(tables.case_recommendation_snapshots.filter((row) => row.support_payout_case_id === heroId).length === 3, `Hero case lacks three recommendation outputs ${heroId}`);
  check(tables.case_clarification_requests.some((row) => row.support_payout_case_id === heroId), `Hero case lacks an investigation ${heroId}`);
  check(Boolean(hero?.recommended_rule_id), `Hero case lacks an applied rule ${heroId}`);
}

check(tables.merchant_rules.some((row) => row.is_active === false), 'Rules need lifecycle variation');
check(new Set(tables.merchant_rule_versions.map((row) => row.version)).size >= 3, 'Rules need version variation');
check(tables.workflow_definitions.filter((row) => row.active).length >= 2, 'At least two flows must be active');
check(tables.workflow_definitions.some((row) => row.status === 'draft'), 'One flow must be a draft');
check(
  tables.workflow_definitions.every((row) =>
    row.conditions.every((condition) =>
      ['eq', 'neq', 'in', 'exists'].includes(condition.operator))
    && row.outputs.every((output) =>
      ['create_task', 'request_evidence', 'set_deadline', 'request_notification'].includes(output.type))),
  'Flows must use the production editor condition and action schema',
);
check(tables.workflow_runs.some((row) => row.status === 'completed'), 'Flows need an inspectable successful run');

const ownerIds = new Set(tables.work_tasks.map((row) => row.owner_user_id).filter(Boolean));
check(ownerIds.size >= 3 && tables.work_tasks.some((row) => row.owner_user_id === null), 'Work needs three owners plus unassigned');
const caseAges = new Set(tables.support_payout_cases.map((row) => Math.round((Date.parse(fixture.asOf) - Date.parse(row.submitted_at)) / 86_400_000)));
check(caseAges.size >= 4, 'Cases need at least four distinct waiting ages');
check(tables.loss_cases.every((row) => row.attribution && row.source_metadata?.source_label && row.currency === 'GBP'), 'Every loss needs source, value context and GBP');
check(tables.recovery_cases.every((row) => row.last_source_event_at && row.last_source_event_at !== row.updated_at), 'Recovery source freshness must be independent from internal updates');
check(new Set(tables.recovery_cases.map((row) => row.deadline_at)).size >= Math.ceil(tables.recovery_cases.length / 2), 'Recovery deadlines are too repetitive');
const recoveryCompositionCounts = new Map();
for (const recovery of tables.recovery_cases) {
  const composition = [
    recovery.amount_sought_minor,
    recovery.estimated_recoverable_min,
    recovery.estimated_recoverable_max,
    recovery.evidence_required.length,
    recovery.evidence_missing.length,
  ].join(':');
  recoveryCompositionCounts.set(composition, (recoveryCompositionCounts.get(composition) ?? 0) + 1);
}
check(Math.max(...recoveryCompositionCounts.values()) <= 2, 'Recovery cards repeat the same amount/evidence composition more than twice');
check(new Set(tables.notifications.map((row) => row.created_at.slice(11, 16))).size === tables.notifications.length, 'Notification timing is mechanically repetitive');
check(tables.notifications.every((row) => row.target_href.startsWith('/')), 'Notification deep links must be internal routes');
const resolvableNotificationTargets = new Set([
  '/work',
  '/integrations/ups',
  ...tables.recovery_cases.map((row) => `/recoveries/${row.id}`),
  ...tables.support_payout_cases.map((row) => `/claims/${row.id}`),
  ...tables.workflow_definitions.map((row) => `/flows/${row.id}`),
]);
check(tables.notifications.every((row) => resolvableNotificationTargets.has(row.target_href)), 'A notification deep link does not resolve to its source object');

const futureAllowed = new Set(['deadline_at', 'claim_deadline_at', 'next_chase_at', 'due_at', 'expires_at']);
for (const [table, rows] of Object.entries(tables)) {
  for (const row of rows) {
    for (const [field, value] of Object.entries(row)) {
      if (!field.endsWith('_at') || futureAllowed.has(field) || value === null) continue;
      check(Date.parse(value) <= Date.parse(fixture.asOf), `${table}.${field} occurs after the capture clock`);
    }
  }
}

const firstViewport = tables.support_payout_cases.slice(0, 9);
let longestTypeRun = 1;
let currentRun = 1;
for (let index = 1; index < firstViewport.length; index += 1) {
  currentRun = firstViewport[index].claim_type === firstViewport[index - 1].claim_type ? currentRun + 1 : 1;
  longestTypeRun = Math.max(longestTypeRun, currentRun);
}
check(longestTypeRun <= 3, 'The first case viewport has an implausible issue-type run');
const references = tables.source_orders.slice(0, 12).map((row) => Number(row.order_number.slice(1)));
check(!references.every((value, index) => index === 0 || value === references[index - 1] + 1), 'Order references are visibly sequential');

for (const summary of tables.case_financial_summaries) {
  check(summary.recoverable_minor <= Math.max(summary.confirmed_loss_minor, summary.estimated_loss_minor), `Recoverable value exceeds relevant loss for ${summary.support_payout_case_id}`);
  check(summary.recovered_minor <= summary.recoverable_minor, `Recovered value exceeds recoverable value for ${summary.support_payout_case_id}`);
  const entries = tables.case_financial_entries.filter((row) => row.support_payout_case_id === summary.support_payout_case_id);
  const stateFields = {
    requested: 'requested_minor',
    exposed: 'exposed_minor',
    approved: 'approved_minor',
    paid: 'paid_minor',
    estimated_loss: 'estimated_loss_minor',
    confirmed_loss: 'confirmed_loss_minor',
    recoverable: 'recoverable_minor',
    recovered: 'recovered_minor',
    prevented: 'prevented_minor',
    written_off: 'written_off_minor',
  };
  for (const [state, field] of Object.entries(stateFields)) {
    const entryTotal = entries.filter((row) => row.state === state).reduce((sum, row) => sum + row.amount_minor, 0);
    check(entryTotal === summary[field], `${state} entries do not reconcile to the same-scope summary for ${summary.support_payout_case_id}`);
  }
}
check(tables.case_financial_entries.every((row) => row.currency === 'GBP' && row.metadata.range && row.metadata.as_of), 'Financial entries need GBP and an explicit reporting scope');
check(Object.values(MARKETING_STORY.capture).every(Boolean), 'Stable capture keys are incomplete');

let local;
try {
  local = resolveLocalDatabase();
  const fixtureMerchantIds = fixture.tables.merchants.map((merchant) => quoteSql(merchant.id)).join(',');
  const rowCounts = Object.fromEntries(
    Object.entries(tables).map(([table, rows]) => {
      const count = runSql(local.container, table === 'identities'
        ? `select count(*) from public.identities where id in (${rows.map((row) => quoteSql(row.id)).join(',')})`
        : table === 'identity_members'
          ? `select count(*) from public.identity_members where identity_id in (${fixture.tables.identities.map((row) => quoteSql(row.id)).join(',')})`
          : `select count(*) from public.${table} where ${table === 'merchants' ? 'id' : 'merchant_id'} in (${fixtureMerchantIds})`);
      return [table, Number(count)];
    }),
  );
  for (const [table, rows] of Object.entries(tables)) {
    check(rowCounts[table] === rows.length, `${table} count differs: expected ${rows.length}, found ${rowCounts[table]}`);
  }
  for (const heroId of heroCaseIds) {
    check(runSql(local.container, `select count(*) from public.support_payout_cases where merchant_id=${quoteSql(MARKETING_STORY.merchant.id)} and id=${quoteSql(heroId)}`) === '1', `Database is missing hero case ${heroId}`);
  }
} catch (error) {
  failures.push(`Database validation could not run: ${error.message}`);
}

if (failures.length) {
  console.error(`FAIL marketing seed validation (${failures.length})`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(`PASS marketing seed validation · ${Object.values(tables).reduce((sum, rows) => sum + rows.length, 0)} records · asOf ${fixture.asOf}`);
console.log('Capture URLs:');
Object.entries(CAPTURE_URLS).forEach(([key, url]) => console.log(`- ${key}: ${url}`));
