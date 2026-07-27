/**
 * Local-only marketing merchant seed.
 *
 * The fixed merchant id is the cleanup boundary. Every run replaces only that
 * merchant's graph in one transaction, so it is idempotent and cannot absorb
 * unrelated rows from a shared developer workspace.
 */
import { buildMarketingFixture } from './marketing-seed/fixture.mjs';
import { DEFAULT_AS_OF, MARKETING_STORY } from './marketing-seed/manifest.mjs';
import { insertSql, quoteSql, resolveLocalDatabase, runSql } from './marketing-seed/local-database.mjs';

const asOf = process.argv.find((arg) => arg.startsWith('--as-of='))?.slice('--as-of='.length) ?? DEFAULT_AS_OF;
const fixture = buildMarketingFixture(asOf);
let local;
try {
  local = resolveLocalDatabase();
} catch (error) {
  console.error(`FAIL marketing seed guard: ${error.message}`);
  process.exit(1);
}

async function ensureUsers() {
  const headers = {
    'Content-Type': 'application/json',
    apikey: local.serviceRoleKey,
    Authorization: `Bearer ${local.serviceRoleKey}`,
  };
  for (const member of MARKETING_STORY.team) {
    const existing = await fetch(`${local.apiUrl}/auth/v1/admin/users/${member.id}`, { headers });
    if (existing.ok) continue;
    const created = await fetch(`${local.apiUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        id: member.id,
        email: member.email,
        email_confirm: true,
        user_metadata: { full_name: member.name, role: member.role },
      }),
    });
    if (!created.ok) throw new Error(`Could not create fixture user ${member.name}: ${created.status}`);
  }
}

const TABLE_ORDER = [
  'merchants',
  'identities',
  'identity_members',
  'merchant_users',
  'store_connections',
  'helpdesk_connections',
  'merchant_integrations',
  'partners',
  'merchant_customers',
  'merchant_identity_state',
  'source_customers',
  'identity_signals',
  'identity_notes',
  'source_orders',
  'source_order_lines',
  'merchant_rules',
  'merchant_rule_versions',
  'workflow_definitions',
  'domain_events',
  'workflow_runs',
  'source_tickets',
  'support_payout_cases',
  'case_clarification_requests',
  'case_claimed_items',
  'evidence_items',
  'evidence_packages',
  'claim_events',
  'case_comments',
  'case_recommendation_snapshots',
  'source_shipments',
  'source_shipment_lines',
  'loss_cases',
  'recovery_cases',
  'work_tasks',
  'work_saved_views',
  'case_decisions',
  'case_outcomes',
  'case_financial_entries',
  'case_financial_summaries',
  'notifications',
];

try {
  await ensureUsers();
  const migrationReady = runSql(
    local.container,
    "select count(*) from information_schema.columns where table_schema='public' and table_name='recovery_cases' and column_name='last_source_event_at'",
  );
  if (migrationReady !== '1') {
    throw new Error('Required migration 20260727130000_recovery_source_freshness.sql has not been applied.');
  }
  const cleanupSql = [...TABLE_ORDER].reverse()
    .filter((table) => table !== 'merchants')
    .map((table) => table === 'identities'
      ? `delete from public.identities where id in (${fixture.tables.identities.map((row) => quoteSql(row.id)).join(',')});`
      : table === 'identity_members'
        ? `delete from public.identity_members where identity_id in (${fixture.tables.identities.map((row) => quoteSql(row.id)).join(',')});`
      : `delete from public.${table} where merchant_id = ${quoteSql(MARKETING_STORY.merchant.id)};`)
    .join('\n');
  const tableSql = TABLE_ORDER.map((table) => insertSql(table, fixture.tables[table])).join('\n');
  runSql(local.container, `
    begin;
    set local session_replication_role = replica;
    ${cleanupSql}
    delete from public.merchants where id = ${quoteSql(MARKETING_STORY.merchant.id)};
    ${tableSql}
    set local session_replication_role = origin;
    commit;
  `);
  const counts = Object.fromEntries(TABLE_ORDER.map((table) => [table, fixture.tables[table].length]));
  console.log(`PASS marketing seed · ${MARKETING_STORY.merchant.name} · asOf ${fixture.asOf}`);
  console.log(Object.entries(counts).map(([table, count]) => `${table}=${count}`).join(' · '));
} catch (error) {
  console.error(`FAIL marketing seed: ${error.message}`);
  process.exit(1);
}
