/**
 * Big-merchant sample seeder for Simeon Murray Store (simeonmurray123@gmail.com).
 *
 * Seeds a large, realistic post-purchase payout-control dataset into the v2
 * read-model tables the product actually uses, at a scale consistent with the
 * merchant's own onboarding answers (monthly_order_volume: over_250k). Follows
 * the same conventions as scripts/seed-demo-v2.mjs: deterministic ids (safe to
 * re-run/upsert), sample_data tagging, GBP amounts, and case_financial_summaries
 * / case_financial_entries / notifications / source_shipments so no authenticated
 * page renders empty. Financial summaries mirror those canonical ledger rows;
 * the reporting layer derives known states from the ledger for the current
 * production baseline, which predates the newer summary projection columns.
 *
 * Usage:
 *   node scripts/seed-simeon-big-merchant.mjs
 *   node scripts/seed-simeon-big-merchant.mjs --verify-only
 */

import { createHash } from 'node:crypto';
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

const MERCHANT_ID = process.env.SEED_MERCHANT_ID ?? 'af070af9-df1a-46ba-89f8-29409926ef61'; // Simeon Murray Store
const SEED_TAG = process.env.SEED_TAG ?? 'simeon-big-merchant';
const SEED_NOTE = `[seed:${SEED_TAG}]`;
const SEED_PREFIX = process.env.SEED_PREFIX ?? 'seed-simeon-big';
const RESET_ONLY = process.argv.includes('--reset');
const VERIFY_ONLY = process.argv.includes('--verify-only');
const CUSTOMER_EMAIL_DOMAIN = process.env.SEED_CUSTOMER_EMAIL_DOMAIN ?? 'simeon-demo.test';
const ORDER_NUMBER_PREFIX = process.env.SEED_ORDER_NUMBER_PREFIX ?? 'SMS';
const SOURCE_SYSTEM = process.env.SEED_SOURCE_SYSTEM ?? 'manual';
const SOURCE_NAME = process.env.SEED_SOURCE_NAME ?? 'sample_demo';
const SOURCE_LABEL = process.env.SEED_SOURCE_LABEL ?? 'seed-simeon-big-merchant';
const RECIPIENT_USER_ID = process.env.SEED_RECIPIENT_USER_ID ?? '31635553-bf6f-410d-8202-4bfd5019caeb';
const configuredBackgroundOrderCount = Number(process.env.SEED_BACKGROUND_ORDER_COUNT ?? '0');
if (!Number.isInteger(configuredBackgroundOrderCount) || configuredBackgroundOrderCount < 0 || configuredBackgroundOrderCount > 100_000) {
  throw new Error('SEED_BACKGROUND_ORDER_COUNT must be an integer between 0 and 100000.');
}
const BACKGROUND_ORDER_COUNT = configuredBackgroundOrderCount;
const configuredCaseAmountScale = Number(process.env.SEED_CASE_AMOUNT_SCALE ?? '1');
if (!Number.isInteger(configuredCaseAmountScale) || configuredCaseAmountScale < 1 || configuredCaseAmountScale > 10_000) {
  throw new Error('SEED_CASE_AMOUNT_SCALE must be an integer between 1 and 10000.');
}
const CASE_AMOUNT_SCALE = configuredCaseAmountScale;
const FEATURED_CASE_KEY = 'landing-hero-evidence-hold-0';
const FEATURED_CASE_TAG = 'landing-hero-evidence-hold';

const ANCHOR = new Date();
ANCHOR.setUTCMinutes(0, 0, 0);
const TICKET_ID_BASE = 512000;

function mulberry32(seed) {
  return function next() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(90210);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

function sha(value) {
  return createHash('sha256').update(value).digest('hex');
}
function uuid(label) {
  const hex = sha(`${SEED_TAG}:${label}`).slice(0, 32).split('');
  hex[12] = '4';
  hex[16] = (8 + (parseInt(hex[16], 16) % 4)).toString(16);
  const s = hex.join('');
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}
function daysAgoIso(days, hour = 10) {
  const d = new Date(ANCHOR);
  d.setUTCDate(d.getUTCDate() - Math.floor(days));
  d.setUTCHours(hour, 0, 0, 0);
  return d.toISOString();
}
function daysFromAnchorIso(days, hour = 10) {
  const d = new Date(ANCHOR);
  d.setUTCDate(d.getUTCDate() + Math.floor(days));
  d.setUTCHours(hour, 0, 0, 0);
  return d.toISOString();
}
function money(value) {
  return Number(value.toFixed(2));
}
async function checked(table, operation, query) {
  const { error, data } = await query;
  if (error) throw new Error(`${table} ${operation} failed: ${error.message}`);
  return data;
}
const CONFLICT_KEYS = {
  case_financial_summaries: 'merchant_id,support_payout_case_id,currency',
};

async function upsertRows(table, rows) {
  if (rows.length === 0) return;
  const onConflict = CONFLICT_KEYS[table] ?? 'id';
  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500);
    let lastError;
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      try {
        await checked(table, 'upsert', supabase.from(table).upsert(batch, { onConflict }));
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
        const message = String(error?.message ?? error);
        const transient = /fetch failed|network|timeout|econnreset|enotfound/i.test(message);
        if (!transient || attempt === 4) throw error;
        const delayMs = attempt * 750;
        console.warn(`${table} batch ${i + 1}-${i + batch.length} transient failure; retrying in ${delayMs}ms.`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
    if (lastError) throw lastError;
  }
  console.log(`Upserted ${rows.length} ${table} rows.`);
}
async function insertImmutableRows(table, rows) {
  if (rows.length === 0) return;
  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500);
    let lastError;
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      try {
        await checked(table, 'insert immutable', supabase.from(table).upsert(batch, { onConflict: 'id', ignoreDuplicates: true }));
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
        const transient = /fetch failed|network|timeout|econnreset|enotfound/i.test(String(error?.message ?? error));
        if (!transient || attempt === 4) throw error;
        await new Promise((resolve) => setTimeout(resolve, attempt * 750));
      }
    }
    if (lastError) throw lastError;
  }
  console.log(`Ensured ${rows.length} immutable ${table} rows.`);
}

// ---------------------------------------------------------------------------
// Fixture data
// ---------------------------------------------------------------------------

const FIRST_NAMES = [
  'Maya', 'Jonas', 'Leah', 'Omar', 'Zara', 'Nina', 'Felix', 'Imani', 'Callum', 'Priya',
  'Ewan', 'Sofia', 'Marcus', 'Grace', 'Kian', 'Amelia', 'Reuben', 'Freya', 'Tariq', 'Isla',
  'Declan', 'Aisha', 'Louis', 'Elsie', 'Noah', 'Ruby', 'Harvey', 'Willow', 'Idris', 'Nadia',
  'Archie', 'Poppy', 'Femi', 'Chloe', 'Aaron', 'Layla', 'Toby', 'Maryam', 'Rhys', 'Esme',
  'Malik', 'Daisy', 'Yusuf', 'Ivy', 'Connor', 'Anya', 'Dexter', 'Fatima', 'Miles', 'Rosa',
  'Casper', 'Tilly', 'Bilal', 'Nell', 'Otis', 'Sana',
];
const LAST_NAMES = [
  'Chen', 'Reed', 'Patel', 'Hughes', 'Morgan', 'Wallace', 'Stone', 'Cole', 'Bennett', 'Osei',
  'Fraser', 'Novak', 'Whitfield', 'Doyle', 'Marsh', 'Okafor', 'Lindqvist', 'Sharma', 'Kaur', 'Byrne',
  'Fenwick', 'Adeyemi', 'Carrick', 'Nakamura', 'Blake', 'Sutherland', 'Ibrahim', 'Vance', 'Delacroix', 'Mensah',
];

const configuredCustomerCount = Number(process.env.SEED_CUSTOMER_COUNT ?? '56');
if (!Number.isInteger(configuredCustomerCount) || configuredCustomerCount < 1 || configuredCustomerCount > 10_000) {
  throw new Error('SEED_CUSTOMER_COUNT must be an integer between 1 and 10000.');
}
const CUSTOMER_COUNT = configuredCustomerCount;
const CUSTOMERS = Array.from({ length: CUSTOMER_COUNT }, (_, i) => {
  const first = FIRST_NAMES[i % FIRST_NAMES.length];
  // Offset by a coprime-ish stride so last names don't cycle in lockstep with first names.
  const last = LAST_NAMES[(i + Math.floor(i / LAST_NAMES.length) * 7) % LAST_NAMES.length];
  const key = `cust-${i}`;
  return {
    key,
    first,
    last,
    email: `${first.toLowerCase()}.${last.toLowerCase()}${i}@${CUSTOMER_EMAIL_DOMAIN}`,
    phone: `+4477${String(10000000 + Math.floor(rand() * 89999999)).slice(0, 8)}`,
    accountAgeDays: 30 + Math.floor(rand() * 700),
  };
});

const PARTNERS = [
  { key: 'royal-mail', name: 'Royal Mail', type: 'carrier', contactUrl: 'https://www.royalmail.com/claims', contactEmail: null, notes: 'Primary domestic carrier. Claims via business portal.' },
  { key: 'evri', name: 'Evri', type: 'carrier', contactUrl: 'https://www.evri.com/contact-us', contactEmail: null, notes: 'Secondary carrier for standard parcels.' },
  { key: 'dpd-uk', name: 'DPD UK', type: 'carrier', contactUrl: 'https://www.dpd.co.uk/claims', contactEmail: null, notes: 'Premium/next-day carrier for high-value parcels.' },
  { key: 'orbit-fulfilment', name: 'Orbit Fulfilment', type: 'three_pl', contactUrl: null, contactEmail: 'claims@orbitfulfilment.test', notes: 'Primary 3PL warehouse. Pick/pack errors and dispatch SLA credits.' },
  { key: 'northgate-logistics', name: 'Northgate Logistics', type: 'three_pl', contactUrl: null, contactEmail: 'ops@northgatelogistics.test', notes: 'Secondary regional fulfilment partner.' },
  { key: 'novia-textiles', name: 'Novia Textiles', type: 'supplier', contactUrl: null, contactEmail: 'accounts@noviatextiles.test', notes: 'Apparel supplier. Defect credits against batch codes.' },
  { key: 'harborline-goods', name: 'Harborline Goods Co.', type: 'supplier', contactUrl: null, contactEmail: 'claims@harborlinegoods.test', notes: 'Homeware and accessories supplier.' },
  { key: 'crestpay-disputes', name: 'CrestPay Dispute Resolution', type: 'payment_dispute_provider', contactUrl: 'https://crestpay.test/merchant-disputes', contactEmail: null, notes: 'Payment processor chargeback/dispute desk.' },
  { key: 'northline-parcel', name: 'Northline Parcel', type: 'carrier', contactUrl: 'https://northline-parcel.test/claims', contactEmail: 'claims@northline-parcel.test', notes: 'Fictional carrier used by the landing hero evidence-hold fixture.' },
];

const PARTNER_RULES = [
  { key: 'royal-mail-lost-parcel', partner: 'royal-mail', ruleName: 'Royal Mail lost parcel claim', recoveryType: 'carrier_claim', claimType: 'item_not_received', requiredEvidence: ['tracking_status', 'proof_of_dispatch', 'proof_of_value'], deadlineDays: 14, confidence: 'high', submissionMethod: 'portal', submissionUrl: 'https://www.royalmail.com/claims', claimableCosts: ['item_cost', 'outbound_postage'], excludedCosts: ['support_time'] },
  { key: 'royal-mail-damage', partner: 'royal-mail', ruleName: 'Royal Mail damage in transit', recoveryType: 'carrier_claim', claimType: 'damaged_item', requiredEvidence: ['customer_photo', 'packaging_photo', 'proof_of_value'], deadlineDays: 14, confidence: 'medium', submissionMethod: 'portal', submissionUrl: 'https://www.royalmail.com/claims', claimableCosts: ['item_cost'], excludedCosts: ['support_time'] },
  { key: 'evri-lost-parcel', partner: 'evri', ruleName: 'Evri lost parcel claim', recoveryType: 'carrier_claim', claimType: 'item_not_received', requiredEvidence: ['tracking_status', 'proof_of_dispatch', 'proof_of_value'], deadlineDays: 28, confidence: 'medium', submissionMethod: 'portal', submissionUrl: 'https://www.evri.com/contact-us', claimableCosts: ['item_cost', 'outbound_postage'], excludedCosts: ['support_time'] },
  { key: 'dpd-damage', partner: 'dpd-uk', ruleName: 'DPD high-value damage claim', recoveryType: 'carrier_claim', claimType: 'damaged_item', requiredEvidence: ['customer_photo', 'proof_of_value', 'carrier_scan_history'], deadlineDays: 21, confidence: 'high', submissionMethod: 'portal', submissionUrl: 'https://www.dpd.co.uk/claims', claimableCosts: ['item_cost', 'outbound_postage'], excludedCosts: ['support_time'] },
  { key: 'orbit-wrong-item', partner: 'orbit-fulfilment', ruleName: 'Orbit Fulfilment wrong-item pick error', recoveryType: 'three_pl_claim', claimType: 'wrong_item', requiredEvidence: ['customer_photo', 'pick_pack_record'], deadlineDays: 30, confidence: 'high', submissionMethod: 'email', submissionEmail: 'claims@orbitfulfilment.test', claimableCosts: ['item_cost', 'reship_postage'], excludedCosts: ['support_time'] },
  { key: 'orbit-late-dispatch', partner: 'orbit-fulfilment', ruleName: 'Orbit Fulfilment late dispatch SLA credit', recoveryType: 'three_pl_claim', claimType: 'late_delivery', requiredEvidence: ['dispatch_sla', 'carrier_scan_history'], deadlineDays: 30, confidence: 'medium', submissionMethod: 'email', submissionEmail: 'claims@orbitfulfilment.test', claimableCosts: ['shipping_cost', 'goodwill_credit'], excludedCosts: ['item_cost'] },
  { key: 'northgate-missing-item', partner: 'northgate-logistics', ruleName: 'Northgate missing-item warehouse claim', recoveryType: 'three_pl_claim', claimType: 'wrong_item', requiredEvidence: ['packing_slip', 'customer_photo'], deadlineDays: 21, confidence: 'medium', submissionMethod: 'email', submissionEmail: 'ops@northgatelogistics.test', claimableCosts: ['item_cost'], excludedCosts: ['support_time'] },
  { key: 'novia-defect-credit', partner: 'novia-textiles', ruleName: 'Novia Textiles defect credit', recoveryType: 'supplier_defect', claimType: 'damaged_item', requiredEvidence: ['customer_photo', 'supplier_batch_code'], deadlineDays: 60, confidence: 'medium', submissionMethod: 'email', submissionEmail: 'accounts@noviatextiles.test', claimableCosts: ['item_cost'], excludedCosts: ['support_time', 'outbound_postage'] },
  { key: 'harborline-listing-mismatch', partner: 'harborline-goods', ruleName: 'Harborline listing mismatch credit', recoveryType: 'supplier_defect', claimType: 'other', requiredEvidence: ['customer_photo', 'supplier_listing_snapshot'], deadlineDays: 45, confidence: 'medium', submissionMethod: 'email', submissionEmail: 'claims@harborlinegoods.test', claimableCosts: ['item_cost'], excludedCosts: ['support_time'] },
  { key: 'crestpay-chargeback-pack', partner: 'crestpay-disputes', ruleName: 'CrestPay chargeback evidence pack', recoveryType: 'chargeback_evidence', claimType: 'chargeback_related', requiredEvidence: ['order_confirmation', 'delivery_scan', 'support_thread'], deadlineDays: 10, confidence: 'low', submissionMethod: 'portal', submissionUrl: 'https://crestpay.test/merchant-disputes', claimableCosts: ['item_cost'], excludedCosts: ['support_time'] },
  { key: 'northline-delivery-clarification', partner: 'northline-parcel', ruleName: 'Northline Parcel delivery clarification', recoveryType: 'carrier_claim', claimType: 'item_not_received', requiredEvidence: ['tracking_status', 'proof_of_delivery', 'customer_statement'], deadlineDays: 14, confidence: 'medium', submissionMethod: 'email', submissionEmail: 'claims@northline-parcel.test', claimableCosts: ['item_cost', 'outbound_postage'], excludedCosts: ['support_time'] },
];

