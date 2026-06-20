/**
 * v2 demo seeder — makes the canonical demo merchant (Elara & Co Apparel) show the
 * current product working: a populated Payout Control queue, dashboard exposure
 * KPIs, customer history, and report case-mix.
 *
 * It writes ONLY to the v2 tables the app actually reads (support_payout_cases,
 * source_customers) and links cases to the merchant's EXISTING source_orders.
 * Amounts come from the real order totals — nothing is fabricated. It does NOT
 * create fake store/helpdesk connection rows: the demo is honest "sample data,
 * integrations disconnected" (Option A in the audit fix plan). It is idempotent:
 * every seeded row is tagged seed:demo-v2 and cleared on re-run.
 *
 * Usage:
 *   node scripts/seed-demo-v2.mjs            # seed Elara (the demo login)
 *   node scripts/seed-demo-v2.mjs --reset    # only clear previously-seeded rows
 *
 * Replaces the legacy scripts/seed-demo-merchant.mjs, which wrote to dropped v1
 * tables (audit_transactions / customer_profiles) and is no longer the seed path.
 */

import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

function loadEnvFile() {
  const envPath = path.join(repoRoot, '.env.local');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m || process.env[m[1]]) continue;
    process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}
loadEnvFile();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

const SEED_TAG = 'demo-v2';
const RESET_ONLY = process.argv.includes('--reset');

// ── Deterministic case plan. Statuses are restricted to values already present
// in the table (open/pending/escalated/resolved_*), guaranteeing no CHECK
// violation. The app maps: pending → "Needs evidence", escalated → "Manual
// review", resolved_* → "Closed". Amounts are taken from each real order total. ──
const CASE_PLAN = [
  { claim_type: 'item_not_received', status: 'open', reason: 'Tracking shows delivered but customer says the parcel never arrived.' },
  { claim_type: 'item_not_received', status: 'pending', reason: 'Customer reports non-delivery; awaiting carrier proof of delivery.' },
  { claim_type: 'damaged', status: 'open', reason: 'Item arrived damaged; customer requesting a refund.' },
  { claim_type: 'damaged', status: 'pending', reason: 'Damage reported; waiting on customer photo evidence.' },
  { claim_type: 'wrong_item', status: 'open', reason: 'Customer received the wrong size; requesting replacement.' },
  { claim_type: 'wrong_item', status: 'escalated', reason: 'Repeat wrong-item report; flagged for manual review.' },
  { claim_type: 'refund_request', status: 'open', reason: 'Customer requesting a goodwill refund outside policy window.' },
  { claim_type: 'refund_request', status: 'pending', reason: 'Refund requested; awaiting decision against merchant rules.' },
  { claim_type: 'return_abuse', status: 'escalated', reason: 'Pattern of returns with prior claim history; needs review.' },
  { claim_type: 'chargeback', status: 'escalated', reason: 'Chargeback opened by issuer; evidence pack required.' },
  { claim_type: 'item_not_received', status: 'open', reason: 'Concierge has no record of the parcel; tracking inconclusive.' },
  { claim_type: 'damaged', status: 'open', reason: 'Packaging crushed in transit per customer report.' },
  { claim_type: 'item_not_received', status: 'resolved_refunded', reason: 'Non-delivery confirmed; refund issued.' },
  { claim_type: 'refund_request', status: 'resolved_refunded', reason: 'Goodwill refund approved under low-value rule.' },
  { claim_type: 'return_abuse', status: 'resolved_denied', reason: 'Claim denied under policy after evidence review.' },
  { claim_type: 'wrong_item', status: 'resolved_refunded', reason: 'Wrong item confirmed; replacement shipped.' },
];

async function resolveElaraMerchantId() {
  const { data, error } = await supabase
    .from('merchants')
    .select('id,name,is_demo')
    .eq('name', 'Elara & Co Apparel')
    .limit(1);
  if (error) throw error;
  if (!data || data.length === 0) throw new Error('Elara & Co Apparel merchant not found');
  return data[0].id;
}

async function clearSeed(merchantId) {
  // Cases are tagged in detection_detail->>seed; customers in note.
  const { error: caseErr } = await supabase
    .from('support_payout_cases')
    .delete()
    .eq('merchant_id', merchantId)
    .eq('detection_detail->>seed', SEED_TAG);
  if (caseErr) throw caseErr;

  const { error: custErr } = await supabase
    .from('source_customers')
    .delete()
    .eq('merchant_id', merchantId)
    .eq('note', `[seed:${SEED_TAG}]`);
  if (custErr) throw custErr;
  console.log('Cleared previously-seeded demo-v2 rows.');
}

