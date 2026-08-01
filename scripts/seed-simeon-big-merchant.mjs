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
 *   node scripts/seed-simeon-big-merchant.mjs --reset
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
const CUSTOMER_EMAIL_DOMAIN = process.env.SEED_CUSTOMER_EMAIL_DOMAIN ?? 'simeon-demo.test';
const ORDER_NUMBER_PREFIX = process.env.SEED_ORDER_NUMBER_PREFIX ?? 'SMS';
const SOURCE_SYSTEM = process.env.SEED_SOURCE_SYSTEM ?? 'manual';
const SOURCE_NAME = process.env.SEED_SOURCE_NAME ?? 'sample_demo';
const SOURCE_LABEL = process.env.SEED_SOURCE_LABEL ?? 'seed-simeon-big-merchant';
const RECIPIENT_USER_ID = process.env.SEED_RECIPIENT_USER_ID ?? '31635553-bf6f-410d-8202-4bfd5019caeb';

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
    await checked(table, 'upsert', supabase.from(table).upsert(batch, { onConflict }));
  }
  console.log(`Upserted ${rows.length} ${table} rows.`);
}
async function insertImmutableRows(table, rows) {
  if (rows.length === 0) return;
  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500);
    await checked(table, 'insert immutable', supabase.from(table).upsert(batch, { onConflict: 'id', ignoreDuplicates: true }));
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

const CUSTOMER_COUNT = 56;
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

// Build the full case plan list (deterministic, spread over the last ~150 days).
const CASE_PLANS = [];
let globalIndex = 0;
for (const archetype of ARCHETYPES) {
  for (let i = 0; i < archetype.repeat; i += 1) {
    const variance = 0.8 + rand() * 0.5;
    const amount = money(archetype.baseAmount * variance);
    const orderDaysAgo = 4 + Math.floor(rand() * 165);
    const ticketDaysAgo = Math.max(1, orderDaysAgo - (2 + Math.floor(rand() * 20)));
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
          }
        : null,
      outcome: archetype.outcome
        ? {
            decision: archetype.outcome.decision,
            outcome: archetype.outcome.outcome,
            amountRefunded: money(amount * (archetype.outcome.amountRefundedRatio ?? 0)),
            followed: archetype.outcome.followed,
          }
        : null,
    });
    globalIndex += 1;
  }
}
console.log(`Built ${CASE_PLANS.length} case plans across ${CUSTOMERS.length} customers.`);

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
    const cases = CASE_PLANS.filter((c) => c.customer === customer.key);
    const totalSpent = cases.reduce((sum, c) => sum + c.amount, 0) + 120 + rand() * 400;
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
      orders_count: cases.length + 2 + Math.floor(rand() * 6),
      total_spent: money(totalSpent),
      tags: ['sample_data', SEED_TAG],
      note: SEED_NOTE,
      raw_metadata: { seed: SEED_TAG, sample_data: true },
      created_at: daysAgoIso(customer.accountAgeDays, 9),
      updated_at: daysAgoIso(1, 9),
    };
  });
}

function buildOrderRows() {
  return CASE_PLANS.map((c, index) => {
    const customer = customerByKey(c.customer);
    return {
      id: uuid(`order:${c.key}`),
      merchant_id: MERCHANT_ID,
      source: SOURCE_SYSTEM,
      connection_id: null,
      external_id: `${SEED_PREFIX}-order-${c.key}`,
      order_number: `${ORDER_NUMBER_PREFIX}-${String(48000 + index).padStart(6, '0')}`,
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
      tags: ['sample_data', SEED_TAG, c.claimType],
      placed_at: daysAgoIso(c.orderDaysAgo, 8 + ((index + 3) % 9)),
      cancelled_at: null,
      cancel_reason: null,
      raw_payload_hash: sha(`order:${c.key}`),
      ingested_at: daysAgoIso(0, 8),
      updated_at: daysAgoIso(1, 8),
    };
  });
}