// Existing (kept, non-seeded) merchant_rules for this merchant — used to tie
// recommended_rule_id/name to a real rule where the archetype clearly matches.
const USE_GENERATED_RULE_IDS = process.env.SEED_USE_GENERATED_RULE_IDS === '1';
const EXISTING_RULES = {
  chargeback: { id: USE_GENERATED_RULE_IDS ? uuid('rule:chargeback') : 'bdc46bf3-7af5-42d7-9e02-df756fd533e9', name: 'Chargeback-related case' },
  recoverablePartnerLoss: { id: USE_GENERATED_RULE_IDS ? uuid('rule:recoverablePartnerLoss') : '94080c1a-e7d0-4ed2-84ad-b5dcd34e3d39', name: 'Recoverable partner loss' },
  lowValue: { id: USE_GENERATED_RULE_IDS ? uuid('rule:lowValue') : 'c5404060-942f-4567-b435-5c3afd09dfbe', name: 'Low-value request' },
  deliveredProof: { id: USE_GENERATED_RULE_IDS ? uuid('rule:deliveredProof') : '70961609-6945-46bb-a39b-a8cb4b37eb31', name: 'Delivered with proof of delivery' },
  missingDeliveryEvidence: { id: USE_GENERATED_RULE_IDS ? uuid('rule:missingDeliveryEvidence') : 'a0d8dbd7-fa08-4a22-b07e-0f63a1f04ab6', name: 'Missing delivery evidence' },
  damagedNoEvidence: { id: USE_GENERATED_RULE_IDS ? uuid('rule:damagedNoEvidence') : '7f256822-5a52-4e30-a572-1a3cc4d9c567', name: 'Damaged item missing customer evidence' },
  highValue: { id: USE_GENERATED_RULE_IDS ? uuid('rule:highValue') : 'e75e5fc5-d371-4312-83fa-dfc2eb98a2b0', name: 'High-value payout requires manual review' },
};

// Archetypes: each generates `repeat` case instances, cycling through the
// customer pool and perturbing amount/dates deterministically per instance.
const ARCHETYPES = [
  { key: 'inr-carrier-proof', claimType: 'item_not_received', status: 'awaiting_carrier_response', requestedAction: 'refund', baseAmount: 95, subject: 'Delivered order not received', reason: 'Tracking shows delivered but customer says the parcel never arrived.', lossAttribution: 'delivery_confirmed_evidence', confidence: 'needs_more_evidence', recoverability: 'needs_more_evidence', recoveryOwner: 'carrier', requiredEvidence: ['proof_of_delivery', 'carrier_scan_history'], recoveryNextAction: 'Request proof of delivery and delivery GPS from carrier.', nextAction: 'Ask carrier for proof before approving refund.', nextActionReason: 'The order is marked delivered but carrier evidence is incomplete.', recommendedAction: 'ask_for_evidence', rule: 'missingDeliveryEvidence', partnerRotation: ['royal-mail', 'evri'], recovery: { type: 'carrier_claim', owner: 'carrier', status: 'evidence_needed' }, repeat: 9 },
  { key: 'inr-evidence-needed', claimType: 'item_not_received', status: 'evidence_needed', requestedAction: 'refund', baseAmount: 68, subject: 'Customer says parcel never arrived', reason: 'No proof-of-delivery scan on file yet for this order.', lossAttribution: 'delivery_confirmed_evidence', confidence: 'needs_more_evidence', recoverability: 'needs_more_evidence', recoveryOwner: 'carrier', requiredEvidence: ['proof_of_delivery', 'carrier_scan_history'], recoveryNextAction: 'Chase carrier for delivery scan before deciding.', nextAction: 'Wait for carrier scan history before refunding.', nextActionReason: 'No delivery evidence is on file for this claim yet.', recommendedAction: 'ask_for_evidence', rule: 'missingDeliveryEvidence', partnerRotation: ['royal-mail', 'evri', 'dpd-uk'], recovery: { type: 'carrier_claim', owner: 'carrier', status: 'evidence_needed' }, repeat: 8 },
  { key: 'inr-denied-delivered', claimType: 'item_not_received', status: 'resolved_denied', requestedAction: 'refund', baseAmount: 54, subject: 'Refund request denied — proof of delivery on file', reason: 'Carrier confirms signed-for delivery at the shipping address.', lossAttribution: 'merchant_policy', confidence: 'high', recoverability: 'not_recoverable', recoveryOwner: 'merchant', requiredEvidence: ['proof_of_delivery'], recoveryNextAction: 'No recovery case required.', nextAction: 'Closed after denial.', nextActionReason: 'Signed proof of delivery supported denying the refund.', recommendedAction: 'deny_under_policy', rule: 'deliveredProof', outcome: { decision: 'denied', outcome: 'legitimate', amountRefunded: 0, followed: true }, repeat: 7 },
  { key: 'inr-late-dispatch', claimType: 'item_not_received', status: 'awaiting_3pl_response', requestedAction: 'refund', baseAmount: 74, subject: 'Order has not arrived — late dispatch', reason: 'Order dispatched late by the fulfilment partner and customer is asking for a refund.', lossAttribution: 'three_pl_late_dispatch', confidence: 'medium', recoverability: 'recoverable', recoveryOwner: 'three_pl', requiredEvidence: ['dispatch_sla', 'carrier_scan_history'], recoveryNextAction: 'Open 3PL SLA recovery case.', nextAction: 'Offer replacement or wait for delivery based on SLA.', nextActionReason: 'The delay is likely fulfilment-owned and recoverable.', recommendedAction: 'offer_replacement', rule: null, ruleName: '3PL late dispatch recovery', partnerRotation: ['orbit-fulfilment', 'northgate-logistics'], recovery: { type: 'three_pl_claim', owner: 'three_pl', status: 'ready_to_submit' }, repeat: 6 },
  { key: 'inr-carrier-loss-refunded', claimType: 'item_not_received', status: 'resolved_refunded', requestedAction: 'refund', baseAmount: 61, subject: 'Lost parcel refund', reason: 'Carrier confirmed loss after depot scan; refund issued.', lossAttribution: 'carrier_loss', confidence: 'high', recoverability: 'recoverable', recoveryOwner: 'carrier', requiredEvidence: ['carrier_loss_confirmation'], recoveryNextAction: 'Carrier claim paid.', nextAction: 'Closed after refund.', nextActionReason: 'Carrier loss was confirmed and refunded.', recommendedAction: 'approve_refund', rule: null, ruleName: 'Confirmed carrier loss', partnerRotation: ['royal-mail', 'evri'], outcome: { decision: 'approved', outcome: 'loss', amountRefundedRatio: 1, followed: true }, recovery: { type: 'carrier_claim', owner: 'carrier', status: 'paid', recoveredRatio: 1 }, repeat: 6 },

  { key: 'damaged-photos-needed', claimType: 'damaged', status: 'evidence_needed', requestedAction: 'replacement', baseAmount: 88, subject: 'Damaged item arrived', reason: 'Customer reports cracked packaging on arrival and requested a replacement.', lossAttribution: 'carrier_damage', confidence: 'medium', recoverability: 'possibly_recoverable', recoveryOwner: 'carrier', requiredEvidence: ['customer_photo', 'packaging_photo'], recoveryNextAction: 'Collect customer photos and submit carrier damage claim.', nextAction: 'Collect photos before shipping replacement.', nextActionReason: 'Damage is plausible but the evidence pack is not complete.', recommendedAction: 'ask_for_evidence', rule: 'damagedNoEvidence', partnerRotation: ['royal-mail', 'dpd-uk'], recovery: { type: 'carrier_claim', owner: 'carrier', status: 'ready_to_submit' }, repeat: 9 },
  { key: 'damaged-supplier-defect', claimType: 'damaged', status: 'recovery_opened', requestedAction: 'refund', baseAmount: 71, subject: 'Product defect after first wear', reason: 'Customer reports stitching failed after first wear.', lossAttribution: 'supplier_defect', confidence: 'medium', recoverability: 'recoverable', recoveryOwner: 'supplier', requiredEvidence: ['customer_photo', 'supplier_batch_code'], recoveryNextAction: 'Submit supplier defect claim with batch code.', nextAction: 'Refund customer and pursue supplier credit.', nextActionReason: 'The defect appears supplier-owned and recoverable.', recommendedAction: 'approve_refund_recover_supplier', rule: 'recoverablePartnerLoss', partnerRotation: ['novia-textiles', 'harborline-goods'], recovery: { type: 'supplier_defect', owner: 'supplier', status: 'waiting_response' }, repeat: 7 },
  { key: 'damaged-ready-decision', claimType: 'damaged', status: 'ready_for_decision', requestedAction: 'replacement', baseAmount: 112, subject: 'Transit damage photo supplied', reason: 'Customer provided photo evidence of transit damage.', lossAttribution: 'carrier_damage', confidence: 'high', recoverability: 'recoverable', recoveryOwner: 'carrier', requiredEvidence: ['customer_photo', 'carrier_scan_history'], recoveryNextAction: 'Approve replacement and submit carrier claim.', nextAction: 'Approve replacement.', nextActionReason: 'Evidence is complete and carrier recovery is available.', recommendedAction: 'approve_replacement', rule: null, ruleName: 'Carrier damage with complete evidence', partnerRotation: ['dpd-uk', 'royal-mail'], recovery: { type: 'carrier_claim', owner: 'carrier', status: 'submitted' }, repeat: 6 },
  { key: 'damaged-exchanged-resolved', claimType: 'damaged', status: 'resolved_exchanged', requestedAction: 'replacement', baseAmount: 79, subject: 'Replacement shipped', reason: 'Wrong item confirmed and replacement shipped.', lossAttribution: 'warehouse_mispick', confidence: 'high', recoverability: 'recoverable', recoveryOwner: 'warehouse', requiredEvidence: ['pick_pack_record'], recoveryNextAction: 'Warehouse QA case closed.', nextAction: 'Closed after exchange.', nextActionReason: 'Replacement resolved the payout case.', recommendedAction: 'approve_replacement', rule: null, ruleName: 'Warehouse mispick replacement', outcome: { decision: 'approved', outcome: 'recovered', amountRefundedRatio: 0, followed: true }, repeat: 5 },
  { key: 'damaged-packaging-discount', claimType: 'damaged', status: 'ready_for_decision', requestedAction: 'discount', baseAmount: 33, subject: 'Accessory arrived scuffed', reason: 'Low-value accessory arrived scuffed after poor packaging.', lossAttribution: 'packaging_failure', confidence: 'medium', recoverability: 'possibly_recoverable', recoveryOwner: 'warehouse', requiredEvidence: ['customer_photo', 'packaging_photo'], recoveryNextAction: 'Track packaging failure for warehouse QA.', nextAction: 'Offer partial discount and log packaging issue.', nextActionReason: 'A discount limits payout exposure while preserving the recovery signal.', recommendedAction: 'offer_discount', rule: 'lowValue', repeat: 6 },
  { key: 'damaged-high-value-manual', claimType: 'damaged', status: 'manual_review', requestedAction: 'replacement', baseAmount: 165, subject: 'High-value item damaged in transit', reason: 'Higher-value order arrived with visible transit damage.', lossAttribution: 'carrier_damage', confidence: 'medium', recoverability: 'possibly_recoverable', recoveryOwner: 'carrier', requiredEvidence: ['customer_photo', 'proof_of_value', 'carrier_scan_history'], recoveryNextAction: 'Submit high-value carrier damage claim once approved.', nextAction: 'Manual review before replacement is approved.', nextActionReason: 'Payout exposure is above the high-value review threshold.', recommendedAction: 'manual_review', rule: 'highValue', partnerRotation: ['dpd-uk'], recovery: { type: 'carrier_claim', owner: 'carrier', status: 'evidence_needed' }, repeat: 5 },

  { key: 'wrong-item-ready', claimType: 'wrong_item', status: 'ready_for_decision', requestedAction: 'replacement', baseAmount: 58, subject: 'Wrong size in parcel', reason: 'Customer ordered a medium but received a small.', lossAttribution: 'warehouse_mispick', confidence: 'high', recoverability: 'recoverable', recoveryOwner: 'warehouse', requiredEvidence: ['pick_pack_record', 'customer_photo'], recoveryNextAction: 'Open warehouse error case with pick-pack record.', nextAction: 'Approve replacement and recover internally from fulfilment error.', nextActionReason: 'Order and support evidence agree on a warehouse mispick.', recommendedAction: 'approve_replacement', rule: null, ruleName: 'Warehouse mispick replacement', partnerRotation: ['orbit-fulfilment', 'northgate-logistics'], recovery: { type: 'three_pl_claim', owner: 'three_pl', status: 'submitted' }, repeat: 8 },
  { key: 'wrong-item-missing', claimType: 'wrong_item', status: 'awaiting_customer_evidence', requestedAction: 'refund', baseAmount: 47, subject: 'One item missing from parcel', reason: 'Customer says one item was missing from a multi-item order.', lossAttribution: 'warehouse_missing_item', confidence: 'needs_more_evidence', recoverability: 'possibly_recoverable', recoveryOwner: 'warehouse', requiredEvidence: ['packing_slip', 'customer_photo'], recoveryNextAction: 'Check packing slip and warehouse weight record.', nextAction: 'Request photo of received items and packing slip.', nextActionReason: 'The claim can be recovered internally if packing evidence confirms it.', recommendedAction: 'ask_for_evidence', rule: null, ruleName: 'Missing item requires packing evidence', partnerRotation: ['orbit-fulfilment', 'northgate-logistics'], recovery: { type: 'three_pl_claim', owner: 'three_pl', status: 'evidence_needed' }, repeat: 8 },
  { key: 'wrong-item-resolved-refund', claimType: 'wrong_item', status: 'resolved_refunded', requestedAction: 'refund', baseAmount: 62, subject: 'Wrong item refunded', reason: 'Wrong item confirmed; refund issued rather than reshipping.', lossAttribution: 'warehouse_mispick', confidence: 'high', recoverability: 'recoverable', recoveryOwner: 'warehouse', requiredEvidence: ['pick_pack_record'], recoveryNextAction: 'Warehouse QA case closed.', nextAction: 'Closed after refund.', nextActionReason: 'Pick-pack record confirmed the mispick.', recommendedAction: 'approve_refund', rule: null, ruleName: 'Warehouse mispick replacement', outcome: { decision: 'approved', outcome: 'recovered', amountRefundedRatio: 1, followed: true }, repeat: 5 },

  { key: 'refund-request-policy', claimType: 'refund_request', status: 'manual_review', requestedAction: 'refund', baseAmount: 118, subject: 'Refund outside return window', reason: 'Goodwill refund requested outside the published return window.', lossAttribution: 'merchant_policy', confidence: 'medium', recoverability: 'not_recoverable', recoveryOwner: 'merchant', requiredEvidence: ['return_policy_snapshot'], recoveryNextAction: 'No partner recovery path; tighten return-window handling.', nextAction: 'Review policy exception before refunding.', nextActionReason: 'The case is a policy decision, not a recoverable partner loss.', recommendedAction: 'deny_under_policy', rule: null, ruleName: 'Return window expired', repeat: 7 },
  { key: 'refund-request-store-credit', claimType: 'refund_request', status: 'pending', requestedAction: 'store_credit', baseAmount: 42, subject: 'Store credit request', reason: 'Customer requested store credit after a sizing concern.', lossAttribution: 'customer_claim', confidence: 'low', recoverability: 'unknown', recoveryOwner: 'unknown', requiredEvidence: ['customer_reason'], recoveryNextAction: 'Confirm customer preference before decision.', nextAction: 'Clarify whether store credit is acceptable.', nextActionReason: 'A lower-cost resolution may prevent unnecessary refund leakage.', recommendedAction: 'offer_store_credit', rule: 'lowValue', repeat: 6 },
  { key: 'refund-request-approved-low', claimType: 'refund_request', status: 'resolved_refunded', requestedAction: 'refund', baseAmount: 21, subject: 'Low-value refund approved', reason: 'Low payout exposure refund approved to keep support fast.', lossAttribution: 'customer_claim', confidence: 'high', recoverability: 'not_recoverable', recoveryOwner: 'merchant', requiredEvidence: ['customer_reason'], recoveryNextAction: 'No recovery required — below policy threshold.', nextAction: 'Closed after refund.', nextActionReason: 'Amount was within the low-value auto-approve threshold.', recommendedAction: 'approve_refund', rule: 'lowValue', outcome: { decision: 'approved', outcome: 'legitimate', amountRefundedRatio: 1, followed: true }, repeat: 6 },

  { key: 'return-abuse-escalated', claimType: 'return_abuse', status: 'escalated', requestedAction: 'refund', baseAmount: 93, subject: 'Returnless refund request', reason: 'Repeated returnless refund requests across recent orders.', lossAttribution: 'merchant_policy', confidence: 'medium', recoverability: 'not_recoverable', recoveryOwner: 'merchant', requiredEvidence: ['claim_history', 'return_policy_snapshot'], recoveryNextAction: 'No partner recovery path; review rule for repeat returnless refunds.', nextAction: 'Escalate for policy decision.', nextActionReason: 'The pattern is policy leakage rather than carrier or warehouse liability.', recommendedAction: 'manual_review', rule: null, ruleName: 'Repeat returnless refund pattern', repeat: 5 },
  { key: 'return-abuse-denied', claimType: 'return_abuse', status: 'resolved_denied', requestedAction: 'refund', baseAmount: 126, subject: 'Refund request denied — repeat pattern', reason: 'Claim denied after return policy review and repeated refund pattern.', lossAttribution: 'merchant_policy', confidence: 'high', recoverability: 'not_recoverable', recoveryOwner: 'merchant', requiredEvidence: ['claim_history', 'policy_snapshot'], recoveryNextAction: 'No recovery case required.', nextAction: 'Closed after denial.', nextActionReason: 'Evidence supported denial under policy.', recommendedAction: 'deny_under_policy', rule: null, ruleName: 'Repeat returnless refund pattern', outcome: { decision: 'denied', outcome: 'suspected_fraud', amountRefundedRatio: 0, followed: true }, repeat: 5 },

  { key: 'chargeback-evidence-pack', claimType: 'chargeback', status: 'manual_review', requestedAction: 'investigation', baseAmount: 198, subject: 'Chargeback opened for delivered order', reason: 'Issuer dispute opened after the customer received delivery updates.', lossAttribution: 'customer_claim', confidence: 'low', recoverability: 'possibly_recoverable', recoveryOwner: 'merchant', requiredEvidence: ['order_confirmation', 'delivery_scan', 'support_thread'], recoveryNextAction: 'Compile evidence pack for payment dispute provider.', nextAction: 'Assemble chargeback evidence before response deadline.', nextActionReason: 'The merchant can dispute if delivery and support evidence are complete.', recommendedAction: 'prepare_chargeback_evidence', rule: 'chargeback', partnerRotation: ['crestpay-disputes'], recovery: { type: 'chargeback_evidence', owner: 'payment_dispute_provider', status: 'chase_due' }, repeat: 6 },
  { key: 'chargeback-won', claimType: 'chargeback', status: 'resolved_refunded', requestedAction: 'investigation', baseAmount: 142, subject: 'Chargeback evidence submitted and won', reason: 'Delivery and support evidence won the dispute in the merchant’s favour.', lossAttribution: 'customer_claim', confidence: 'high', recoverability: 'recoverable', recoveryOwner: 'merchant', requiredEvidence: ['order_confirmation', 'delivery_scan'], recoveryNextAction: 'Dispute won; funds returned.', nextAction: 'Closed after dispute won.', nextActionReason: 'Evidence pack was accepted by the payment dispute provider.', recommendedAction: 'prepare_chargeback_evidence', rule: 'chargeback', partnerRotation: ['crestpay-disputes'], outcome: { decision: 'approved', outcome: 'chargeback_won', amountRefundedRatio: 0, followed: true }, recovery: { type: 'chargeback_evidence', owner: 'payment_dispute_provider', status: 'paid', recoveredRatio: 1 }, repeat: 4 },

  { key: 'not-as-described-discount', claimType: 'not_as_described', status: 'open', requestedAction: 'discount', baseAmount: 55, subject: 'Product colour not as described', reason: 'Product colour differed from supplier listing and customer requested discount.', lossAttribution: 'supplier_defect', confidence: 'medium', recoverability: 'possibly_recoverable', recoveryOwner: 'supplier', requiredEvidence: ['customer_photo', 'supplier_listing_snapshot'], recoveryNextAction: 'Collect listing screenshot and pursue supplier credit.', nextAction: 'Offer discount after confirming listing mismatch.', nextActionReason: 'Supplier evidence may support recovery while keeping customer resolution small.', recommendedAction: 'offer_discount', rule: null, ruleName: 'Supplier listing mismatch', partnerRotation: ['harborline-goods', 'novia-textiles'], recovery: { type: 'supplier_defect', owner: 'supplier', status: 'draft' }, repeat: 7 },
  { key: 'not-as-described-new', claimType: 'not_as_described', status: 'new', requestedAction: 'refund', baseAmount: 39, subject: 'Item does not match listing photos', reason: 'Customer says the delivered item does not match the product photos.', lossAttribution: 'supplier_defect', confidence: 'low', recoverability: 'unknown', recoveryOwner: 'unknown', requiredEvidence: ['customer_photo', 'supplier_listing_snapshot'], recoveryNextAction: 'Triage against supplier listing before deciding recovery route.', nextAction: 'Triage new case.', nextActionReason: 'Case has just come in and has not been reviewed yet.', recommendedAction: 'ask_for_evidence', rule: null, repeat: 5 },

  { key: 'late-dispatch-open', claimType: 'item_not_received', status: 'open', requestedAction: 'refund', baseAmount: 83, subject: 'Order stuck in transit', reason: 'Order has been in transit far longer than the published delivery estimate.', lossAttribution: 'three_pl_late_dispatch', confidence: 'medium', recoverability: 'recoverable', recoveryOwner: 'three_pl', requiredEvidence: ['dispatch_sla', 'carrier_scan_history'], recoveryNextAction: 'Open 3PL SLA recovery case once confirmed late.', nextAction: 'Monitor tracking before offering resolution.', nextActionReason: 'Delivery estimate has not yet fully lapsed.', recommendedAction: 'monitor', rule: null, partnerRotation: ['orbit-fulfilment'], repeat: 5 },
];