function daysAgoIso(days) {
  return new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();
}

async function seed(merchantId) {
  const { data: orders, error: ordErr } = await supabase
    .from('source_orders')
    .select('id,email,customer_email,customer_name,total_price,order_value,currency')
    .eq('merchant_id', merchantId)
    .limit(CASE_PLAN.length + 4);
  if (ordErr) throw ordErr;
  if (!orders || orders.length < CASE_PLAN.length) {
    throw new Error(`Need ${CASE_PLAN.length} source_orders for Elara, found ${orders?.length ?? 0}`);
  }

  // 1) Source customers (one per order email), tagged for idempotent cleanup.
  const customerRows = [];
  const customerIdByEmail = new Map();
  for (let i = 0; i < CASE_PLAN.length; i++) {
    const o = orders[i];
    const email = o.email ?? o.customer_email ?? `customer${i}.elara@examplemail.com`;
    if (customerIdByEmail.has(email)) continue;
    const id = randomUUID();
    customerIdByEmail.set(email, id);
    const name = (o.customer_name ?? email.split('@')[0]).split(' ');
    customerRows.push({
      id,
      merchant_id: merchantId,
      source: 'csv',
      external_id: `seed-${SEED_TAG}-${i}`,
      email,
      first_name: name[0] ?? null,
      last_name: name.slice(1).join(' ') || null,
      orders_count: 1 + (i % 4),
      total_spent: Number(o.total_price ?? o.order_value ?? 0),
      note: `[seed:${SEED_TAG}]`,
      created_at: daysAgoIso(120 - i),
      updated_at: daysAgoIso(2),
    });
  }
  if (customerRows.length) {
    const { error } = await supabase.from('source_customers').insert(customerRows);
    if (error) throw new Error(`source_customers insert failed: ${error.message}`);
    console.log(`Inserted ${customerRows.length} source_customers.`);
  }

  // 2) Support payout cases linked to real orders, spread across 8 weeks.
  const caseRows = CASE_PLAN.map((plan, i) => {
    const o = orders[i];
    const amount = Number(o.total_price ?? o.order_value ?? 50);
    const submitted = daysAgoIso(Math.floor((i / CASE_PLAN.length) * 54) + 1);
    const isResolved = plan.status.startsWith('resolved_');
    return {
      id: randomUUID(),
      merchant_id: merchantId,
      source_order_id: o.id,
      source_ticket_id: null,
      identity_id: null,
      claim_type: plan.claim_type,
      status: plan.status,
      detection_method: 'keyword',
      detection_detail: { seed: SEED_TAG },
      reason_raw: plan.reason,
      reason_normalized: plan.reason,
      amount_at_risk: Math.round(amount * 100) / 100,
      currency: o.currency ?? 'GBP',
      requires_review: plan.status === 'escalated',
      requested_action: 'unknown',
      payout_decision_state: isResolved ? 'decided' : 'undecided',
      recovery_state: 'no_recovery_needed',
      first_viewed_at: i % 3 === 0 ? null : daysAgoIso(1),
      submitted_at: submitted,
      created_at: submitted,
      updated_at: daysAgoIso(isResolved ? 1 : 0),
    };
  });

  // Insert one probe row first to surface any schema/enum issue clearly.
  const probe = await supabase.from('support_payout_cases').insert(caseRows[0]);
  if (probe.error) throw new Error(`support_payout_cases probe insert failed: ${probe.error.message}`);
  const { error: caseErr } = await supabase.from('support_payout_cases').insert(caseRows.slice(1));
  if (caseErr) throw new Error(`support_payout_cases insert failed: ${caseErr.message}`);
  console.log(`Inserted ${caseRows.length} support_payout_cases.`);
}

(async () => {
  try {
    const merchantId = await resolveElaraMerchantId();
    console.log(`Demo merchant: Elara & Co Apparel (${merchantId})`);
    await clearSeed(merchantId);
    if (RESET_ONLY) {
      console.log('Reset complete (no new rows inserted).');
      return;
    }
    await seed(merchantId);
    const { count: caseCount } = await supabase
      .from('support_payout_cases')
      .select('id', { count: 'exact', head: true })
      .eq('merchant_id', merchantId);
    console.log(`Done. Elara now has ${caseCount} support_payout_cases.`);
  } catch (err) {
    console.error('Seed failed:', err.message ?? err);
    process.exit(1);
  }
})();