function buildTicketRows() {
  return CASE_PLANS.map((c, index) => {
    const customer = customerByKey(c.customer);
    const orderNumber = `${ORDER_NUMBER_PREFIX}-${String(48000 + index).padStart(6, '0')}`;
    const resolved = c.status.startsWith('resolved_');
    return {
      id: uuid(`ticket:${c.key}`),
      merchant_id: MERCHANT_ID,
      provider: 'gorgias',
      connection_id: null,
      external_id: ticketExternalId(index),
      external_url: null,
      source_customer_id: uuid(`customer:${customer.key}`),
      subject: c.subject,
      status: resolved ? 'closed' : 'open',
      channel: index % 5 === 0 ? 'chat' : 'email',
      tags: ['sample_data', 'payout_control', c.claimType],
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
      detection_detail: { seed: SEED_TAG, sample_data: true, source: SOURCE_LABEL, archetype: c.archetypeKey },
      reason_raw: c.reason,
      reason_normalized: c.reason,
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
      assigned_to: null,
      assigned_at: null,
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
  return CASE_PLANS.filter((c) => c.outcome).map((c) => ({ id: uuid(`canonical-decision:${c.key}`), merchant_id: MERCHANT_ID,
    support_payout_case_id: uuid(`case:${c.key}`), decision: c.outcome.decision, action: c.requestedAction,
    amount_minor: Math.round((c.outcome.amountRefunded ?? 0) * 100), currency: 'GBP', actor_type: 'demo_seed',
    reason: `Sample merchant decision for ${c.subject}.`, recommendation_snapshot: { action: c.recommendedAction },
    rule_snapshot: { name: c.recommendedRuleName, version: 1 }, followed_recommendation: c.outcome.followed,
    idempotency_key: `${SEED_PREFIX}:decision:${c.key}`, effective_at: daysAgoIso(Math.max(1, c.ticketDaysAgo - 5), 15), recorded_at: daysAgoIso(Math.max(1, c.ticketDaysAgo - 5), 15) }));
}
function buildCanonicalOutcomeRows() {
  return CASE_PLANS.filter((c) => c.outcome).map((c) => ({ id: uuid(`canonical-outcome:${c.key}`), merchant_id: MERCHANT_ID,
    support_payout_case_id: uuid(`case:${c.key}`), outcome_type: c.outcome.outcome,
    amount_minor: Math.round((c.outcome.amountRefunded ?? c.recovery?.recovered ?? 0) * 100), currency: 'GBP', actor_type: 'demo_seed',
    reason: `Sample operational outcome for ${c.subject}.`, metadata: { seed: SEED_TAG, sample_data: true },
    idempotency_key: `${SEED_PREFIX}:outcome:${c.key}`, effective_at: daysAgoIso(Math.max(1, c.ticketDaysAgo - 4), 16), recorded_at: daysAgoIso(Math.max(1, c.ticketDaysAgo - 4), 16) }));
}

function buildFinancialEntryRows() {
  const rows = [];

  for (const c of CASE_PLANS) {
    const caseId = uuid(`case:${c.key}`);
    const resolved = c.status.startsWith('resolved_');
    const requested = Math.round(c.amount * 100);
    const approved = c.outcome && c.outcome.decision === 'approved' ? requested : 0;
    const paid = c.outcome?.amountRefunded ? Math.round(c.outcome.amountRefunded * 100) : 0;
    const recovered = c.recovery?.recovered ? Math.round(c.recovery.recovered * 100) : 0;
    const recoverable = c.recovery ? Math.round(c.recovery.max * 100) : 0;
    const prevented = c.recoverability === 'not_recoverable' && !c.outcome ? requested : 0;
    const effectiveAt = daysAgoIso(Math.max(1, c.ticketDaysAgo - 5), 16);
    const lossCaseId = c.outcome || c.recovery ? uuid(`loss:${c.key}`) : null;
    const recoveryCaseId = c.recovery ? uuid(`recovery:${c.key}`) : null;

    const addEntry = (state, amountMinor, options = {}) => {
      if (!amountMinor) return;
      rows.push({
        id: uuid(`financial-entry:${state}:${c.key}`),
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
        },
      });
    };

    addEntry('requested', requested);
    if (!resolved) {
      addEntry('exposed', requested);
      addEntry('estimated_loss', requested);
    }
    addEntry('approved', approved);
    addEntry('paid', paid, {
      direction: 'debit',
      ledgerKind: 'customer_concession',
      valuationBasis: 'payout_value',
    });
    addEntry('confirmed_loss', resolved ? paid : 0, {
      direction: 'debit',
      ledgerKind: 'merchant_economic_loss',
      valuationBasis: 'payout_value',
    });
    addEntry('recoverable', recoverable);
    addEntry('recovered', recovered, {
      direction: 'credit',
      ledgerKind: 'provider_recovery',
    });
    addEntry('prevented', prevented);
  }

  return rows;
}

function buildFinancialSummaryRows() {
  return CASE_PLANS.map((c) => {
    const requested = Math.round(c.amount * 100);
    const resolved = c.status.startsWith('resolved_');
    const approved = c.outcome && c.outcome.decision === 'approved' ? requested : 0;
    const paid = c.outcome?.amountRefunded ? Math.round(c.outcome.amountRefunded * 100) : 0;
    const recoveredMinor = c.recovery?.recovered ? Math.round(c.recovery.recovered * 100) : 0;
    const recoverableMinor = c.recovery ? Math.round(c.recovery.max * 100) : 0;
    return {
      merchant_id: MERCHANT_ID,
      support_payout_case_id: uuid(`case:${c.key}`),
      currency: 'GBP',
      requested_minor: requested,
      exposed_minor: resolved ? 0 : requested,
      approved_minor: approved,
      paid_minor: paid,
      estimated_loss_minor: resolved ? 0 : requested,
      confirmed_loss_minor: resolved ? paid : 0,
      recoverable_minor: recoverableMinor,
      recovered_minor: recoveredMinor,
      prevented_minor: c.recoverability === 'not_recoverable' && !c.outcome ? requested : 0,
      written_off_minor: 0,
      last_event_id: null,
      updated_at: daysAgoIso(1, 16),
    };
  });
}

function buildShipmentRows() {
  const carriers = { 'royal-mail': 'Royal Mail', evri: 'Evri', 'dpd-uk': 'DPD UK' };
  return CASE_PLANS.filter((c) => c.fulfillmentState === 'delivered').map((c) => {
    const carrierKey = c.partnerId ? Object.keys(carriers).find((k) => uuid(`partner:${k}`) === c.partnerId) : null;
    const carrierName = carrierKey ? carriers[carrierKey] : pick(['Royal Mail', 'Evri', 'DPD UK']);
    return {
      id: uuid(`shipment:${c.key}`),
      merchant_id: MERCHANT_ID,
      source_account_id: null,
      source_order_id: uuid(`order:${c.key}`),
      source_fulfillment_id: null,
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
    id: uuid('notif:sync-failure'),
    merchant_id: MERCHANT_ID,
    recipient_user_id: RECIPIENT_USER_ID,
    kind: 'sync_failure',
    title: 'shopify connection needs attention',
    body: 'The Shopify connection has not synced recently. Reconnect to keep orders up to date.',
    target_href: '/integrations/shopify',
    domain_event_id: null,
    deduplication_key: `${SEED_PREFIX}:sync-failure`,
    read_at: null,
    created_at: daysAgoIso(3, 8),
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
  console.log('Reset requested: deleting previously-seeded rows for this seed tag.');
  const seededCases = await checked(
    'support_payout_cases', 'lookup',
    supabase.from('support_payout_cases').select('id').eq('merchant_id', MERCHANT_ID).eq('detection_detail->>seed', SEED_TAG),
  );
  const caseIds = (seededCases ?? []).map((r) => r.id);
  if (caseIds.length > 0) {
    await checked('work_tasks', 'delete', supabase.from('work_tasks').delete().in('support_payout_case_id', caseIds));
    await checked('recovery_cases', 'delete', supabase.from('recovery_cases').delete().in('support_payout_case_id', caseIds));
    await checked('loss_cases', 'delete', supabase.from('loss_cases').delete().in('support_payout_case_id', caseIds));
    await checked('claim_outcomes', 'delete', supabase.from('claim_outcomes').delete().in('claim_id', caseIds));
    await checked('case_financial_summaries', 'delete', supabase.from('case_financial_summaries').delete().in('support_payout_case_id', caseIds));
  }
  await checked('notifications', 'delete', supabase.from('notifications').delete().eq('merchant_id', MERCHANT_ID).like('deduplication_key', `${SEED_PREFIX}:%`));
  await checked('support_payout_cases', 'delete', supabase.from('support_payout_cases').delete().eq('merchant_id', MERCHANT_ID).eq('detection_detail->>seed', SEED_TAG));
  await checked('source_tickets', 'delete', supabase.from('source_tickets').delete().eq('merchant_id', MERCHANT_ID).eq('provider', 'gorgias').gte('external_id', String(TICKET_ID_BASE)));
  await checked('source_orders', 'delete', supabase.from('source_orders').delete().eq('merchant_id', MERCHANT_ID).eq('note', SEED_NOTE));
  await checked('source_shipments', 'delete', supabase.from('source_shipments').delete().eq('merchant_id', MERCHANT_ID).like('external_id', `${SEED_PREFIX}-shipment-%`));
  await checked('source_customers', 'delete', supabase.from('source_customers').delete().eq('merchant_id', MERCHANT_ID).eq('note', SEED_NOTE));
  await checked('partner_recovery_rules', 'delete', supabase.from('partner_recovery_rules').delete().eq('merchant_id', MERCHANT_ID).in('id', PARTNER_RULES.map((r) => uuid(`partner-rule:${r.key}`))));
  await checked('partners', 'delete', supabase.from('partners').delete().eq('merchant_id', MERCHANT_ID).in('id', PARTNERS.map((p) => uuid(`partner:${p.key}`))));
  console.log('Reset complete.');
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
  await upsertRows('source_tickets', buildTicketRows());
  await upsertRows('support_payout_cases', buildCaseRows());
  await upsertRows('claim_outcomes', buildOutcomeRows());
  await upsertRows('loss_cases', buildLossRows());
  await upsertRows('recovery_cases', buildRecoveryRows());
  await upsertRows('work_tasks', buildWorkTaskRows());
  await insertImmutableRows('case_decisions', buildCanonicalDecisionRows());
  await insertImmutableRows('case_outcomes', buildCanonicalOutcomeRows());
  await insertImmutableRows('case_financial_entries', buildFinancialEntryRows());
  await upsertRows('case_financial_summaries', buildFinancialSummaryRows());
  await upsertRows('source_shipments', buildShipmentRows());
  await upsertRows('notifications', buildNotificationRows());
  await upgradeBilling();
}

(async () => {
  try {
    const { data: merchant, error } = await supabase.from('merchants').select('id,name').eq('id', MERCHANT_ID).maybeSingle();
    if (error) throw error;
    if (!merchant) throw new Error(`Merchant ${MERCHANT_ID} not found`);
    console.log(`Target merchant: ${merchant.name} (${merchant.id})`);

    if (RESET_ONLY) {
      await reset();
      console.log('Reset-only run complete (no new rows inserted).');
      return;
    }

    await seed();

    const [{ count: customerCount }, { count: orderCount }, { count: ticketCount }, { count: caseCount }, { count: recoveryCount }, { count: notifCount }] = await Promise.all([
      supabase.from('source_customers').select('id', { count: 'exact', head: true }).eq('merchant_id', MERCHANT_ID),
      supabase.from('source_orders').select('id', { count: 'exact', head: true }).eq('merchant_id', MERCHANT_ID),
      supabase.from('source_tickets').select('id', { count: 'exact', head: true }).eq('merchant_id', MERCHANT_ID),
      supabase.from('support_payout_cases').select('id', { count: 'exact', head: true }).eq('merchant_id', MERCHANT_ID),
      supabase.from('recovery_cases').select('id', { count: 'exact', head: true }).eq('merchant_id', MERCHANT_ID),
      supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('merchant_id', MERCHANT_ID),
    ]);
    console.log(
      `Done. ${customerCount ?? 0} customers, ${orderCount ?? 0} orders, ${ticketCount ?? 0} tickets, ${caseCount ?? 0} payout cases, ${recoveryCount ?? 0} recovery cases, ${notifCount ?? 0} notifications.`,
    );
  } catch (err) {
    console.error('Seed failed:', err?.message ?? err);
    process.exit(1);
  }
})();