const totalRepeat = ARCHETYPES.reduce((sum, a) => sum + a.repeat, 0);
console.log(`Archetypes: ${ARCHETYPES.length}, total case instances: ${totalRepeat}`);

function customerForIndex(globalIndex) {
  return CUSTOMERS[globalIndex % CUSTOMERS.length];
}

function partnerIdFor(archetype, instanceIndex) {
  if (!archetype.partnerRotation || archetype.partnerRotation.length === 0) return null;
  const key = archetype.partnerRotation[instanceIndex % archetype.partnerRotation.length];
  return uuid(`partner:${key}`);
}

function ruleFor(archetype) {
  if (archetype.rule) {
    const r = EXISTING_RULES[archetype.rule];
    return { id: r.id, name: r.name };
  }
  return { id: null, name: archetype.ruleName ?? 'Merchant review' };
}

// Build the full operational case list. These long-tail cases sit outside the
// two dashboard comparison windows; a dedicated, fully reconciled cohort below
// owns the 30-day Overview silhouette.
const CASE_PLANS = [];
let globalIndex = 0;
for (const archetype of ARCHETYPES) {
  for (let i = 0; i < archetype.repeat; i += 1) {
    const variance = 0.8 + rand() * 0.5;
    const unscaledAmount = money(archetype.baseAmount * variance);
    const amount = money(unscaledAmount * CASE_AMOUNT_SCALE);
    const ticketDaysAgo = 65 + (globalIndex % 100);
    const orderDaysAgo = ticketDaysAgo + 2 + Math.floor(rand() * 20);
    const resolved = archetype.status.startsWith('resolved_');
    const rule = ruleFor(archetype);
    const key = `${archetype.key}-${i}`;
    const customer = customerForIndex(globalIndex + i * 7);
    CASE_PLANS.push({
      key,
      archetypeKey: archetype.key,
      customer: customer.key,
      claimType: archetype.claimType,
      status: archetype.status,
      requestedAction: archetype.requestedAction,
      amount,
      unscaledAmount,
      orderDaysAgo,
      ticketDaysAgo,
      fulfillmentState: archetype.claimType === 'item_not_received' && !resolved && archetype.status !== 'open' ? 'delivered' : 'delivered',
      subject: `${archetype.subject} (#${1000 + globalIndex})`,
      reason: archetype.reason,
      lossAttribution: archetype.lossAttribution,
      confidence: archetype.confidence,
      recoverability: archetype.recoverability,
      recoveryOwner: archetype.recoveryOwner,
      requiredEvidence: archetype.requiredEvidence,
      recoveryNextAction: archetype.recoveryNextAction,
      nextAction: archetype.nextAction,
      nextActionReason: archetype.nextActionReason,
      recommendedAction: archetype.recommendedAction,
      recommendedRuleId: rule.id,
      recommendedRuleName: rule.name,
      partnerId: partnerIdFor(archetype, i),
      recovery: archetype.recovery
        ? {
            type: archetype.recovery.type,
            owner: archetype.recovery.owner,
            status: archetype.recovery.status,
            min: money(amount * 0.35),
            max: amount,
            recovered: archetype.recovery.recoveredRatio ? money(amount * archetype.recovery.recoveredRatio) : null,
            unscaledMin: money(unscaledAmount * 0.35),
            unscaledMax: unscaledAmount,
            unscaledRecovered: archetype.recovery.recoveredRatio ? money(unscaledAmount * archetype.recovery.recoveredRatio) : null,
          }
        : null,
      outcome: archetype.outcome
        ? {
            decision: archetype.outcome.decision,
            outcome: archetype.outcome.outcome,
            amountRefunded: money(amount * (archetype.outcome.amountRefundedRatio ?? 0)),
            unscaledAmountRefunded: money(unscaledAmount * (archetype.outcome.amountRefundedRatio ?? 0)),
            followed: archetype.outcome.followed,
          }
        : null,
    });
    globalIndex += 1;
  }
}

const OVERVIEW_CURRENT_TOTALS_MINOR = {
  identified: 266_945_000,
  open: 90_352_000,
  prevented: 63_489_000,
  recovered: 42_471_000,
  realised: 70_633_000,
};
const OVERVIEW_PREVIOUS_TOTALS_MINOR = {
  identified: 219_347_000,
  open: 77_128_200,
  prevented: 53_895_600,
  recovered: 30_379_800,
  realised: 57_943_400,
};
const OVERVIEW_CURRENT_SHAPE = [
  8.2, 10.4, 8.8, 6.6, 5.5, 10.8, 8.4, 9.1, 8.8, 6.2,
  7.8, 8.2, 10.3, 9.0, 8.5, 6.5, 7.0, 9.8, 8.7, 10.2,
  8.9, 9.2, 6.0, 7.6, 7.2, 9.0, 10.1, 9.8, 9.2, 8.6,
];
const OVERVIEW_PREVIOUS_SHAPE = [
  8.0, 9.9, 9.4, 7.6, 5.4, 7.5, 7.2, 7.6, 5.0, 8.6,
  7.3, 7.0, 9.1, 7.0, 5.0, 7.4, 7.2, 6.8, 7.0, 7.7,
  7.4, 7.6, 6.0, 8.5, 6.4, 5.7, 8.7, 9.3, 7.4, 6.8,
];

function allocateOverviewTotal(totalMinor, weights) {
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
  const values = weights.map((weight) => Math.floor(totalMinor * weight / weightTotal));
  values[values.length - 1] += totalMinor - values.reduce((sum, value) => sum + value, 0);
  return values;
}

function appendOverviewCohort(period, totals, shape, ageOffset) {
  const openByDay = allocateOverviewTotal(totals.open, shape);
  const preventedByDay = allocateOverviewTotal(totals.prevented, shape);
  const recoveredByDay = allocateOverviewTotal(totals.recovered, shape);
  const realisedByDay = allocateOverviewTotal(totals.realised, shape);

  for (let dayIndex = 0; dayIndex < 30; dayIndex += 1) {
    const age = ageOffset + (29 - dayIndex);
    const recovered = recoveredByDay[dayIndex];
    const profiles = [
      { kind: 'open', exposed: openByDay[dayIndex], prevented: 0, recovered: 0, realised: 0 },
      { kind: 'prevented', exposed: preventedByDay[dayIndex], prevented: preventedByDay[dayIndex], recovered: 0, realised: 0 },
      // Recovered cash retains its confirmed-loss bound. The Overview bridge
      // intentionally presents recovered and realised as separate resolution
      // stages, so this cohort contributes to both recorded stages.
      { kind: 'recovered', exposed: recovered * 2, prevented: 0, recovered, realised: recovered },
      { kind: 'realised', exposed: realisedByDay[dayIndex] - recovered, prevented: 0, recovered: 0, realised: realisedByDay[dayIndex] - recovered },
    ];

    profiles.forEach((profile, slot) => {
      const template = CASE_PLANS[(dayIndex * 4 + slot) % CASE_PLANS.length];
      const amount = money(profile.exposed / 100);
      const recoveredAmount = money(profile.recovered / 100);
      const realisedAmount = money(profile.realised / 100);
      const isOpen = profile.kind === 'open';
      const isPrevented = profile.kind === 'prevented';
      const isRecovered = profile.kind === 'recovered';
      CASE_PLANS.push({
        ...template,
        key: `overview-${period}-${String(dayIndex + 1).padStart(2, '0')}-${profile.kind}`,
        archetypeKey: `overview-${profile.kind}`,
        customer: customerForIndex(dayIndex * 4 + slot + (period === 'previous' ? 120 : 0)).key,
        status: isOpen ? 'open' : isPrevented ? 'resolved_denied' : 'resolved_refunded',
        amount,
        unscaledAmount: money(amount / CASE_AMOUNT_SCALE),
        orderDaysAgo: age + 6,
        ticketDaysAgo: age,
        subject: `${template.subject.replace(/\s\(#\d+\)$/, '')} · ${period} cohort ${dayIndex + 1}`,
        recoverability: isPrevented ? 'not_recoverable' : isRecovered ? 'recoverable' : isOpen ? 'unknown' : 'not_recoverable',
        recoveryOwner: isRecovered ? 'carrier' : isOpen ? 'unknown' : 'merchant',
        recovery: isRecovered ? {
          type: 'carrier_claim',
          owner: 'carrier',
          status: 'paid',
          min: recoveredAmount,
          max: recoveredAmount,
          recovered: recoveredAmount,
          unscaledMin: money(recoveredAmount / CASE_AMOUNT_SCALE),
          unscaledMax: money(recoveredAmount / CASE_AMOUNT_SCALE),
          unscaledRecovered: money(recoveredAmount / CASE_AMOUNT_SCALE),
        } : null,
        outcome: isOpen ? null : {
          decision: isPrevented ? 'denied' : 'approved',
          outcome: isPrevented ? 'legitimate' : isRecovered ? 'recovered' : 'loss',
          amountRefunded: isPrevented ? 0 : realisedAmount,
          unscaledAmountRefunded: isPrevented ? 0 : money(realisedAmount / CASE_AMOUNT_SCALE),
          followed: true,
        },
        financialProfile: {
          requestedMinor: profile.exposed,
          exposedMinor: profile.exposed,
          estimatedLossMinor: isOpen ? profile.exposed : 0,
          preventedMinor: profile.prevented,
          confirmedLossMinor: profile.realised,
          recoverableMinor: profile.recovered,
          recoveredMinor: profile.recovered,
        },
      });
    });
  }

  const profileTotal = CASE_PLANS
    .filter((plan) => plan.key.startsWith(`overview-${period}-`))
    .reduce((sum, plan) => sum + plan.financialProfile.exposedMinor, 0);
  if (profileTotal !== totals.identified) {
    throw new Error(`${period} Overview profile mismatch: expected ${totals.identified}, built ${profileTotal}.`);
  }
}

appendOverviewCohort('current', OVERVIEW_CURRENT_TOTALS_MINOR, OVERVIEW_CURRENT_SHAPE, 0);
appendOverviewCohort('previous', OVERVIEW_PREVIOUS_TOTALS_MINOR, OVERVIEW_PREVIOUS_SHAPE, 30);

// Append the landing proof after every generated cohort. This preserves every
// existing fixture id, random choice and case assignment while giving the
// public hero one coherent, deterministic decision moment.
if (SEED_TAG === 'asterlane-enterprise-demo') CASE_PLANS.push({
  key: FEATURED_CASE_KEY,
  archetypeKey: FEATURED_CASE_TAG,
  fixtureTags: ['sample_data', SEED_TAG, FEATURED_CASE_TAG],
  customer: 'cust-0',
  claimType: 'item_not_received',
  status: 'evidence_needed',
  requestedAction: 'refund',
  amount: 128,
  unscaledAmount: 128,
  caseAmountScale: 1,
  orderNumber: 'ALG-10482',
  ticketExternalId: 'TKT-4821',
  orderDaysAgo: 4,
  ticketDaysAgo: 2,
  fulfillmentState: 'delivered',
  subject: 'Refund requested for delivered parcel without proof',
  reason: 'The customer reports the parcel was not received. Northline Parcel reports delivery, but proof of delivery is not on file.',
  reasonNormalized: 'item_not_received',
  lossAttribution: 'delivery_confirmed_evidence',
  confidence: 'needs_more_evidence',
  recoverability: 'needs_more_evidence',
  recoveryOwner: 'carrier',
  requiredEvidence: ['proof_of_delivery'],
  recoveryNextAction: 'Ask Northline Parcel for proof of delivery before the claim deadline.',
  nextAction: 'Ask carrier for clarification',
  nextActionReason: 'Tracking is present, but proof of delivery is not complete enough to make a payout decision.',
  recommendedAction: 'ask_for_evidence',
  recommendedRuleId: EXISTING_RULES.missingDeliveryEvidence.id,
  recommendedRuleName: EXISTING_RULES.missingDeliveryEvidence.name,
  partnerId: uuid('partner:northline-parcel'),
  recovery: {
    type: 'carrier_claim',
    owner: 'carrier',
    status: 'evidence_needed',
    min: 0,
    max: 128,
    recovered: null,
    unscaledMin: 0,
    unscaledMax: 128,
    unscaledRecovered: null,
  },
  outcome: null,
  financialProfile: {
    requestedMinor: 12_800,
    exposedMinor: 12_800,
    estimatedLossMinor: 12_800,
    preventedMinor: 0,
    confirmedLossMinor: 0,
    recoverableMinor: 12_800,
    recoveredMinor: 0,
  },
  explicitZeroStates: ['prevented', 'recovered'],
});
console.log(`Built ${CASE_PLANS.length} case plans across ${CUSTOMERS.length} customers.`);

// Background orders make the tenant feel like a real high-volume merchant
// without turning every order into a payout case. Their amounts are generated
// in integer pence so customer totals can be reconciled exactly against the
// source_orders rows below.
const BACKGROUND_ORDER_PLANS = Array.from({ length: BACKGROUND_ORDER_COUNT }, (_, index) => {
  const customer = CUSTOMERS[(index * 17) % CUSTOMERS.length];
  const amountMinor = 3500 + ((index * 7919) % 42000);
  return {
    key: `background-${index}`,
    customer: customer.key,
    amount: amountMinor / 100,
    orderDaysAgo: 1 + ((index * 29) % 365),
    fulfillmentState: index % 47 === 0 ? 'in_transit' : index % 71 === 0 ? 'partial' : 'delivered',
    financialStatus: index % 13 === 0 ? 'refunded' : 'paid',
  };
});

const REFUND_PLANS = [
  ...CASE_PLANS
    .filter((item) => (item.outcome?.amountRefunded ?? 0) > 0)
    .map((item) => ({
      key: item.key,
      kind: 'case',
      sourceOrderId: uuid(`order:${item.key}`),
      supportPayoutCaseId: uuid(`case:${item.key}`),
      amount: item.outcome.amountRefunded,
      refundedDaysAgo: Math.max(0, item.ticketDaysAgo - 1),
    })),
  ...BACKGROUND_ORDER_PLANS
    .filter((item) => item.financialStatus === 'refunded')
    .map((item) => ({
      key: item.key,
      kind: 'background',
      sourceOrderId: uuid(`background-order:${item.key}`),
      supportPayoutCaseId: null,
      amount: item.amount,
      refundedDaysAgo: Math.max(0, item.orderDaysAgo - 7),
    })),
];
const RETURN_PLANS = REFUND_PLANS.filter((_, index) => index % 5 !== 0);
console.log(`Built ${REFUND_PLANS.length} refunds and ${RETURN_PLANS.length} returns with linked source orders.`);

const ORDER_AGGREGATES = new Map(
  CUSTOMERS.map((customer) => [customer.key, { count: 0, totalSpentMinor: 0 }]),
);
function recordOrderAggregate(customerKey, amount) {
  const aggregate = ORDER_AGGREGATES.get(customerKey);
  if (!aggregate) throw new Error(`Missing order aggregate customer ${customerKey}`);
  aggregate.count += 1;
  aggregate.totalSpentMinor += Math.round(amount * 100);
}
CASE_PLANS.forEach((order) => recordOrderAggregate(order.customer, order.amount));
BACKGROUND_ORDER_PLANS.forEach((order) => recordOrderAggregate(order.customer, order.amount));
const TOTAL_ORDER_COUNT = CASE_PLANS.length + BACKGROUND_ORDER_PLANS.length;
const TOTAL_GMV_MINOR = [...ORDER_AGGREGATES.values()].reduce((total, aggregate) => total + aggregate.totalSpentMinor, 0);
console.log(`Built ${BACKGROUND_ORDER_PLANS.length} background orders; ${TOTAL_ORDER_COUNT} total orders and GBP ${(TOTAL_GMV_MINOR / 100).toFixed(2)} merchandise value will reconcile to customer aggregates.`);

function ticketExternalId(index) {
  return String(TICKET_ID_BASE + index);
}
function customerByKey(key) {
  const c = CUSTOMERS.find((x) => x.key === key);
  if (!c) throw new Error(`Missing fixture customer ${key}`);
  return c;
}

// ---------------------------------------------------------------------------
// Row builders
// ---------------------------------------------------------------------------

function buildPartnerRows() {
  return PARTNERS.map((partner, index) => ({
    id: uuid(`partner:${partner.key}`),
    merchant_id: MERCHANT_ID,
    name: partner.name,
    partner_type: partner.type,
    status: 'active',
    contact_email: partner.contactEmail,
    contact_url: partner.contactUrl,
    external_reference: null,
    notes: `${partner.notes} ${SEED_NOTE}`,
    created_at: daysAgoIso(200 - index * 6, 10),
    updated_at: daysAgoIso(5, 10),
  }));
}

function buildPartnerRuleRows() {
  return PARTNER_RULES.map((rule, index) => ({
    id: uuid(`partner-rule:${rule.key}`),
    merchant_id: MERCHANT_ID,
    partner_id: uuid(`partner:${rule.partner}`),
    rule_name: rule.ruleName,
    recovery_type: rule.recoveryType,
    applies_to_claim_type: rule.claimType,
    required_evidence: rule.requiredEvidence,
    deadline_days: rule.deadlineDays,
    confidence: rule.confidence,
    source_type: 'merchant_configured',
    submission_method: rule.submissionMethod,
    submission_url: rule.submissionUrl ?? null,
    submission_email: rule.submissionEmail ?? null,
    liability_cap_amount: null,
    liability_cap_basis: null,
    liability_cap_currency: null,
    claimable_costs: rule.claimableCosts,
    excluded_costs: rule.excludedCosts,
    active: true,
    created_at: daysAgoIso(190 - index * 4, 11),
    updated_at: daysAgoIso(5, 11),
  }));
}

function buildCustomerRows() {
  return CUSTOMERS.map((customer) => {
    const aggregate = ORDER_AGGREGATES.get(customer.key);
    if (!aggregate) throw new Error(`Missing customer aggregate ${customer.key}`);
    return {
      id: uuid(`customer:${customer.key}`),
      merchant_id: MERCHANT_ID,
      source: SOURCE_SYSTEM,
      external_id: `${SEED_PREFIX}-customer-${customer.key}`,
      email: customer.email,
      phone: customer.phone,
      first_name: customer.first,
      last_name: customer.last,
      verified_email: true,
      account_created_at: daysAgoIso(customer.accountAgeDays, 9),
      orders_count: aggregate.count,
      total_spent: money(aggregate.totalSpentMinor / 100),
      tags: ['sample_data', SEED_TAG],
      note: SEED_NOTE,
      raw_metadata: { seed: SEED_TAG, sample_data: true },
      created_at: daysAgoIso(customer.accountAgeDays, 9),
      updated_at: daysAgoIso(1, 9),
    };
  });
}

function buildOrderRows() {
  const caseRows = CASE_PLANS.map((c, index) => {
    const customer = customerByKey(c.customer);
    return {
      id: uuid(`order:${c.key}`),
      merchant_id: MERCHANT_ID,
      source: SOURCE_SYSTEM,
      connection_id: uuid('legacy:shopify'),
      external_id: `${SEED_PREFIX}-order-${c.key}`,
      order_number: c.orderNumber ?? `${ORDER_NUMBER_PREFIX}-${String(48000 + index).padStart(6, '0')}`,
      source_customer_id: uuid(`customer:${customer.key}`),
      email: customer.email,
      phone: customer.phone,
      financial_status: c.status === 'resolved_refunded' ? 'refunded' : 'paid',
      fulfillment_state: c.fulfillmentState,
      total_price: c.amount,
      subtotal_price: c.amount,
      total_discounts: 0,
      currency: 'GBP',
      discount_codes: [],
      payment_gateway: index % 4 === 0 ? 'visa' : index % 4 === 1 ? 'mastercard' : index % 4 === 2 ? 'paypal' : 'amex',
      card_last4: index % 2 === 0 ? String(4200 + index).slice(-4) : null,
      browser_ip: null,
      user_agent: null,
      accept_language: 'en-GB',
      landing_site: null,
      referring_site: null,
      source_name: SOURCE_NAME,
      shipping_address_id: null,
      billing_address_id: null,
      line_items_count: 1 + (index % 4),
      note: SEED_NOTE,
      tags: c.fixtureTags ?? ['sample_data', SEED_TAG, c.claimType],
      placed_at: daysAgoIso(c.orderDaysAgo, 8 + ((index + 3) % 9)),
      cancelled_at: null,
      cancel_reason: null,
      raw_payload_hash: sha(`order:${c.key}`),
      ingested_at: daysAgoIso(0, 8),
      updated_at: daysAgoIso(1, 8),
    };
  });
  const backgroundRows = BACKGROUND_ORDER_PLANS.map((order, index) => {
    const customer = customerByKey(order.customer);
    return {
      id: uuid(`background-order:${order.key}`),
      merchant_id: MERCHANT_ID,
      source: SOURCE_SYSTEM,
      connection_id: uuid('legacy:shopify'),
      external_id: `${SEED_PREFIX}-order-${order.key}`,
      order_number: `${ORDER_NUMBER_PREFIX}-${String(500000 + index).padStart(6, '0')}`,
      source_customer_id: uuid(`customer:${customer.key}`),
      email: customer.email,
      phone: customer.phone,
      financial_status: order.financialStatus,
      fulfillment_state: order.fulfillmentState,
      total_price: order.amount,
      subtotal_price: order.amount,
      total_discounts: 0,
      currency: 'GBP',
      discount_codes: [],
      payment_gateway: index % 4 === 0 ? 'visa' : index % 4 === 1 ? 'mastercard' : index % 4 === 2 ? 'paypal' : 'amex',
      card_last4: index % 2 === 0 ? String(5200 + (index % 4700)).slice(-4) : null,
      browser_ip: null,
      user_agent: null,
      accept_language: 'en-GB',
      landing_site: null,
      referring_site: null,
      source_name: SOURCE_NAME,
      shipping_address_id: null,
      billing_address_id: null,
      line_items_count: 1 + (index % 5),
      note: SEED_NOTE,
      tags: ['sample_data', SEED_TAG, 'background_order'],
      placed_at: daysAgoIso(order.orderDaysAgo, 8 + (index % 9)),
      cancelled_at: null,
      cancel_reason: null,
      raw_payload_hash: sha(`background-order:${order.key}`),
      ingested_at: daysAgoIso(0, 8),
      updated_at: daysAgoIso(1, 8),
    };
  });
  return [...caseRows, ...backgroundRows];
}

function refundExternalId(refund) {
  return `${SEED_PREFIX}-refund-${refund.kind}-${refund.key}`;
}

function buildRefundRows() {
  return REFUND_PLANS.map((refund, index) => ({
    id: uuid(`refund:${refund.kind}:${refund.key}`),
    merchant_id: MERCHANT_ID,
    source_order_id: refund.sourceOrderId,
    external_id: refundExternalId(refund),
    amount: refund.amount,
    currency: 'GBP',
    reason: refund.kind === 'case' ? 'Customer resolution completed' : 'Returned merchandise received',
    is_full_refund: true,
    refunded_at: daysAgoIso(refund.refundedDaysAgo, 11 + (index % 6)),
    raw_payload_hash: sha(`refund:${refund.kind}:${refund.key}`),
    ingested_at: daysAgoIso(0, 8),
  }));
}

function buildReturnRows() {
  return RETURN_PLANS.map((item, index) => ({
    id: uuid(`return:${item.kind}:${item.key}`),
    merchant_id: MERCHANT_ID,
    source_order_id: item.sourceOrderId,
    support_payout_case_id: item.supportPayoutCaseId,
    external_id: `${SEED_PREFIX}-return-${item.kind}-${item.key}`,
    status: 'received',
    source_status: 'inspection_complete',
    disposition: index % 7 === 0 ? 'refurbish' : 'restock',
    requested_at: daysAgoIso(item.refundedDaysAgo + 7, 9),
    received_at: daysAgoIso(item.refundedDaysAgo + 2, 12),
    inspected_at: daysAgoIso(item.refundedDaysAgo + 1, 14),
    refund_reference: refundExternalId(item),
    replacement_reference: null,
    raw_metadata: { seed: SEED_TAG, sample_data: true, synthetic: true },
    created_at: daysAgoIso(item.refundedDaysAgo + 7, 9),
    updated_at: daysAgoIso(1, 9),
  }));
}

function buildTicketRows() {
  return CASE_PLANS.map((c, index) => {
    const customer = customerByKey(c.customer);
    const orderNumber = c.orderNumber ?? `${ORDER_NUMBER_PREFIX}-${String(48000 + index).padStart(6, '0')}`;
    const resolved = c.status.startsWith('resolved_');
    return {
      id: uuid(`ticket:${c.key}`),
      merchant_id: MERCHANT_ID,
      provider: 'gorgias',
      connection_id: uuid('legacy:gorgias'),
      external_id: c.ticketExternalId ?? ticketExternalId(index),
      external_url: null,
      source_customer_id: uuid(`customer:${customer.key}`),
      subject: c.subject,
      status: resolved ? 'closed' : 'open',
      channel: index % 5 === 0 ? 'chat' : 'email',
      tags: c.fixtureTags ?? ['sample_data', 'payout_control', c.claimType],
      is_spam: false,
      satisfaction_score: null,
      message_count: 2 + (index % 6),
      customer_reply_count: 1 + (index % 3),
      was_reopened: c.status === 'escalated' || c.status === 'manual_review',
      linked_order_external_ids: [orderNumber],
      opened_at_provider: daysAgoIso(c.ticketDaysAgo, 9 + (index % 7)),
      closed_at_provider: resolved ? daysAgoIso(Math.max(1, c.ticketDaysAgo - 4), 14) : null,
      created_at_provider: daysAgoIso(c.ticketDaysAgo, 9 + (index % 7)),
      updated_at_provider: daysAgoIso(resolved ? Math.max(1, c.ticketDaysAgo - 4) : 1, 15),
      raw_payload_hash: sha(`ticket:${c.key}`),
      ingested_at: daysAgoIso(0, 8),
      updated_at: daysAgoIso(1, 8),
    };
  });
}

const WAITING_DAYS_RATIO = {
  new: 0.05,
  open: 0.1,
  evidence_needed: 0.25,
  awaiting_customer_evidence: 0.35,
  awaiting_carrier_response: 0.4,
  awaiting_3pl_response: 0.4,
  awaiting_supplier_response: 0.45,
  ready_for_decision: 0.3,
  manual_review: 0.5,
  escalated: 0.7,
  recovery_opened: 0.55,
  pending: 0.2,
};

function buildCaseRows() {
  return CASE_PLANS.map((c, index) => {
    const resolved = c.status.startsWith('resolved_');
    const submittedHour = 9 + (index % 7);
    const waitingRatio = WAITING_DAYS_RATIO[c.status] ?? 0.3;
    const openWaitingDays = Math.max(0, Math.round(c.ticketDaysAgo * waitingRatio));
    return {
      id: uuid(`case:${c.key}`),
      merchant_id: MERCHANT_ID,
      source_ticket_id: uuid(`ticket:${c.key}`),
      source_order_id: uuid(`order:${c.key}`),
      identity_id: null,
      claim_type: c.claimType,
      status: c.status,
      detection_method: index % 3 === 0 ? 'tag' : 'manual',
      detection_detail: {
        seed: SEED_TAG,
        sample_data: true,
        synthetic: true,
        source: SOURCE_LABEL,
        archetype: c.archetypeKey,
        ...(c.archetypeKey === FEATURED_CASE_TAG ? { fixture_tag: FEATURED_CASE_TAG } : {}),
      },
      reason_raw: c.reason,
      reason_normalized: c.reasonNormalized ?? c.reason,
      amount_at_risk: c.amount,
      currency: 'GBP',
      requires_review: c.status === 'manual_review' || c.status === 'escalated',
      refund_amount: c.outcome?.amountRefunded ?? null,
      replacement_item_value: c.requestedAction === 'replacement' ? c.amount : null,
      replacement_shipping_cost: c.requestedAction === 'replacement' ? 4.99 : null,
      discount_amount: c.requestedAction === 'discount' ? money(Math.min(25, c.amount * 0.25)) : null,
      store_credit_amount: c.requestedAction === 'store_credit' ? c.amount : null,
      estimated_support_cost: 6.5,
      total_estimated_loss: money(c.amount + 6.5),
      requested_action: c.requestedAction,
      loss_attribution: c.lossAttribution,
      attribution_confidence: c.confidence,
      recoverability: c.recoverability,
      recovery_owner: c.recoveryOwner,
      recovery_required_evidence: c.requiredEvidence,
      recovery_next_action: c.recoveryNextAction,
      recommended_payout_action: c.recommendedAction,
      recommended_rule_name: c.recommendedRuleName,
      recommended_rule_id: c.recommendedRuleId,
      payout_decision_state: resolved ? 'decided' : 'undecided',
      recovery_state: c.recovery ? (c.recovery.status === 'paid' ? 'recovered' : 'open') : 'no_recovery_needed',
      next_action: c.nextAction,
      next_action_reason: c.nextActionReason,
      assigned_to: RECIPIENT_USER_ID,
      assigned_at: daysAgoIso(Math.max(0, openWaitingDays), 10),
      snoozed_until: index % 23 === 0 ? daysFromAnchorIso(2, 9) : null,
      first_viewed_at: index % 4 === 0 ? null : daysAgoIso(Math.max(0, c.ticketDaysAgo - 1), 11),
      submitted_at: daysAgoIso(c.ticketDaysAgo, submittedHour),
      created_at: daysAgoIso(c.ticketDaysAgo, submittedHour),
      updated_at: daysAgoIso(resolved ? Math.max(1, c.ticketDaysAgo - 6) : openWaitingDays, 15),
    };
  });
}

function buildOutcomeRows() {
  return CASE_PLANS.filter((c) => c.outcome).map((c) => ({
    id: uuid(`outcome:${c.key}`),
    claim_id: uuid(`case:${c.key}`),
    decision: c.outcome.decision,
    outcome: c.outcome.outcome,
    amount_refunded: c.outcome.amountRefunded,
    amount_recovered: null,
    notes: `Seeded sample outcome for ${c.subject}.`,
    recommended_payout_action: c.recommendedAction,
    followed_recommendation: c.outcome.followed,
    decided_by: null,
    decided_at: daysAgoIso(Math.max(1, c.ticketDaysAgo - 5), 15),
    updated_at: daysAgoIso(Math.max(1, c.ticketDaysAgo - 5), 15),
  }));
}

function buildClaimEventRows() {
  return CASE_PLANS.flatMap((c) => {
    const claimId = uuid(`case:${c.key}`);
    const base = {
      merchant_id: MERCHANT_ID,
      claim_id: claimId,
      from_status: null,
      to_status: null,
      note: null,
      actor_user_id: null,
      metadata: { seed: SEED_TAG, sample_data: true, synthetic: true },
    };
    const rows = [
      {
        ...base,
        id: uuid(`claim-event:created:${c.key}`),
        event_type: 'claim_created',
        to_status: 'new',
        note: 'Case opened from the linked support conversation and order.',
        created_at: daysAgoIso(c.ticketDaysAgo, 9),
      },
      {
        ...base,
        id: uuid(`claim-event:assigned:${c.key}`),
        event_type: 'claim_assigned',
        actor_user_id: RECIPIENT_USER_ID,
        note: 'Avery Mercer assigned as the case owner.',
        created_at: daysAgoIso(Math.max(0, c.ticketDaysAgo - 1), 10),
      },
      {
        ...base,
        id: uuid(`claim-event:evidence:${c.key}`),
        event_type: 'evidence_added',
        actor_user_id: RECIPIENT_USER_ID,
        note: 'Connected source evidence reconciled to the case.',
        created_at: daysAgoIso(Math.max(0, c.ticketDaysAgo - 2), 12),
      },
    ];
    if (c.outcome) {
      rows.push({
        ...base,
        id: uuid(`claim-event:resolved:${c.key}`),
        event_type: 'claim_resolved',
        from_status: 'ready_for_decision',
        to_status: c.status,
        actor_user_id: RECIPIENT_USER_ID,
        note: 'Merchant outcome recorded with its evidence and financial context.',
        created_at: daysAgoIso(Math.max(1, c.ticketDaysAgo - 5), 15),
      });
    }
    return rows;
  });
}

function buildRecoveryRows() {
  return CASE_PLANS.filter((c) => c.recovery).map((c) => {
    const recovery = c.recovery;
    const missingEvidence = recovery.status === 'evidence_needed' ? c.requiredEvidence.slice(0, 2) : [];
    return {
      id: uuid(`recovery:${c.key}`),
      merchant_id: MERCHANT_ID,
      support_payout_case_id: uuid(`case:${c.key}`),
      loss_case_id: uuid(`loss:${c.key}`),
      partner_id: c.partnerId,
      recovery_type: recovery.type,
      owner_type: recovery.owner,
      status: recovery.status,
      merchant_loss_amount: c.amount,
      eligible_loss_amount: c.amount,
      estimated_recoverable_min: recovery.min,
      estimated_recoverable_max: recovery.max,
      amount_recovered: recovery.recovered ?? null,
      currency: 'GBP',
      deadline_at: daysFromAnchorIso(recovery.status === 'chase_due' ? 1 : 14, 17),
      next_chase_at: recovery.status === 'chase_due' ? daysAgoIso(1, 9) : daysFromAnchorIso(4, 9),
      last_chased_at: recovery.status === 'waiting_response' ? daysAgoIso(3, 10) : null,
      evidence_required: c.requiredEvidence,
      evidence_missing: missingEvidence,
      evidence_complete: missingEvidence.length === 0,
      rejection_reason: null,
      calculation_reason: [`Sample recovery route seeded for ${c.lossAttribution}.`],
      excluded_costs: [],
      internal_owner_user_id: null,
      created_at: daysAgoIso(Math.max(0, c.ticketDaysAgo - 1), 13),
      updated_at: daysAgoIso(Math.min(1, c.ticketDaysAgo), 14),
    };
  });
}

function lossCategory(c) {
  if (c.claimType === 'chargeback') return 'chargeback_or_payment_dispute';
  if (c.claimType === 'damaged') return 'damaged_goods';
  if (c.claimType === 'wrong_item') return 'wrong_item_or_missing_item';
  if (c.lossAttribution?.includes('supplier')) return 'supplier_or_vendor_issue';
  return 'delivery_loss';
}
function recoveryRoute(c) {
  const type = c.recovery?.type;
  if (type === 'carrier_claim') return 'carrier_claim';
  if (type === 'three_pl_claim') return 'internal_fulfilment_issue';
  if (type === 'supplier_defect') return 'supplier_vendor_claim';
  if (type === 'chargeback_evidence') return 'chargeback_evidence_pack';
  return c.recoverability === 'not_recoverable' ? 'not_recoverable' : 'needs_more_evidence';
}
function buildLossRows() {
  return CASE_PLANS.filter((c) => c.outcome || c.recovery).map((c) => ({
    id: uuid(`loss:${c.key}`), merchant_id: MERCHANT_ID, support_payout_case_id: uuid(`case:${c.key}`),
    order_id: uuid(`order:${c.key}`), helpdesk_ticket_id: uuid(`ticket:${c.key}`), case_category: lossCategory(c),
    case_type: c.claimType, status: c.recovery ? 'collecting_evidence' : 'closed_unrecoverable',
    counterparty_type: c.recovery?.owner === 'carrier' ? 'carrier' : c.recovery?.owner === 'supplier' ? 'supplier' : c.recovery?.owner === 'three_pl' ? '3pl' : c.recovery?.owner === 'payment_dispute_provider' ? 'payment_processor' : 'internal_team',
    recovery_route: recoveryRoute(c), source_confidence: c.confidence === 'high' ? 'source_verified' : 'partial_source_verified',
    order_value_minor: Math.round(c.amount * 100), refund_value_minor: Math.round((c.outcome?.amountRefunded ?? 0) * 100),
    estimated_recovery_minor: Math.round((c.recovery?.max ?? 0) * 100), approved_recovery_minor: Math.round((c.recovery?.recovered ?? 0) * 100),
    currency: 'GBP', attribution: c.lossAttribution, recoverability: c.recoverability, prevention_only: !c.outcome,
    financial_state: c.outcome ? 'confirmed' : 'estimated', evidence_completion_score: c.recovery?.status === 'evidence_needed' ? 50 : 100,
    missing_evidence_count: c.recovery?.status === 'evidence_needed' ? 2 : 0, financial_entry_ids: [], source_metadata: { seed: SEED_TAG, sample_data: true },
    created_at: daysAgoIso(Math.max(1, c.ticketDaysAgo - 2), 13), updated_at: daysAgoIso(1, 14),
  }));
}

function buildWorkTaskRows() {
  return CASE_PLANS.filter((c) => !c.status.startsWith('resolved_')).map((c, index) => ({
    id: uuid(`task:${c.key}`), merchant_id: MERCHANT_ID, support_payout_case_id: uuid(`case:${c.key}`),
    loss_case_id: c.outcome || c.recovery ? uuid(`loss:${c.key}`) : null, recovery_case_id: c.recovery ? uuid(`recovery:${c.key}`) : null,
    title: c.nextAction, description: c.nextActionReason, status: 'open', priority: c.status === 'manual_review' || c.status === 'escalated' ? 'high' : index % 5 === 0 ? 'high' : 'medium',
    due_at: index % 9 === 0 ? daysAgoIso(1, 16) : daysFromAnchorIso(1 + (index % 6), 16), owner_role: 'analyst', source: 'demo_seed',
    source_metadata: { seed: SEED_TAG, sample_data: true }, created_at: daysAgoIso(Math.max(1, c.ticketDaysAgo - 1), 14), updated_at: daysAgoIso(1, 14),
  }));
}

function buildCanonicalDecisionRows() {
  return CASE_PLANS.filter((c) => c.outcome).flatMap((c) => {
    const caseAmountScale = c.caseAmountScale ?? CASE_AMOUNT_SCALE;
    const baseId = uuid(`canonical-decision:${c.key}`);
    const effectiveAt = daysAgoIso(Math.max(1, c.ticketDaysAgo - 5), 15);
    const base = {
      id: baseId,
      merchant_id: MERCHANT_ID,
      support_payout_case_id: uuid(`case:${c.key}`),
      decision: c.outcome.decision,
      action: c.requestedAction,
      amount_minor: Math.round((c.outcome.unscaledAmountRefunded ?? 0) * 100),
      currency: 'GBP',
      actor_type: 'demo_seed',
      reason: `Sample merchant decision for ${c.subject}.`,
      recommendation_snapshot: { action: c.recommendedAction },
      rule_snapshot: { name: c.recommendedRuleName, version: 1 },
      followed_recommendation: c.outcome.followed,
      idempotency_key: `${SEED_PREFIX}:decision:${c.key}`,
      effective_at: effectiveAt,
      recorded_at: effectiveAt,
    };
    if (caseAmountScale === 1) return [base];
    return [base, {
      ...base,
      id: uuid(`canonical-decision-scale:${caseAmountScale}:${c.key}`),
      amount_minor: Math.round((c.outcome.amountRefunded ?? 0) * 100),
      reason: `Superseding synthetic enterprise-scale decision for ${c.subject}.`,
      supersedes_decision_id: baseId,
      idempotency_key: `${SEED_PREFIX}:decision-scale-${caseAmountScale}:${c.key}`,
      effective_at: daysAgoIso(0, 10),
      recorded_at: daysAgoIso(0, 10),
    }];
  });
}
function buildCanonicalOutcomeRows() {
  return CASE_PLANS.filter((c) => c.outcome).flatMap((c) => {
    const caseAmountScale = c.caseAmountScale ?? CASE_AMOUNT_SCALE;
    const baseId = uuid(`canonical-outcome:${c.key}`);
    const effectiveAt = daysAgoIso(Math.max(1, c.ticketDaysAgo - 4), 16);
    const base = {
      id: baseId,
      merchant_id: MERCHANT_ID,
      support_payout_case_id: uuid(`case:${c.key}`),
      outcome_type: c.outcome.outcome,
      amount_minor: Math.round((c.outcome.unscaledAmountRefunded ?? c.recovery?.unscaledRecovered ?? 0) * 100),
      currency: 'GBP',
      actor_type: 'demo_seed',
      reason: `Sample operational outcome for ${c.subject}.`,
      metadata: { seed: SEED_TAG, sample_data: true },
      idempotency_key: `${SEED_PREFIX}:outcome:${c.key}`,
      effective_at: effectiveAt,
      recorded_at: effectiveAt,
    };
    if (caseAmountScale === 1) return [base];
    return [base, {
      ...base,
      id: uuid(`canonical-outcome-scale:${caseAmountScale}:${c.key}`),
      amount_minor: Math.round((c.outcome.amountRefunded ?? c.recovery?.recovered ?? 0) * 100),
      reason: `Superseding synthetic enterprise-scale outcome for ${c.subject}.`,
      metadata: { seed: SEED_TAG, sample_data: true, supersedes_outcome_id: baseId, scale: caseAmountScale },
      idempotency_key: `${SEED_PREFIX}:outcome-scale-${caseAmountScale}:${c.key}`,
      effective_at: daysAgoIso(0, 11),
      recorded_at: daysAgoIso(0, 11),
    }];
  });
}

function buildFinancialEntryRows() {
  const rows = [];

  for (const c of CASE_PLANS) {
    const caseId = uuid(`case:${c.key}`);
    const resolved = c.status.startsWith('resolved_');
    const profile = c.financialProfile ?? null;
    const requested = profile?.requestedMinor ?? Math.round(c.amount * 100);
    const approved = c.outcome && c.outcome.decision === 'approved' ? requested : 0;
    const paid = c.outcome?.amountRefunded ? Math.round(c.outcome.amountRefunded * 100) : 0;
    const recovered = profile?.recoveredMinor ?? (c.recovery?.recovered ? Math.round(c.recovery.recovered * 100) : 0);
    const recoverable = profile?.recoverableMinor ?? (c.recovery ? Math.round(c.recovery.max * 100) : 0);
    const prevented = profile?.preventedMinor ?? (c.recoverability === 'not_recoverable' && !c.outcome ? requested : 0);
    const exposed = profile?.exposedMinor ?? (!resolved ? requested : 0);
    const estimatedLoss = profile?.estimatedLossMinor ?? (!resolved ? requested : 0);
    const confirmedLoss = profile?.confirmedLossMinor ?? (resolved ? paid : 0);
    const baseRequested = Math.round(c.unscaledAmount * 100);
    const baseApproved = c.outcome && c.outcome.decision === 'approved' ? baseRequested : 0;
    const basePaid = c.outcome?.unscaledAmountRefunded ? Math.round(c.outcome.unscaledAmountRefunded * 100) : 0;
    const baseRecovered = c.recovery?.unscaledRecovered ? Math.round(c.recovery.unscaledRecovered * 100) : 0;
    const baseRecoverable = c.recovery ? Math.round(c.recovery.unscaledMax * 100) : 0;
    const basePrevented = c.recoverability === 'not_recoverable' && !c.outcome ? baseRequested : 0;
    const effectiveAt = daysAgoIso(Math.max(1, c.ticketDaysAgo - 5), 16);
    const lossCaseId = c.outcome || c.recovery ? uuid(`loss:${c.key}`) : null;
    const recoveryCaseId = c.recovery ? uuid(`recovery:${c.key}`) : null;

    const caseAmountScale = c.caseAmountScale ?? CASE_AMOUNT_SCALE;
    const addEntry = (state, amountMinor, options = {}) => {
      if (!amountMinor && !options.recordZero) return;
      rows.push({
        id: uuid(options.idSuffix ? `financial-entry:${state}:${options.idSuffix}:${c.key}` : `financial-entry:${state}:${c.key}`),
        merchant_id: MERCHANT_ID,
        support_payout_case_id: caseId,
        loss_case_id: lossCaseId,
        recovery_case_id: recoveryCaseId,
        state,
        amount_minor: amountMinor,
        currency: 'GBP',
        direction: options.direction ?? 'memo',
        effective_at: effectiveAt,
        recorded_at: effectiveAt,
        metadata: {
          seed: SEED_TAG,
          sample_data: true,
          source: SOURCE_LABEL,
          archetype: c.archetypeKey,
          financial_state: state,
          component_type: c.requestedAction,
          ledger_kind: options.ledgerKind ?? 'legacy',
          valuation_basis: options.valuationBasis ?? null,
          ...(c.archetypeKey === FEATURED_CASE_TAG ? { fixture_tag: FEATURED_CASE_TAG, synthetic: true } : {}),
        },
      });
    };

    const addScaledEntries = (state, scaledAmountMinor, baseAmountMinor, options = {}) => {
      // The enterprise demo is a verified presentation account. Record an
      // explicit zero for every canonical state so downstream surfaces can
      // distinguish a proven zero from an unavailable value.
      const recordZero = SEED_TAG === 'asterlane-enterprise-demo'
        || c.explicitZeroStates?.includes(state) === true;
      addEntry(state, baseAmountMinor, { ...options, recordZero });
      const adjustment = scaledAmountMinor - baseAmountMinor;
      if (caseAmountScale > 1 && adjustment > 0) {
        addEntry(state, adjustment, {
          ...options,
          idSuffix: `scale-${caseAmountScale}`,
          ledgerKind: 'demo_scale_adjustment',
          valuationBasis: 'synthetic_enterprise_scale',
        });
      }
    };

    addScaledEntries('requested', requested, baseRequested);
    addScaledEntries('exposed', exposed, Math.round(exposed / caseAmountScale));
    addScaledEntries('estimated_loss', estimatedLoss, Math.round(estimatedLoss / caseAmountScale));
    addScaledEntries('approved', approved, baseApproved);
    addScaledEntries('paid', paid, basePaid, {
      direction: 'debit',
      ledgerKind: 'customer_concession',
      valuationBasis: 'payout_value',
    });
    addScaledEntries('confirmed_loss', confirmedLoss, profile ? Math.round(confirmedLoss / caseAmountScale) : resolved ? basePaid : 0, {
      direction: 'debit',
      ledgerKind: 'merchant_economic_loss',
      valuationBasis: 'payout_value',
    });
    addScaledEntries('recoverable', recoverable, baseRecoverable);
    addScaledEntries('recovered', recovered, baseRecovered, {
      direction: 'credit',
      ledgerKind: 'provider_recovery',
    });
    addScaledEntries('prevented', prevented, basePrevented);
  }

  return rows;
}

function buildFinancialSummaryRows() {
  return CASE_PLANS.filter((c) => c.archetypeKey !== FEATURED_CASE_TAG).map((c) => {
    const profile = c.financialProfile ?? null;
    const requested = profile?.requestedMinor ?? Math.round(c.amount * 100);
    const resolved = c.status.startsWith('resolved_');
    const approved = c.outcome && c.outcome.decision === 'approved' ? requested : 0;
    const paid = c.outcome?.amountRefunded ? Math.round(c.outcome.amountRefunded * 100) : 0;
    const recoveredMinor = profile?.recoveredMinor ?? (c.recovery?.recovered ? Math.round(c.recovery.recovered * 100) : 0);
    const recoverableMinor = profile?.recoverableMinor ?? (c.recovery ? Math.round(c.recovery.max * 100) : 0);
    return {
      merchant_id: MERCHANT_ID,
      support_payout_case_id: uuid(`case:${c.key}`),
      currency: 'GBP',
      requested_minor: requested,
      exposed_minor: profile?.exposedMinor ?? (resolved ? 0 : requested),
      approved_minor: approved,
      paid_minor: paid,
      estimated_loss_minor: profile?.estimatedLossMinor ?? (resolved ? 0 : requested),
      confirmed_loss_minor: profile?.confirmedLossMinor ?? (resolved ? paid : 0),
      recoverable_minor: recoverableMinor,
      recovered_minor: recoveredMinor,
      prevented_minor: profile?.preventedMinor ?? (c.recoverability === 'not_recoverable' && !c.outcome ? requested : 0),
      written_off_minor: 0,
      last_event_id: null,
      updated_at: daysAgoIso(1, 16),
    };
  });
}

async function recomputeFeaturedCaseFinancialSummary() {
  const featured = CASE_PLANS.find((c) => c.archetypeKey === FEATURED_CASE_TAG);
  if (!featured) return;
  const caseId = uuid(`case:${featured.key}`);
  const { data, error } = await supabase
    .from('case_financial_entries')
    .select('id,state,amount_minor,currency,effective_at,recorded_at')
    .eq('merchant_id', MERCHANT_ID)
    .eq('support_payout_case_id', caseId)
    .order('effective_at', { ascending: false })
    .order('recorded_at', { ascending: false })
    .order('id', { ascending: false });
  if (error) throw new Error(`featured case ledger read failed: ${error.message}`);
  const entries = data ?? [];
  if (entries.length === 0) throw new Error('Featured case has no canonical financial entries to summarise.');
  const states = new Map();
  for (const entry of entries) states.set(entry.state, (states.get(entry.state) ?? 0) + Number(entry.amount_minor));
  await upsertRows('case_financial_summaries', [{
    merchant_id: MERCHANT_ID,
    support_payout_case_id: caseId,
    currency: 'GBP',
    requested_minor: states.get('requested') ?? 0,
    exposed_minor: states.get('exposed') ?? 0,
    approved_minor: states.get('approved') ?? 0,
    paid_minor: states.get('paid') ?? 0,
    estimated_loss_minor: states.get('estimated_loss') ?? 0,
    confirmed_loss_minor: states.get('confirmed_loss') ?? 0,
    recoverable_minor: states.get('recoverable') ?? 0,
    recovered_minor: states.get('recovered') ?? 0,
    prevented_minor: states.get('prevented') ?? 0,
    written_off_minor: states.get('written_off') ?? 0,
    last_event_id: entries[0].id,
    updated_at: new Date().toISOString(),
  }]);
  console.log('Recomputed the featured case financial summary from canonical ledger entries.');
}

function buildShipmentRows() {
  const carriers = { 'royal-mail': 'Royal Mail', evri: 'Evri', 'dpd-uk': 'DPD UK', 'northline-parcel': 'Northline Parcel' };
  return CASE_PLANS.filter((c) => c.fulfillmentState === 'delivered').map((c) => {
    const carrierKey = c.partnerId ? Object.keys(carriers).find((k) => uuid(`partner:${k}`) === c.partnerId) : null;
    const carrierName = carrierKey ? carriers[carrierKey] : pick(['Royal Mail', 'Evri', 'DPD UK']);
    return {
      id: uuid(`shipment:${c.key}`),
      merchant_id: MERCHANT_ID,
      source_account_id: null,
      source_order_id: uuid(`order:${c.key}`),
      source_fulfillment_id: c.archetypeKey === FEATURED_CASE_TAG ? uuid(`fulfillment:${c.key}`) : null,
      source_record_id: null,
      external_id: `${SEED_PREFIX}-shipment-${c.key}`,
      tracking_number: `TRK${sha(`shipment:${c.key}`).slice(0, 10).toUpperCase()}`,
      carrier: carrierName,
      service: 'standard',
      status: 'delivered',
      source_status: 'delivered',
      shipped_at: daysAgoIso(c.orderDaysAgo - 1, 15),
      delivered_at: daysAgoIso(Math.max(0, c.orderDaysAgo - 3), 12),
      raw_metadata: { seed: SEED_TAG, sample_data: true },
      created_at: daysAgoIso(c.orderDaysAgo - 1, 15),
      updated_at: daysAgoIso(Math.max(0, c.orderDaysAgo - 3), 12),
    };
  });
}

function trackingNumberFor(c) {
  if (c.archetypeKey === FEATURED_CASE_TAG) return 'NLP10482GB';
  return `1Z${sha(`tracking:${c.key}`).slice(0, 16).toUpperCase()}`;
}

function needsOpenEvidenceGap(c) {
  return ['evidence_needed', 'awaiting_customer_evidence', 'awaiting_carrier_response'].includes(c.status);
}

function buildFulfillmentRows() {
  return CASE_PLANS.map((c) => {
    const featured = c.archetypeKey === FEATURED_CASE_TAG;
    const evidenceGap = needsOpenEvidenceGap(c);
    return {
      id: uuid(`fulfillment:${c.key}`),
      merchant_id: MERCHANT_ID,
      source_order_id: uuid(`order:${c.key}`),
      external_id: `${SEED_PREFIX}-fulfillment-${c.key}`,
      status: 'delivered',
      shipment_status: 'delivered',
      // Evidence-gap cases retain an explicit missing state from their
      // non-direct carrier. Every other case is backed by the connected UPS
      // evidence source and a complete synthetic proof bundle.
      tracking_company: featured ? 'Northline Parcel' : evidenceGap ? 'Royal Mail' : 'UPS',
      tracking_number: trackingNumberFor(c),
      occurred_at: featured ? daysAgoIso(1, 13) : daysAgoIso(Math.max(1, c.orderDaysAgo - 3), 12),
      updated_at_source: daysAgoIso(0, 8),
      ingested_at: daysAgoIso(0, 8),
    };
  });
}

function buildFeaturedEvidenceRows() {
  return CASE_PLANS.filter((c) => c.archetypeKey === FEATURED_CASE_TAG).map((c) => ({
    id: uuid(`evidence:customer-statement:${c.key}`),
    claim_id: uuid(`case:${c.key}`),
    merchant_id: MERCHANT_ID,
    source_system: 'gorgias',
    evidence_type: 'support_ticket',
    title: 'Customer statement',
    summary: 'Maya Chen reports that the parcel was not received and requests a £128 refund.',
    occurred_at: daysAgoIso(c.ticketDaysAgo, 9),
    raw_payload: { synthetic: true, fixture_tag: FEATURED_CASE_TAG },
    external_url: null,
    proves: 'Customer statement is on file',
    confidence: 1,
    source_record_id: c.ticketExternalId,
    connection_id: null,
    source_account_id: null,
    source_url: null,
    source_created_at: daysAgoIso(c.ticketDaysAgo, 9),
    source_updated_at: daysAgoIso(1, 15),
    ingested_at: daysAgoIso(0, 8),
    last_synced_at: daysAgoIso(0, 8),
    freshness_state: 'current',
    sync_state: 'current',
    storage_path: null,
    content_hash: sha(`evidence:customer-statement:${c.key}`),
    structured_value: { value: 'Parcel not received', requested_action: 'refund', amount_minor: 12_800, currency: 'GBP' },
    source_metadata: {
      origin_store: 'claim_evidence',
      seed: SEED_TAG,
      sample_data: true,
      synthetic: true,
      fixture_tag: FEATURED_CASE_TAG,
    },
    created_by: null,
    created_at: daysAgoIso(c.ticketDaysAgo, 9),
    updated_at: daysAgoIso(1, 15),
  }));
}

function baseEvidenceRow(c, key, input) {
  const claimId = uuid(`case:${c.key}`);
  return {
    id: uuid(`evidence:${key}:${c.key}`),
    claim_id: claimId,
    merchant_id: MERCHANT_ID,
    evidence_type: input.evidenceType,
    title: input.title,
    summary: input.summary,
    occurred_at: input.occurredAt ?? daysAgoIso(Math.max(1, c.ticketDaysAgo - 1), 13),
    raw_payload: { synthetic: true, seed: SEED_TAG },
    external_url: null,
    proves: input.proves,
    confidence: input.confidence ?? 1,
    source_record_id: input.sourceRecordId ?? `${SEED_PREFIX}-${key}-${c.key}`,
    connection_id: input.connectionId ?? null,
    source_account_id: null,
    source_url: null,
    source_system: input.sourceSystem,
    source_created_at: input.occurredAt ?? daysAgoIso(Math.max(1, c.ticketDaysAgo - 1), 13),
    source_updated_at: daysAgoIso(0, 8),
    ingested_at: daysAgoIso(0, 8),
    last_synced_at: daysAgoIso(0, 8),
    freshness_state: 'current',
    sync_state: 'current',
    storage_path: null,
    content_hash: sha(`evidence:${key}:${c.key}`),
    structured_value: { value: input.value ?? true },
    source_metadata: {
      seed: SEED_TAG,
      sample_data: true,
      synthetic: true,
      source_category: input.sourceCategory,
      confidence_label: 'high',
      ...(input.claimEvidence ? { origin_store: 'claim_evidence' } : {}),
    },
    created_by: null,
    created_at: daysAgoIso(Math.max(1, c.ticketDaysAgo - 1), 13),
    updated_at: daysAgoIso(0, 8),
  };
}

function buildOperationalEvidenceRows() {
  return CASE_PLANS
    .filter((c) => c.archetypeKey !== FEATURED_CASE_TAG)
    .flatMap((c) => {
      const rows = [
        baseEvidenceRow(c, 'customer-statement', {
          evidenceType: 'support_ticket',
          title: 'Customer statement',
          summary: `${customerByKey(c.customer).first} ${customerByKey(c.customer).last}'s request and reason are recorded in Gorgias.`,
          proves: 'Customer statement and requested resolution are on file',
          sourceSystem: 'gorgias',
          sourceCategory: 'helpdesk',
          sourceRecordId: uuid(`ticket:${c.key}`),
          connectionId: uuid('integration:gorgias'),
          claimEvidence: true,
        }),
        baseEvidenceRow(c, 'merchant-inspection', {
          evidenceType: 'merchant_inspection',
          title: 'Operational review record',
          summary: 'Asterlane operations recorded the item, packaging, and resolution context for this case.',
          proves: 'Merchant inspection context is on file',
          sourceSystem: 'shipbob',
          sourceCategory: 'warehouse_3pl',
          connectionId: uuid('integration:shipbob'),
          claimEvidence: true,
        }),
        baseEvidenceRow(c, 'pick-pack-record', {
          evidenceType: 'pick_pack_record',
          title: 'Warehouse pick and pack record',
          summary: 'ShipBob pick, pack, SKU, and parcel-weight checks are linked to the source order.',
          proves: 'Warehouse pick and pack evidence is on file',
          sourceSystem: 'shipbob',
          sourceCategory: 'warehouse_3pl',
          connectionId: uuid('integration:shipbob'),
          claimEvidence: true,
        }),
        baseEvidenceRow(c, 'packing-slip', {
          evidenceType: 'packing_slip',
          title: 'Packing slip',
          summary: 'The expected order contents and packed SKU list are recorded.',
          proves: 'Packing slip contents are on file',
          sourceSystem: 'shipbob',
          sourceCategory: 'warehouse_3pl',
          connectionId: uuid('integration:shipbob'),
          claimEvidence: true,
        }),
        baseEvidenceRow(c, 'packaging-condition', {
          evidenceType: 'packaging_condition',
          title: 'Packaging condition',
          summary: 'Packaging condition was recorded during the operational review.',
          proves: 'Packaging condition is documented',
          sourceSystem: 'shipbob',
          sourceCategory: 'warehouse_3pl',
          connectionId: uuid('integration:shipbob'),
          claimEvidence: true,
        }),
        baseEvidenceRow(c, 'carrier-damage-report', {
          evidenceType: 'carrier_damage_report',
          title: 'Carrier damage report',
          summary: 'Carrier handling and damage observations are linked to the shipment.',
          proves: 'Carrier damage context is on file',
          sourceSystem: 'ups',
          sourceCategory: 'carrier',
          connectionId: uuid('integration:ups'),
          claimEvidence: true,
        }),
        baseEvidenceRow(c, 'received-item-photo', {
          evidenceType: 'received_item_photo',
          title: 'Received item photo',
          summary: 'The received item image is linked to the case review.',
          proves: 'A received-item image is on file',
          sourceSystem: 'gorgias',
          sourceCategory: 'helpdesk',
          connectionId: uuid('integration:gorgias'),
          claimEvidence: true,
        }),
      ];

      if (!needsOpenEvidenceGap(c)) {
        const trackingNumber = trackingNumberFor(c);
        const occurredAt = daysAgoIso(Math.max(1, c.orderDaysAgo - 3), 12);
        const carrierRows = [
          ['tracking-number', 'tracking_number', 'UPS tracking number', `UPS ${trackingNumber}`, trackingNumber],
          ['tracking-events', 'tracking_events', 'UPS scan timeline', 'Six carrier scan events recorded with no unresolved exception.', 6],
          ['delivery-status', 'delivery_status', 'UPS delivery status', 'Delivered', 'delivered'],
          ['proof-of-delivery', 'proof_of_delivery', 'Proof of delivery', 'UPS proof of delivery is on file.', { delivered: true }],
          ['delivery-photo', 'delivery_photo', 'Delivery photo', 'UPS delivery photo is on file.', { available: true }],
          ['signature', 'signature', 'Delivery signature', 'UPS delivery signature is on file.', { available: true }],
          ['gps', 'gps', 'Delivery GPS coordinates', 'UPS delivery coordinates are on file.', { latitude: 51.5074, longitude: -0.1278 }],
        ];
        rows.push(...carrierRows.map(([key, evidenceType, title, summary, value]) => baseEvidenceRow(c, key, {
          evidenceType,
          title,
          summary,
          proves: `${title} is on file`,
          sourceSystem: 'ups',
          sourceCategory: 'carrier',
          sourceRecordId: trackingNumber,
          connectionId: uuid('integration:ups'),
          occurredAt,
          value,
          claimEvidence: false,
        })));
      }

      return rows;
    });
}

function buildFeaturedEvidenceLinkRows() {
  return CASE_PLANS.filter((c) => c.archetypeKey === FEATURED_CASE_TAG).map((c) => ({
    id: uuid(`evidence-link:customer-statement:${c.key}`),
    merchant_id: MERCHANT_ID,
    evidence_item_id: uuid(`evidence:customer-statement:${c.key}`),
    support_payout_case_id: uuid(`case:${c.key}`),
    source_order_id: null,
    source_ticket_id: null,
    loss_case_id: null,
    recovery_case_id: null,
    created_at: daysAgoIso(1, 15),
  }));
}

function buildOperationalEvidenceLinkRows() {
  return buildOperationalEvidenceRows().map((row) => ({
    id: uuid(`evidence-link:${row.id}`),
    merchant_id: MERCHANT_ID,
    evidence_item_id: row.id,
    support_payout_case_id: row.claim_id,
    source_order_id: null,
    source_ticket_id: null,
    loss_case_id: null,
    recovery_case_id: null,
    created_at: daysAgoIso(0, 8),
  }));
}

function buildNotificationRows() {
  const rows = [];
  const overdue = CASE_PLANS.filter((c) => c.status === 'manual_review' || c.status === 'escalated').slice(0, 6);
  overdue.forEach((c, i) => {
    rows.push({
      id: uuid(`notif:overdue:${c.key}`),
      merchant_id: MERCHANT_ID,
      recipient_user_id: RECIPIENT_USER_ID,
      kind: 'approaching_deadline',
      title: 'Overdue: Review payout case',
      body: `${c.subject} needs a decision.`,
      target_href: `/claims/${uuid(`case:${c.key}`)}`,
      domain_event_id: null,
      deduplication_key: `${SEED_PREFIX}:overdue:${c.key}`,
      read_at: i < 2 ? daysAgoIso(1, 9) : null,
      created_at: daysAgoIso(2 + i, 9),
    });
  });
  const highValue = [...CASE_PLANS].sort((a, b) => b.amount - a.amount).slice(0, 4);
  highValue.forEach((c, i) => {
    rows.push({
      id: uuid(`notif:highvalue:${c.key}`),
      merchant_id: MERCHANT_ID,
      recipient_user_id: RECIPIENT_USER_ID,
      kind: 'high_value_case_alert',
      title: `High-value payout case · £${c.amount.toFixed(2)}`,
      body: `${c.subject} has payout exposure of £${c.amount.toFixed(2)}.`,
      target_href: `/claims/${uuid(`case:${c.key}`)}`,
      domain_event_id: null,
      deduplication_key: `${SEED_PREFIX}:highvalue:${c.key}`,
      read_at: i === 0 ? daysAgoIso(1, 9) : null,
      created_at: daysAgoIso(1 + i, 10),
    });
  });
  const evidenceIssues = CASE_PLANS.filter((c) => c.recovery?.status === 'evidence_needed').slice(0, 5);
  evidenceIssues.forEach((c, i) => {
    rows.push({
      id: uuid(`notif:evidence:${c.key}`),
      merchant_id: MERCHANT_ID,
      recipient_user_id: RECIPIENT_USER_ID,
      kind: 'evidence_update',
      title: 'Recovery evidence is incomplete',
      body: `${c.subject} is missing evidence needed to submit the recovery claim.`,
      target_href: `/recoveries/${uuid(`recovery:${c.key}`)}`,
      domain_event_id: null,
      deduplication_key: `${SEED_PREFIX}:evidence:${c.key}`,
      read_at: null,
      created_at: daysAgoIso(1 + i, 11),
    });
  });
  rows.push({
    id: uuid('notif:daily-summary'),
    merchant_id: MERCHANT_ID,
    recipient_user_id: RECIPIENT_USER_ID,
    kind: 'daily_work_summary',
    title: 'Your daily work summary is ready',
    body: 'Review new payout cases, evidence deadlines, and recovery updates from the last 24 hours.',
    target_href: '/work',
    domain_event_id: null,
    deduplication_key: `${SEED_PREFIX}:daily-summary`,
    read_at: daysAgoIso(0, 8),
    created_at: daysAgoIso(0, 7),
  });
  return rows;
}

async function reset() {
  throw new Error('Reset is disabled because the case financial ledger is append-only. Re-run the idempotent seed or use --verify-only.');
}

async function upgradeBilling() {
  await checked(
    'merchant_subscriptions', 'update',
    supabase.from('merchant_subscriptions').update({
      plan_id: 'growth',
      status: 'active',
      current_period_start: daysAgoIso(12, 0),
      current_period_end: daysFromAnchorIso(18, 0),
      updated_at: daysAgoIso(0, 12),
    }).eq('merchant_id', MERCHANT_ID),
  );
  await checked(
    'merchant_credits', 'update',
    supabase.from('merchant_credits').update({
      monthly_credits_remaining: 3400,
      topup_credits_remaining: 500,
      cycle_reset_at: daysFromAnchorIso(18, 0),
      last_reset_at: daysAgoIso(12, 0),
      updated_at: daysAgoIso(0, 12),
    }).eq('merchant_id', MERCHANT_ID),
  );
  console.log('Upgraded billing to Growth plan with topped-up credits.');
}

async function seed() {
  await upsertRows('partners', buildPartnerRows());
  await upsertRows('partner_recovery_rules', buildPartnerRuleRows());
  await upsertRows('source_customers', buildCustomerRows());
  await upsertRows('source_orders', buildOrderRows());
  await upsertRows('source_fulfillments', buildFulfillmentRows());
  await upsertRows('source_refunds', buildRefundRows());
  await upsertRows('source_tickets', buildTicketRows());
  await upsertRows('support_payout_cases', buildCaseRows());
  await upsertRows('evidence_items', buildFeaturedEvidenceRows());
  await upsertRows('evidence_items', buildOperationalEvidenceRows());
  await upsertRows('source_returns', buildReturnRows());
  await upsertRows('claim_outcomes', buildOutcomeRows());
  await insertImmutableRows('claim_events', buildClaimEventRows());
  await upsertRows('loss_cases', buildLossRows());
  await upsertRows('recovery_cases', buildRecoveryRows());
  await upsertRows('work_tasks', buildWorkTaskRows());
  await insertImmutableRows('case_decisions', buildCanonicalDecisionRows());
  await insertImmutableRows('case_outcomes', buildCanonicalOutcomeRows());
  await insertImmutableRows('case_financial_entries', buildFinancialEntryRows());
  await upsertRows('case_financial_summaries', buildFinancialSummaryRows());
  await recomputeFeaturedCaseFinancialSummary();
  await upsertRows('evidence_links', buildFeaturedEvidenceLinkRows());
  await upsertRows('evidence_links', buildOperationalEvidenceLinkRows());
  await upsertRows('source_shipments', buildShipmentRows());
  await upsertRows('notifications', buildNotificationRows());
  await upgradeBilling();
}

async function readAll(table, columns, orderColumn = 'id') {
  const rows = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    let data;
    let error;
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      ({ data, error } = await supabase
        .from(table)
        .select(columns)
        .eq('merchant_id', MERCHANT_ID)
        .order(orderColumn)
        .range(offset, offset + pageSize - 1));
      if (!error) break;
      if (attempt < 4) await new Promise((resolve) => setTimeout(resolve, attempt * 750));
    }
    if (error) throw new Error(`${table} verification read failed: ${error.message || 'remote read failed'}`);
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) return rows;
  }
}

async function verifySeed() {
  const countFor = async (table) => {
    let count;
    let error;
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      ({ count, error } = await supabase
        .from(table)
        .select('id', { count: 'exact', head: true })
        .eq('merchant_id', MERCHANT_ID));
      if (!error) break;
      if (attempt < 4) await new Promise((resolve) => setTimeout(resolve, attempt * 750));
    }
    if (error) throw new Error(`${table} count verification failed: ${error.message || 'remote count failed'}`);
    return count ?? 0;
  };

  const [customerCount, orderCount, refundCount, returnCount, ticketCount, caseCount, recoveryCount, shipmentCount, fulfillmentCount, evidenceCount, customers, cases, evidenceRows, claimEvents, financialEntries, financialSummaries, connections] = await Promise.all([
    countFor('source_customers'),
    countFor('source_orders'),
    countFor('source_refunds'),
    countFor('source_returns'),
    countFor('source_tickets'),
    countFor('support_payout_cases'),
    countFor('recovery_cases'),
    countFor('source_shipments'),
    countFor('source_fulfillments'),
    countFor('evidence_items'),
    readAll('source_customers', 'id,orders_count,total_spent'),
    readAll('support_payout_cases', 'id,source_order_id,source_ticket_id,assigned_to'),
    readAll('evidence_items', 'id,claim_id'),
    readAll('claim_events', 'id,claim_id,event_type'),
    readAll('case_financial_entries', 'id,support_payout_case_id,currency,state'),
    readAll('case_financial_summaries', 'support_payout_case_id,requested_minor,exposed_minor,prevented_minor,recovered_minor,confirmed_loss_minor', 'support_payout_case_id'),
    supabase.from('merchant_integrations').select('provider_id,status,imported_record_count,last_error_code,last_error_message,last_error').eq('merchant_id', MERCHANT_ID),
  ]);
  if (connections.error) throw new Error(`merchant_integrations verification failed: ${connections.error.message}`);

  const expectedCounts = {
    source_customers: CUSTOMERS.length,
    source_orders: TOTAL_ORDER_COUNT,
    source_refunds: REFUND_PLANS.length,
    source_returns: RETURN_PLANS.length,
    source_tickets: CASE_PLANS.length,
    support_payout_cases: CASE_PLANS.length,
    recovery_cases: CASE_PLANS.filter((c) => c.recovery).length,
    source_shipments: buildShipmentRows().length,
    source_fulfillments: buildFulfillmentRows().length,
    evidence_items: buildFeaturedEvidenceRows().length + buildOperationalEvidenceRows().length,
  };
  const actualCounts = { source_customers: customerCount, source_orders: orderCount, source_refunds: refundCount, source_returns: returnCount, source_tickets: ticketCount, support_payout_cases: caseCount, recovery_cases: recoveryCount, source_shipments: shipmentCount, source_fulfillments: fulfillmentCount, evidence_items: evidenceCount };
  for (const [table, expected] of Object.entries(expectedCounts)) {
    if (actualCounts[table] !== expected) {
      throw new Error(`${table} count mismatch: expected ${expected}, got ${actualCounts[table]}`);
    }
  }

  const expectedCustomersById = new Map(
    CUSTOMERS.map((customer) => [uuid(`customer:${customer.key}`), ORDER_AGGREGATES.get(customer.key)]),
  );
  if (customers.length !== expectedCustomersById.size) {
    throw new Error(`Customer aggregate verification read ${customers.length} rows, expected ${expectedCustomersById.size}.`);
  }
  for (const customer of customers) {
    const aggregate = expectedCustomersById.get(customer.id);
    if (!aggregate) {
      throw new Error(`Unexpected seeded customer ${customer.id}.`);
    }
    if (Number(customer.orders_count) !== aggregate.count || Math.round(Number(customer.total_spent) * 100) !== aggregate.totalSpentMinor) {
      throw new Error(`Customer aggregate mismatch for ${customer.id}.`);
    }
  }

  const evidenceCaseIds = new Set(evidenceRows.map((row) => row.claim_id).filter(Boolean));
  const eventTypesByCase = new Map();
  for (const event of claimEvents) {
    const types = eventTypesByCase.get(event.claim_id) ?? new Set();
    types.add(event.event_type);
    eventTypesByCase.set(event.claim_id, types);
  }
  const stateKeysByCase = new Map();
  for (const entry of financialEntries) {
    const keys = stateKeysByCase.get(entry.support_payout_case_id) ?? new Set();
    keys.add(entry.state);
    stateKeysByCase.set(entry.support_payout_case_id, keys);
  }
  const summaryCaseIds = new Set(financialSummaries.map((row) => row.support_payout_case_id));
  for (const payoutCase of cases) {
    if (!payoutCase.source_order_id || !payoutCase.source_ticket_id) {
      throw new Error(`Case ${payoutCase.id} is missing a connected order or support ticket.`);
    }
    if (payoutCase.assigned_to !== RECIPIENT_USER_ID) {
      throw new Error(`Case ${payoutCase.id} is not assigned to the demo owner.`);
    }
    if (!evidenceCaseIds.has(payoutCase.id)) {
      throw new Error(`Case ${payoutCase.id} has no canonical evidence.`);
    }
    const eventTypes = eventTypesByCase.get(payoutCase.id) ?? new Set();
    for (const eventType of ['claim_created', 'claim_assigned', 'evidence_added']) {
      if (!eventTypes.has(eventType)) throw new Error(`Case ${payoutCase.id} has no ${eventType} timeline event.`);
    }
    if (!summaryCaseIds.has(payoutCase.id)) {
      throw new Error(`Case ${payoutCase.id} has no financial summary.`);
    }
    const stateKeys = stateKeysByCase.get(payoutCase.id) ?? new Set();
    for (const state of ['exposed', 'prevented', 'recovered']) {
      if (!stateKeys.has(state)) {
        throw new Error(`Case ${payoutCase.id} has no explicit ${state} ledger state.`);
      }
    }
  }

  const expectedConnections = new Map([
    ['shopify', { status: 'connected', imported_record_count: TOTAL_ORDER_COUNT }],
    ['gorgias', { status: 'connected', imported_record_count: CASE_PLANS.length }],
    ['shipbob', { status: 'connected', imported_record_count: buildShipmentRows().length }],
    ['ups', { status: 'connected', imported_record_count: CASE_PLANS.length }],
  ]);
  const connectionMap = new Map((connections.data ?? []).map((connection) => [connection.provider_id, connection]));
  for (const [provider, expected] of expectedConnections) {
    const actual = connectionMap.get(provider);
    if (!actual || actual.status !== expected.status || actual.imported_record_count !== expected.imported_record_count) {
      throw new Error(`Connection mismatch for ${provider}: expected ${JSON.stringify(expected)}.`);
    }
    if (actual.last_error_code || actual.last_error_message || actual.last_error) {
      throw new Error(`Connection ${provider} retained a stale error after the demo reseed.`);
    }
  }

  for (const [period, expected] of [
    ['current', OVERVIEW_CURRENT_TOTALS_MINOR],
    ['previous', OVERVIEW_PREVIOUS_TOTALS_MINOR],
  ]) {
    const caseIds = new Set(
      CASE_PLANS
        .filter((plan) => plan.key.startsWith(`overview-${period}-`))
        .map((plan) => uuid(`case:${plan.key}`)),
    );
    const totals = financialSummaries
      .filter((row) => caseIds.has(row.support_payout_case_id))
      .reduce((sum, row) => ({
        identified: sum.identified + Number(row.exposed_minor ?? 0),
        prevented: sum.prevented + Number(row.prevented_minor ?? 0),
        recovered: sum.recovered + Number(row.recovered_minor ?? 0),
        realised: sum.realised + Number(row.confirmed_loss_minor ?? 0),
      }), { identified: 0, prevented: 0, recovered: 0, realised: 0 });
    const open = totals.identified - totals.prevented - totals.recovered - totals.realised;
    if (
      totals.identified !== expected.identified
      || totals.prevented !== expected.prevented
      || totals.recovered !== expected.recovered
      || totals.realised !== expected.realised
      || open !== expected.open
    ) {
      throw new Error(`${period} Overview financial profile does not reconcile: ${JSON.stringify({ ...totals, open })}.`);
    }
  }

  const featuredPlan = CASE_PLANS.find((plan) => plan.archetypeKey === FEATURED_CASE_TAG);
  if (featuredPlan) {
    const featuredCaseId = uuid(`case:${featuredPlan.key}`);
    const { data: featuredCases, error: featuredCaseError } = await supabase
      .from('support_payout_cases')
      .select('id,status,claim_type,amount_at_risk,currency,requested_action,recommended_rule_name,payout_decision_state,source_order_id,source_ticket_id')
      .eq('merchant_id', MERCHANT_ID)
      .contains('detection_detail', { fixture_tag: FEATURED_CASE_TAG });
    if (featuredCaseError) throw new Error(`featured case lookup failed: ${featuredCaseError.message}`);
    if ((featuredCases ?? []).length !== 1 || featuredCases?.[0]?.id !== featuredCaseId) {
      throw new Error(`Expected exactly one ${FEATURED_CASE_TAG} case.`);
    }
    const featuredCase = featuredCases[0];
    const [order, ticket, fulfillment, evidence, recovery, entries, summary, decisions, outcomes, legacyOutcomes, refunds] = await Promise.all([
      supabase.from('source_orders').select('order_number,total_price,currency,source_customer:source_customers(first_name,last_name)').eq('merchant_id', MERCHANT_ID).eq('id', featuredCase.source_order_id).single(),
      supabase.from('source_tickets').select('external_id,status').eq('merchant_id', MERCHANT_ID).eq('id', featuredCase.source_ticket_id).single(),
      supabase.from('source_fulfillments').select('status,shipment_status,tracking_company,tracking_number').eq('merchant_id', MERCHANT_ID).eq('source_order_id', featuredCase.source_order_id).single(),
      supabase.from('evidence_items').select('id,evidence_type,source_metadata').eq('merchant_id', MERCHANT_ID).eq('claim_id', featuredCaseId).contains('source_metadata', { fixture_tag: FEATURED_CASE_TAG }),
      supabase.from('recovery_cases').select('status,deadline_at,amount_recovered,partner:partners(name)').eq('merchant_id', MERCHANT_ID).eq('support_payout_case_id', featuredCaseId).single(),
      supabase.from('case_financial_entries').select('state,amount_minor').eq('merchant_id', MERCHANT_ID).eq('support_payout_case_id', featuredCaseId),
      supabase.from('case_financial_summaries').select('requested_minor,exposed_minor,prevented_minor,recovered_minor,confirmed_loss_minor').eq('merchant_id', MERCHANT_ID).eq('support_payout_case_id', featuredCaseId).single(),
      supabase.from('case_decisions').select('id', { count: 'exact' }).eq('merchant_id', MERCHANT_ID).eq('support_payout_case_id', featuredCaseId),
      supabase.from('case_outcomes').select('id', { count: 'exact' }).eq('merchant_id', MERCHANT_ID).eq('support_payout_case_id', featuredCaseId),
      supabase.from('claim_outcomes').select('id', { count: 'exact' }).eq('claim_id', featuredCaseId),
      supabase.from('source_refunds').select('id', { count: 'exact' }).eq('merchant_id', MERCHANT_ID).eq('source_order_id', featuredCase.source_order_id),
    ]);
    for (const [label, result] of Object.entries({ order, ticket, fulfillment, evidence, recovery, entries, summary, decisions, outcomes, legacyOutcomes, refunds })) {
      if (result.error) throw new Error(`featured ${label} verification failed: ${result.error.message}`);
    }
    const customer = Array.isArray(order.data.source_customer) ? order.data.source_customer[0] : order.data.source_customer;
    if (featuredCase.status !== 'evidence_needed' || featuredCase.claim_type !== 'item_not_received' || Number(featuredCase.amount_at_risk) !== 128 || featuredCase.currency !== 'GBP' || featuredCase.requested_action !== 'refund') {
      throw new Error('Featured case operational facts drifted.');
    }
    if (featuredCase.recommended_rule_name !== 'Missing delivery evidence' || featuredCase.payout_decision_state !== 'undecided') {
      throw new Error('Featured case rule or merchant-decision state drifted.');
    }
    if (order.data.order_number !== 'ALG-10482' || Number(order.data.total_price) !== 128 || customer?.first_name !== 'Maya' || customer?.last_name !== 'Chen') {
      throw new Error('Featured order or customer identity drifted.');
    }
    if (ticket.data.external_id !== 'TKT-4821' || fulfillment.data.tracking_company !== 'Northline Parcel' || fulfillment.data.status !== 'delivered') {
      throw new Error('Featured ticket or delivery facts drifted.');
    }
    if ((evidence.data ?? []).length !== 1 || evidence.data?.[0]?.evidence_type !== 'support_ticket') {
      throw new Error('Featured case must have exactly one customer-statement evidence row and no proof of delivery.');
    }
    const recoveryPartner = Array.isArray(recovery.data.partner) ? recovery.data.partner[0] : recovery.data.partner;
    if (recovery.data.status !== 'evidence_needed' || recovery.data.amount_recovered !== null || recoveryPartner?.name !== 'Northline Parcel' || Date.parse(recovery.data.deadline_at) <= Date.now()) {
      throw new Error('Featured recovery route or deadline drifted.');
    }
    const ledger = new Map((entries.data ?? []).map((entry) => [entry.state, Number(entry.amount_minor)]));
    if (ledger.get('requested') !== 12_800 || ledger.get('exposed') !== 12_800 || ledger.get('prevented') !== 0 || ledger.get('recovered') !== 0) {
      throw new Error('Featured canonical ledger states do not reconcile to £128 open exposure.');
    }
    if (Number(summary.data.requested_minor) !== 12_800 || Number(summary.data.exposed_minor) !== 12_800 || Number(summary.data.prevented_minor) !== 0 || Number(summary.data.recovered_minor) !== 0 || Number(summary.data.confirmed_loss_minor) !== 0) {
      throw new Error('Featured financial summary was not recomputed from explicit canonical ledger states.');
    }
    if ((decisions.count ?? 0) !== 0 || (outcomes.count ?? 0) !== 0 || (legacyOutcomes.count ?? 0) !== 0 || (refunds.count ?? 0) !== 0) {
      throw new Error('Featured case must not contain a merchant decision, outcome, refund or reship action.');
    }
    console.log(`Verified featured landing case ${featuredCaseId}: £128 open, evidence input intentionally incomplete, no merchant decision or external payout action.`);
  }

  console.log(`Verified reconciliation: ${customerCount} customers, ${orderCount} orders, GBP ${(TOTAL_GMV_MINOR / 100).toFixed(2)} merchandise value, ${refundCount} refunds, ${returnCount} returns, ${caseCount} owner-assigned cases with linked order, ticket, fulfilment, evidence, timeline and explicit financial states, both 30-day Overview profiles, ${connections.data?.length ?? 0} connected source rows.`);
}

(async () => {
  try {
    const { data: merchant, error } = await supabase.from('merchants').select('id,name').eq('id', MERCHANT_ID).maybeSingle();
    if (error) throw error;
    if (!merchant) throw new Error(`Merchant ${MERCHANT_ID} not found`);
    console.log(`Target merchant: ${merchant.name} (${merchant.id})`);

    if (VERIFY_ONLY) {
      await verifySeed();
      console.log('Verification-only run complete.');
      return;
    }

    if (RESET_ONLY) {
      await reset();
      console.log('Reset-only run complete (no new rows inserted).');
      return;
    }

    await seed();
    await verifySeed();

    const [{ count: customerCount }, { count: orderCount }, { count: refundCount }, { count: returnCount }, { count: ticketCount }, { count: caseCount }, { count: recoveryCount }, { count: notifCount }] = await Promise.all([
      supabase.from('source_customers').select('id', { count: 'exact', head: true }).eq('merchant_id', MERCHANT_ID),
      supabase.from('source_orders').select('id', { count: 'exact', head: true }).eq('merchant_id', MERCHANT_ID),
      supabase.from('source_refunds').select('id', { count: 'exact', head: true }).eq('merchant_id', MERCHANT_ID),
      supabase.from('source_returns').select('id', { count: 'exact', head: true }).eq('merchant_id', MERCHANT_ID),
      supabase.from('source_tickets').select('id', { count: 'exact', head: true }).eq('merchant_id', MERCHANT_ID),
      supabase.from('support_payout_cases').select('id', { count: 'exact', head: true }).eq('merchant_id', MERCHANT_ID),
      supabase.from('recovery_cases').select('id', { count: 'exact', head: true }).eq('merchant_id', MERCHANT_ID),
      supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('merchant_id', MERCHANT_ID),
    ]);
    console.log(
      `Done. ${customerCount ?? 0} customers, ${orderCount ?? 0} orders, ${refundCount ?? 0} refunds, ${returnCount ?? 0} returns, ${ticketCount ?? 0} tickets, ${caseCount ?? 0} payout cases, ${recoveryCount ?? 0} recovery cases, ${notifCount ?? 0} notifications.`,
    );
  } catch (err) {
    console.error('Seed failed:', err?.message ?? err);
    process.exit(1);
  }
})();
