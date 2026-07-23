/**
 * Canonical merchant demo seeder.
 *
 * Seeds Elara & Co Apparel with deterministic sample data in the v2 read-model
 * tables the product actually uses. It does not create store/helpdesk
 * connection rows, so the workspace remains honestly labelled as sample data
 * with disconnected integrations.
 *
 * Usage:
 *   node scripts/seed-demo-v2.mjs
 *   node scripts/seed-demo-v2.mjs --reset
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

const SEED_TAG = 'demo-v2';
const SEED_NOTE = `[seed:${SEED_TAG}]`;
const SEED_PREFIX = 'seed-demo-v2';
const RESET_ONLY = process.argv.includes('--reset');
// Anchor to "now" so case ageing always looks live; ids stay deterministic.
const ANCHOR = new Date();
ANCHOR.setUTCMinutes(0, 0, 0);
// Helpdesk-style numeric ticket ids: sequential 5-digit numbers derived from
// the case's stable position in CASES, so re-seeding is idempotent.
const TICKET_ID_BASE = 84213;

const CUSTOMERS = [
  { key: 'maya', first: 'Maya', last: 'Chen', email: 'maya.chen@elara-demo.test', phone: '+447700900101', accountAgeDays: 420 },
  { key: 'jonas', first: 'Jonas', last: 'Reed', email: 'jonas.reed@elara-demo.test', phone: '+447700900102', accountAgeDays: 310 },
  { key: 'leah', first: 'Leah', last: 'Patel', email: 'leah.patel@elara-demo.test', phone: '+447700900103', accountAgeDays: 260 },
  { key: 'omar', first: 'Omar', last: 'Hughes', email: 'omar.hughes@elara-demo.test', phone: '+447700900104', accountAgeDays: 190 },
  { key: 'zara', first: 'Zara', last: 'Morgan', email: 'zara.morgan@elara-demo.test', phone: '+447700900105', accountAgeDays: 145 },
  { key: 'nina', first: 'Nina', last: 'Wallace', email: 'nina.wallace@elara-demo.test', phone: '+447700900106', accountAgeDays: 120 },
  { key: 'felix', first: 'Felix', last: 'Stone', email: 'felix.stone@elara-demo.test', phone: '+447700900107', accountAgeDays: 96 },
  { key: 'imani', first: 'Imani', last: 'Cole', email: 'imani.cole@elara-demo.test', phone: '+447700900108', accountAgeDays: 72 },
];

const CASES = [
  {
    key: 'carrier-proof',
    customer: 'maya',
    claimType: 'item_not_received',
    status: 'awaiting_carrier_response',
    requestedAction: 'refund',
    amount: 118.4,
    orderDaysAgo: 39,
    ticketDaysAgo: 23,
    fulfillmentState: 'delivered',
    reason: 'Tracking shows delivered but customer says the parcel never arrived.',
    subject: 'Delivered order not received',
    lossAttribution: 'delivery_confirmed_evidence',
    confidence: 'needs_more_evidence',
    recoverability: 'needs_more_evidence',
    recoveryOwner: 'carrier',
    requiredEvidence: ['proof_of_delivery', 'carrier_scan_history'],
    recoveryNextAction: 'Request proof of delivery and delivery GPS from carrier.',
    nextAction: 'Ask carrier for proof before approving refund.',
    nextActionReason: 'The order is marked delivered but carrier evidence is incomplete.',
    recommendedAction: 'ask_for_evidence',
    ruleName: 'Delivered INR requires carrier proof',
    recovery: { type: 'carrier_claim', owner: 'carrier', status: 'evidence_needed', min: 45, max: 118.4 },
  },
  {
    key: 'damaged-photos',
    customer: 'jonas',
    claimType: 'damaged',
    status: 'evidence_needed',
    requestedAction: 'replacement',
    amount: 86.2,
    orderDaysAgo: 24,
    ticketDaysAgo: 16,
    fulfillmentState: 'delivered',
    reason: 'Customer reports cracked hardware on arrival and requested a replacement.',
    subject: 'Damaged item arrived',
    lossAttribution: 'carrier_damage',
    confidence: 'medium',
    recoverability: 'possibly_recoverable',
    recoveryOwner: 'carrier',
    requiredEvidence: ['customer_photo', 'packaging_photo'],
    recoveryNextAction: 'Collect customer photos and submit carrier damage claim.',
    nextAction: 'Collect photos before shipping replacement.',
    nextActionReason: 'Damage is plausible but the evidence pack is not complete.',
    recommendedAction: 'ask_for_evidence',
    ruleName: 'Damage claims need photo evidence',
    recovery: { type: 'carrier_claim', owner: 'carrier', status: 'ready_to_submit', min: 30, max: 86.2 },
  },
  {
    key: 'wrong-size',
    customer: 'leah',
    claimType: 'wrong_item',
    status: 'ready_for_decision',
    requestedAction: 'replacement',
    amount: 64.75,
    orderDaysAgo: 26,
    ticketDaysAgo: 19,
    fulfillmentState: 'delivered',
    reason: 'Customer ordered a medium jacket but received a small.',
    subject: 'Wrong size in parcel',
    lossAttribution: 'warehouse_mispick',
    confidence: 'high',
    recoverability: 'recoverable',
    recoveryOwner: 'warehouse',
    requiredEvidence: ['pick_pack_record', 'customer_photo'],
    recoveryNextAction: 'Open warehouse error case with pick-pack record.',
    nextAction: 'Approve replacement and recover internally from fulfilment error.',
    nextActionReason: 'Order and support evidence agree on a warehouse mispick.',
    recommendedAction: 'approve_replacement',
    ruleName: 'Warehouse mispick replacement',
    recovery: { type: 'warehouse_error', owner: 'warehouse', status: 'submitted', min: 32, max: 64.75 },
  },
  {
    key: 'policy-window',
    customer: 'omar',
    claimType: 'refund_request',
    status: 'manual_review',
    requestedAction: 'refund',
    amount: 142,
    orderDaysAgo: 68,
    ticketDaysAgo: 34,
    fulfillmentState: 'delivered',
    reason: 'Goodwill refund requested outside the published return window.',
    subject: 'Refund outside return window',
    lossAttribution: 'merchant_policy',
    confidence: 'medium',
    recoverability: 'not_recoverable',
    recoveryOwner: 'merchant',
    requiredEvidence: ['return_policy_snapshot'],
    recoveryNextAction: 'No partner recovery path; tighten return-window handling.',
    nextAction: 'Review policy exception before refunding.',
    nextActionReason: 'The case is a policy decision, not a recoverable partner loss.',
    recommendedAction: 'deny_under_policy',
    ruleName: 'Return window expired',
  },
  {
    key: 'chargeback-evidence',
    customer: 'zara',
    claimType: 'chargeback',
    status: 'manual_review',
    requestedAction: 'investigation',
    amount: 211.5,
    orderDaysAgo: 45,
    ticketDaysAgo: 27,
    fulfillmentState: 'delivered',
    reason: 'Issuer dispute opened after the customer received delivery updates.',
    subject: 'Chargeback opened for delivered order',
    lossAttribution: 'customer_claim',
    confidence: 'low',
    recoverability: 'possibly_recoverable',
    recoveryOwner: 'merchant',
    requiredEvidence: ['order_confirmation', 'delivery_scan', 'support_thread'],
    recoveryNextAction: 'Compile evidence pack for payment dispute provider.',
    nextAction: 'Assemble chargeback evidence before response deadline.',
    nextActionReason: 'The merchant can dispute if delivery and support evidence are complete.',
    recommendedAction: 'prepare_chargeback_evidence',
    ruleName: 'Delivered chargeback evidence pack',
    recovery: { type: 'chargeback_evidence', owner: 'payment_dispute_provider', status: 'chase_due', min: 90, max: 211.5 },
  },
  {
    key: 'repeat-return',
    customer: 'maya',
    claimType: 'return_abuse',
    status: 'escalated',
    requestedAction: 'refund',
    amount: 96.1,
    orderDaysAgo: 17,
    ticketDaysAgo: 6,
    fulfillmentState: 'delivered',
    reason: 'Repeated returnless refund requests across recent orders.',
    subject: 'Returnless refund request',
    lossAttribution: 'merchant_policy',
    confidence: 'medium',
    recoverability: 'not_recoverable',
    recoveryOwner: 'merchant',
    requiredEvidence: ['claim_history', 'return_policy_snapshot'],
    recoveryNextAction: 'No partner recovery path; review rule for repeat returnless refunds.',
    nextAction: 'Escalate for policy decision.',
    nextActionReason: 'The pattern is policy leakage rather than carrier or warehouse liability.',
    recommendedAction: 'manual_review',
    ruleName: 'Repeat returnless refund pattern',
  },
  {
    key: 'supplier-defect',
    customer: 'nina',
    claimType: 'damaged',
    status: 'recovery_opened',
    requestedAction: 'refund',
    amount: 73.3,
    orderDaysAgo: 46,
    ticketDaysAgo: 38,
    fulfillmentState: 'delivered',
    reason: 'Customer reports stitching failed after first wear.',
    subject: 'Product defect after first wear',
    lossAttribution: 'supplier_defect',
    confidence: 'medium',
    recoverability: 'recoverable',
    recoveryOwner: 'supplier',
    requiredEvidence: ['customer_photo', 'supplier_batch_code'],
    recoveryNextAction: 'Submit supplier defect claim with batch code.',
    nextAction: 'Refund customer and pursue supplier credit.',
    nextActionReason: 'The defect appears supplier-owned and recoverable.',
    recommendedAction: 'approve_refund_recover_supplier',
    ruleName: 'Supplier defect recovery',
    recovery: { type: 'supplier_defect', owner: 'supplier', status: 'waiting_response', min: 40, max: 73.3 },
  },
  {
    key: 'missing-item',
    customer: 'felix',
    claimType: 'wrong_item',
    status: 'awaiting_customer_evidence',
    requestedAction: 'refund',
    amount: 52,
    orderDaysAgo: 13,
    ticketDaysAgo: 9,
    fulfillmentState: 'delivered',
    reason: 'Customer says one item was missing from a multi-item order.',
    subject: 'One item missing from parcel',
    lossAttribution: 'warehouse_missing_item',
    confidence: 'needs_more_evidence',
    recoverability: 'possibly_recoverable',
    recoveryOwner: 'warehouse',
    requiredEvidence: ['packing_slip', 'customer_photo'],
    recoveryNextAction: 'Check packing slip and warehouse weight record.',
    nextAction: 'Request photo of received items and packing slip.',
    nextActionReason: 'The claim can be recovered internally if packing evidence confirms it.',
    recommendedAction: 'ask_for_evidence',
    ruleName: 'Missing item requires packing evidence',
    recovery: { type: 'warehouse_error', owner: 'warehouse', status: 'evidence_needed', min: 20, max: 52 },
  },
  {
    key: 'late-dispatch',
    customer: 'imani',
    claimType: 'item_not_received',
    status: 'open',
    requestedAction: 'refund',
    amount: 89.99,
    orderDaysAgo: 12,
    ticketDaysAgo: 1,
    fulfillmentState: 'in_transit',
    reason: 'Order dispatched late by fulfilment partner and customer is asking for a refund.',
    subject: 'Order has not arrived',
    lossAttribution: 'three_pl_late_dispatch',
    confidence: 'medium',
    recoverability: 'recoverable',
    recoveryOwner: 'three_pl',
    requiredEvidence: ['dispatch_sla', 'carrier_scan_history'],
    recoveryNextAction: 'Open 3PL SLA recovery case.',
    nextAction: 'Offer replacement or wait for delivery based on SLA.',
    nextActionReason: 'The delay is likely fulfilment-owned and recoverable.',
    recommendedAction: 'offer_replacement',
    ruleName: '3PL late dispatch recovery',
    recovery: { type: 'three_pl_claim', owner: 'three_pl', status: 'ready_to_submit', min: 35, max: 89.99 },
  },
  {
    key: 'packaging-failure',
    customer: 'jonas',
    claimType: 'damaged',
    status: 'ready_for_decision',
    requestedAction: 'discount',
    amount: 34.4,
    orderDaysAgo: 11,
    ticketDaysAgo: 1,
    fulfillmentState: 'delivered',
    reason: 'Low-value accessory arrived scuffed after poor packaging.',
    subject: 'Accessory arrived scuffed',
    lossAttribution: 'packaging_failure',
    confidence: 'medium',
    recoverability: 'possibly_recoverable',
    recoveryOwner: 'warehouse',
    requiredEvidence: ['customer_photo', 'packaging_photo'],
    recoveryNextAction: 'Track packaging failure for warehouse QA.',
    nextAction: 'Offer partial discount and log packaging issue.',
    nextActionReason: 'A discount limits payout exposure while preserving the recovery signal.',
    recommendedAction: 'offer_discount',
    ruleName: 'Low-value damaged accessory',
  },
  {
    key: 'refund-approved',
    customer: 'leah',
    claimType: 'item_not_received',
    status: 'resolved_refunded',
    requestedAction: 'refund',
    amount: 58.25,
    orderDaysAgo: 77,
    ticketDaysAgo: 45,
    fulfillmentState: 'delivered',
    reason: 'Carrier confirmed loss after depot scan; refund issued.',
    subject: 'Lost parcel refund',
    lossAttribution: 'carrier_loss',
    confidence: 'high',
    recoverability: 'recoverable',
    recoveryOwner: 'carrier',
    requiredEvidence: ['carrier_loss_confirmation'],
    recoveryNextAction: 'Carrier claim paid.',
    nextAction: 'Closed after refund.',
    nextActionReason: 'Carrier loss was confirmed and refunded.',
    recommendedAction: 'approve_refund',
    ruleName: 'Confirmed carrier loss',
    outcome: { decision: 'approved', outcome: 'loss', amountRefunded: 58.25, followed: true },
    recovery: { type: 'carrier_claim', owner: 'carrier', status: 'paid', min: 58.25, max: 58.25, recovered: 58.25 },
  },
  {
    key: 'return-denied',
    customer: 'omar',
    claimType: 'return_abuse',
    status: 'resolved_denied',
    requestedAction: 'refund',
    amount: 131.2,
    orderDaysAgo: 92,
    ticketDaysAgo: 54,
    fulfillmentState: 'delivered',
    reason: 'Claim denied after return policy review and repeated refund pattern.',
    subject: 'Refund request denied',
    lossAttribution: 'merchant_policy',
    confidence: 'high',
    recoverability: 'not_recoverable',
    recoveryOwner: 'merchant',
    requiredEvidence: ['claim_history', 'policy_snapshot'],
    recoveryNextAction: 'No recovery case required.',
    nextAction: 'Closed after denial.',
    nextActionReason: 'Evidence supported denial under policy.',
    recommendedAction: 'deny_under_policy',
    ruleName: 'Repeat returnless refund pattern',
    outcome: { decision: 'denied', outcome: 'suspected_fraud', amountRefunded: 0, followed: true },
  },
  {
    key: 'wrong-item-resolved',
    customer: 'nina',
    claimType: 'wrong_item',
    status: 'resolved_exchanged',
    requestedAction: 'replacement',
    amount: 77.8,
    orderDaysAgo: 88,
    ticketDaysAgo: 50,
    fulfillmentState: 'delivered',
    reason: 'Wrong item confirmed and replacement shipped.',
    subject: 'Replacement shipped',
    lossAttribution: 'warehouse_mispick',
    confidence: 'high',
    recoverability: 'recoverable',
    recoveryOwner: 'warehouse',
    requiredEvidence: ['pick_pack_record'],
    recoveryNextAction: 'Warehouse QA case closed.',
    nextAction: 'Closed after exchange.',
    nextActionReason: 'Replacement resolved the payout case.',
    recommendedAction: 'approve_replacement',
    ruleName: 'Warehouse mispick replacement',
    outcome: { decision: 'approved', outcome: 'recovered', amountRefunded: 0, followed: true },
  },
  {
    key: 'customer-evidence',
    customer: 'zara',
    claimType: 'refund_request',
    status: 'pending',
    requestedAction: 'store_credit',
    amount: 44.9,
    orderDaysAgo: 8,
    ticketDaysAgo: 2,
    fulfillmentState: 'delivered',
    reason: 'Customer requested store credit after sizing concern.',
    subject: 'Store credit request',
    lossAttribution: 'customer_claim',
    confidence: 'low',
    recoverability: 'unknown',
    recoveryOwner: 'unknown',
    requiredEvidence: ['customer_reason'],
    recoveryNextAction: 'Confirm customer preference before decision.',
    nextAction: 'Clarify whether store credit is acceptable.',
    nextActionReason: 'A lower-cost resolution may prevent unnecessary refund leakage.',
    recommendedAction: 'offer_store_credit',
    ruleName: 'Sizing concern store credit',
  },
  {
    key: 'replacement-ready',
    customer: 'felix',
    claimType: 'damaged',
    status: 'ready_for_decision',
    requestedAction: 'replacement',
    amount: 119.99,
    orderDaysAgo: 15,
    ticketDaysAgo: 12,
    fulfillmentState: 'delivered',
    reason: 'Customer provided photo evidence of transit damage.',
    subject: 'Transit damage photo supplied',
    lossAttribution: 'carrier_damage',
    confidence: 'high',
    recoverability: 'recoverable',
    recoveryOwner: 'carrier',
    requiredEvidence: ['customer_photo', 'carrier_scan_history'],
    recoveryNextAction: 'Approve replacement and submit carrier claim.',
    nextAction: 'Approve replacement.',
    nextActionReason: 'Evidence is complete and carrier recovery is available.',
    recommendedAction: 'approve_replacement',
    ruleName: 'Carrier damage with complete evidence',
    recovery: { type: 'carrier_claim', owner: 'carrier', status: 'submitted', min: 70, max: 119.99 },
  },
  {
    key: 'supplier-credit',
    customer: 'imani',
    claimType: 'not_as_described',
    status: 'open',
    requestedAction: 'discount',
    amount: 67.45,
    orderDaysAgo: 37,
    ticketDaysAgo: 31,
    fulfillmentState: 'delivered',
    reason: 'Product colour differed from supplier listing and customer requested discount.',
    subject: 'Product colour not as described',
    lossAttribution: 'supplier_defect',
    confidence: 'medium',
    recoverability: 'possibly_recoverable',
    recoveryOwner: 'supplier',
    requiredEvidence: ['customer_photo', 'supplier_listing_snapshot'],
    recoveryNextAction: 'Collect listing screenshot and pursue supplier credit.',
    nextAction: 'Offer discount after confirming listing mismatch.',
    nextActionReason: 'Supplier evidence may support recovery while keeping customer resolution small.',
    recommendedAction: 'offer_discount',
    ruleName: 'Supplier listing mismatch',
    recovery: { type: 'supplier_defect', owner: 'supplier', status: 'draft', min: 20, max: 67.45 },
  },
];

const PARTNERS = [
  {
    key: 'royal-mail',
    name: 'Royal Mail',
    type: 'carrier',
    contactUrl: 'https://www.royalmail.com/claims',
    contactEmail: null,
    notes: 'Primary domestic carrier. Claims via business portal.',
  },
  {
    key: 'evri',
    name: 'Evri',
    type: 'carrier',
    contactUrl: 'https://www.evri.com/contact-us',
    contactEmail: null,
    notes: 'Secondary carrier for standard parcels.',
  },
  {
    key: 'bolt-fulfilment',
    name: 'Bolt Fulfilment',
    type: 'three_pl',
    contactUrl: null,
    contactEmail: 'claims@boltfulfilment.test',
    notes: 'Fulfilment partner. Pick/pack errors and dispatch SLA credits.',
  },
  {
    key: 'novia-textiles',
    name: 'Novia Textiles',
    type: 'supplier',
    contactUrl: null,
    contactEmail: 'accounts@noviatextiles.test',
    notes: 'Apparel supplier. Defect credits against batch codes.',
  },
];

const PARTNER_RULES = [
  {
    key: 'royal-mail-lost-parcel',
    partner: 'royal-mail',
    ruleName: 'Royal Mail lost parcel claim',
    recoveryType: 'carrier_claim',
    claimType: 'item_not_received',
    requiredEvidence: ['tracking_status', 'proof_of_dispatch', 'proof_of_value'],
    deadlineDays: 14,
    confidence: 'high',
    submissionMethod: 'portal',
    submissionUrl: 'https://www.royalmail.com/claims',
    claimableCosts: ['item_cost', 'outbound_postage'],
    excludedCosts: ['support_time'],
  },
  {
    key: 'royal-mail-damage',
    partner: 'royal-mail',
    ruleName: 'Royal Mail damage in transit',
    recoveryType: 'carrier_claim',
    claimType: 'damaged_item',
    requiredEvidence: ['customer_photo', 'packaging_photo', 'proof_of_value'],
    deadlineDays: 14,
    confidence: 'medium',
    submissionMethod: 'portal',
    submissionUrl: 'https://www.royalmail.com/claims',
    claimableCosts: ['item_cost'],
    excludedCosts: ['support_time'],
  },
  {
    key: 'evri-lost-parcel',
    partner: 'evri',
    ruleName: 'Evri lost parcel claim',
    recoveryType: 'carrier_claim',
    claimType: 'item_not_received',
    requiredEvidence: ['tracking_status', 'proof_of_dispatch', 'proof_of_value'],
    deadlineDays: 28,
    confidence: 'medium',
    submissionMethod: 'portal',
    submissionUrl: 'https://www.evri.com/contact-us',
    claimableCosts: ['item_cost', 'outbound_postage'],
    excludedCosts: ['support_time'],
  },
  {
    key: 'bolt-wrong-item',
    partner: 'bolt-fulfilment',
    ruleName: 'Bolt Fulfilment wrong-item pick error',
    recoveryType: 'three_pl_claim',
    claimType: 'wrong_item',
    requiredEvidence: ['customer_photo', 'pick_pack_record'],
    deadlineDays: 30,
    confidence: 'high',
    submissionMethod: 'email',
    submissionEmail: 'claims@boltfulfilment.test',
    claimableCosts: ['item_cost', 'reship_postage'],
    excludedCosts: ['support_time'],
  },
  {
    key: 'bolt-late-dispatch',
    partner: 'bolt-fulfilment',
    ruleName: 'Bolt Fulfilment late dispatch SLA credit',
    recoveryType: 'three_pl_claim',
    claimType: 'late_delivery',
    requiredEvidence: ['dispatch_sla', 'carrier_scan_history'],
    deadlineDays: 30,
    confidence: 'medium',
    submissionMethod: 'email',
    submissionEmail: 'claims@boltfulfilment.test',
    claimableCosts: ['shipping_cost', 'goodwill_credit'],
    excludedCosts: ['item_cost'],
  },
  {
    key: 'novia-defect-credit',
    partner: 'novia-textiles',
    ruleName: 'Novia Textiles defect credit',
    recoveryType: 'supplier_defect',
    claimType: 'damaged_item',
    requiredEvidence: ['customer_photo', 'supplier_batch_code'],
    deadlineDays: 60,
    confidence: 'medium',
    submissionMethod: 'email',
    submissionEmail: 'accounts@noviatextiles.test',
    claimableCosts: ['item_cost'],
    excludedCosts: ['support_time', 'outbound_postage'],
  },
];

function ticketExternalId(index) {
  return String(TICKET_ID_BASE + index);
}

function partnerIdForRecovery(casePlan) {
  const owner = casePlan.recovery?.owner;
  if (owner === 'carrier') {
    return uuid(`partner:${casePlan.key === 'damaged-photos' ? 'evri' : 'royal-mail'}`);
  }
  if (owner === 'three_pl') return uuid('partner:bolt-fulfilment');
  if (owner === 'supplier') return uuid('partner:novia-textiles');
  return null;
}

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

function customerByKey(key) {
  const customer = CUSTOMERS.find((c) => c.key === key);
  if (!customer) throw new Error(`Missing fixture customer ${key}`);
  return customer;
}

async function checked(table, operation, query) {
  const { error, data } = await query;
  if (error) throw new Error(`${table} ${operation} failed: ${error.message}`);
  return data;
}

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
  if (!RESET_ONLY) {
    // Normal runs upsert every row in place (deterministic ids) — no deletes
    // needed, and support_payout_cases cannot be deleted anyway because
    // claim_events is append-only and blocks the cascade.
    console.log('Skipping clear (rows are upserted in place).');
    return;
  }
  const seededCases = await checked(
    'support_payout_cases',
    'lookup',
    supabase
      .from('support_payout_cases')
      .select('id')
      .eq('merchant_id', merchantId)
      .eq('detection_detail->>seed', SEED_TAG),
  );
  const caseIds = (seededCases ?? []).map((row) => row.id);

  if (caseIds.length > 0) {
    await checked('work_tasks', 'delete', supabase.from('work_tasks').delete().in('support_payout_case_id', caseIds));
    await checked('loss_cases', 'delete', supabase.from('loss_cases').delete().in('support_payout_case_id', caseIds));
    await checked('recovery_cases', 'delete', supabase.from('recovery_cases').delete().in('support_payout_case_id', caseIds));
    await checked('claim_outcomes', 'delete', supabase.from('claim_outcomes').delete().in('claim_id', caseIds));
  }

  await checked(
    'support_payout_cases',
    'delete',
    supabase
      .from('support_payout_cases')
      .delete()
      .eq('merchant_id', merchantId)
      .eq('detection_detail->>seed', SEED_TAG),
  );
  // Legacy slug-style ticket ids from older seed versions.
  await checked(
    'source_tickets',
    'delete',
    supabase.from('source_tickets').delete().eq('merchant_id', merchantId).like('external_id', `${SEED_PREFIX}-%`),
  );
  // Current numeric helpdesk-style ticket ids (deterministic per case index).
  await checked(
    'source_tickets',
    'delete',
    supabase
      .from('source_tickets')
      .delete()
      .eq('merchant_id', merchantId)
      .eq('provider', 'gorgias')
      .in('external_id', CASES.map((_, index) => ticketExternalId(index))),
  );
  await checked(
    'source_orders',
    'delete',
    supabase.from('source_orders').delete().eq('merchant_id', merchantId).eq('note', SEED_NOTE),
  );
  await checked(
    'source_customers',
    'delete',
    supabase.from('source_customers').delete().eq('merchant_id', merchantId).eq('note', SEED_NOTE),
  );
  if (RESET_ONLY) {
    // Partners/rules are normally kept and upserted in place; only remove them
    // on an explicit reset (after seeded recovery cases referencing them are gone).
    await checked(
      'partner_recovery_rules',
      'delete',
      supabase
        .from('partner_recovery_rules')
        .delete()
        .eq('merchant_id', merchantId)
        .in('id', PARTNER_RULES.map((rule) => uuid(`partner-rule:${rule.key}`))),
    );
    await checked(
      'partners',
      'delete',
      supabase
        .from('partners')
        .delete()
        .eq('merchant_id', merchantId)
        .in('id', PARTNERS.map((partner) => uuid(`partner:${partner.key}`))),
    );
  }
  console.log('Cleared previously-seeded demo-v2 rows.');
}

function buildCustomerRows(merchantId) {
  return CUSTOMERS.map((customer) => {
    const cases = CASES.filter((c) => c.customer === customer.key);
    const totalSpent = cases.reduce((sum, c) => sum + c.amount, 0) + 240;
    return {
      id: uuid(`customer:${customer.key}`),
      merchant_id: merchantId,
      source: 'manual',
      external_id: `${SEED_PREFIX}-customer-${customer.key}`,
      email: customer.email,
      phone: customer.phone,
      first_name: customer.first,
      last_name: customer.last,
      verified_email: true,
      account_created_at: daysAgoIso(customer.accountAgeDays, 9),
      orders_count: cases.length + 3,
      total_spent: money(totalSpent),
      tags: ['sample_data', 'demo_v2'],
      note: SEED_NOTE,
      raw_metadata: { seed: SEED_TAG, sample_data: true },
      created_at: daysAgoIso(customer.accountAgeDays, 9),
      updated_at: daysAgoIso(1, 9),
    };
  });
}

function buildOrderRows(merchantId) {
  return CASES.map((casePlan, index) => {
    const customer = customerByKey(casePlan.customer);
    const externalId = `${SEED_PREFIX}-order-${casePlan.key}`;
    return {
      id: uuid(`order:${casePlan.key}`),
      merchant_id: merchantId,
      source: 'manual',
      connection_id: null,
      external_id: externalId,
      order_number: `ELARA-${String(7400 + index).padStart(5, '0')}`,
      source_customer_id: uuid(`customer:${customer.key}`),
      email: customer.email,
      phone: customer.phone,
      financial_status: casePlan.status.startsWith('resolved_refunded') ? 'refunded' : 'paid',
      fulfillment_state: casePlan.fulfillmentState,
      total_price: casePlan.amount,
      subtotal_price: casePlan.amount,
      total_discounts: 0,
      currency: 'GBP',
      discount_codes: [],
      payment_gateway: index % 3 === 0 ? 'visa' : index % 3 === 1 ? 'mastercard' : 'paypal',
      card_last4: index % 2 === 0 ? String(4100 + index).slice(-4) : null,
      browser_ip: null,
      user_agent: null,
      accept_language: 'en-GB',
      landing_site: null,
      referring_site: null,
      source_name: 'sample_demo',
      shipping_address_id: null,
      billing_address_id: null,
      line_items_count: 1 + (index % 3),
      note: SEED_NOTE,
      tags: ['sample_data', 'demo_v2', casePlan.claimType],
      placed_at: daysAgoIso(casePlan.orderDaysAgo, 8 + ((index + 3) % 9)),
      cancelled_at: null,
      cancel_reason: null,
      raw_payload_hash: sha(`order:${casePlan.key}`),
      ingested_at: daysAgoIso(0, 8),
      updated_at: daysAgoIso(1, 8),
    };
  });
}

function buildTicketRows(merchantId) {
  return CASES.map((casePlan, index) => {
    const customer = customerByKey(casePlan.customer);
    const orderNumber = `ELARA-${String(7400 + index).padStart(5, '0')}`;
    return {
      id: uuid(`ticket:${casePlan.key}`),
      merchant_id: merchantId,
      provider: 'gorgias',
      connection_id: null,
      external_id: ticketExternalId(index),
      external_url: null,
      source_customer_id: uuid(`customer:${customer.key}`),
      subject: casePlan.subject,
      status: casePlan.status.startsWith('resolved_') ? 'closed' : 'open',
      channel: 'email',
      tags: ['sample_data', 'payout_control', casePlan.claimType],
      is_spam: false,
      satisfaction_score: null,
      message_count: 2 + (index % 5),
      customer_reply_count: 1 + (index % 3),
      was_reopened: casePlan.status === 'escalated' || casePlan.status === 'manual_review',
      linked_order_external_ids: [orderNumber],
      opened_at_provider: daysAgoIso(casePlan.ticketDaysAgo, 9 + (index % 7)),
      closed_at_provider: casePlan.status.startsWith('resolved_') ? daysAgoIso(Math.max(1, casePlan.ticketDaysAgo - 4), 14) : null,
      created_at_provider: daysAgoIso(casePlan.ticketDaysAgo, 9 + (index % 7)),
      updated_at_provider: daysAgoIso(casePlan.status.startsWith('resolved_') ? Math.max(1, casePlan.ticketDaysAgo - 4) : 1, 15),
      raw_payload_hash: sha(`ticket:${casePlan.key}`),
      ingested_at: daysAgoIso(0, 8),
      updated_at: daysAgoIso(1, 8),
    };
  });
}

function buildCaseRows(merchantId) {
  return CASES.map((casePlan, index) => {
    const submittedDaysAgo = casePlan.ticketDaysAgo;
    const submittedHour = 9 + (index % 7);
    const resolved = casePlan.status.startsWith('resolved_') || casePlan.status === 'closed';
    return {
      id: uuid(`case:${casePlan.key}`),
      merchant_id: merchantId,
      source_ticket_id: uuid(`ticket:${casePlan.key}`),
      source_order_id: uuid(`order:${casePlan.key}`),
      identity_id: null,
      claim_type: casePlan.claimType,
      status: casePlan.status,
      detection_method: 'manual',
      detection_detail: {
        seed: SEED_TAG,
        sample_data: true,
        source: 'seed-demo-v2',
      },
      reason_raw: casePlan.reason,
      reason_normalized: casePlan.reason,
      amount_at_risk: casePlan.amount,
      currency: 'GBP',
      requires_review: casePlan.status === 'manual_review' || casePlan.status === 'escalated',
      refund_amount: casePlan.outcome?.amountRefunded ?? null,
      replacement_item_value: casePlan.requestedAction === 'replacement' ? casePlan.amount : null,
      replacement_shipping_cost: casePlan.requestedAction === 'replacement' ? 4.99 : null,
      discount_amount: casePlan.requestedAction === 'discount' ? Math.min(20, money(casePlan.amount * 0.25)) : null,
      store_credit_amount: casePlan.requestedAction === 'store_credit' ? casePlan.amount : null,
      estimated_support_cost: 6.5,
      total_estimated_loss: money(casePlan.amount + 6.5),
      requested_action: casePlan.requestedAction,
      loss_attribution: casePlan.lossAttribution,
      attribution_confidence: casePlan.confidence,
      recoverability: casePlan.recoverability,
      recovery_owner: casePlan.recoveryOwner,
      recovery_required_evidence: casePlan.requiredEvidence,
      recovery_next_action: casePlan.recoveryNextAction,
      recommended_payout_action: casePlan.recommendedAction,
      recommended_rule_name: casePlan.ruleName,
      recommended_rule_id: null,
      payout_decision_state: resolved ? 'decided' : 'undecided',
      recovery_state: casePlan.recovery ? (casePlan.recovery.status === 'paid' ? 'recovered' : 'open') : 'no_recovery_needed',
      next_action: casePlan.nextAction,
      next_action_reason: casePlan.nextActionReason,
      assigned_to: null,
      assigned_at: null,
      snoozed_until: index === 9 ? daysFromAnchorIso(2, 9) : null,
      first_viewed_at: index % 4 === 0 ? null : daysAgoIso(Math.max(0, submittedDaysAgo - 1), 11),
      submitted_at: daysAgoIso(submittedDaysAgo, submittedHour),
      created_at: daysAgoIso(submittedDaysAgo, submittedHour),
      updated_at: daysAgoIso(resolved ? Math.max(1, submittedDaysAgo - 6) : Math.min(1, submittedDaysAgo), 15),
    };
  });
}

function buildOutcomeRows() {
  return CASES.filter((casePlan) => casePlan.outcome).map((casePlan) => ({
    id: uuid(`outcome:${casePlan.key}`),
    claim_id: uuid(`case:${casePlan.key}`),
    decision: casePlan.outcome.decision,
    outcome: casePlan.outcome.outcome,
    amount_refunded: casePlan.outcome.amountRefunded,
    amount_recovered: casePlan.outcome.amountRecovered ?? null,
    notes: `Seeded sample outcome for ${casePlan.subject}.`,
    recommended_payout_action: casePlan.recommendedAction,
    followed_recommendation: casePlan.outcome.followed,
    decided_by: null,
    decided_at: daysAgoIso(Math.max(1, casePlan.ticketDaysAgo - 5), 15),
    updated_at: daysAgoIso(Math.max(1, casePlan.ticketDaysAgo - 5), 15),
  }));
}

function buildRecoveryRows(merchantId) {
  return CASES.filter((casePlan) => casePlan.recovery).map((casePlan) => {
    const recovery = casePlan.recovery;
    const amountSoughtMinor = Math.round(Math.max(recovery.max, recovery.recovered ?? 0) * 100);
    const amountRecoveredMinor = Math.round((recovery.recovered ?? 0) * 100);
    const amountApprovedMinor = ['approved', 'partially_approved', 'paid'].includes(recovery.status)
      ? amountSoughtMinor
      : 0;
    const amountWrittenOffMinor = recovery.status === 'closed_unrecoverable'
      ? Math.max(amountSoughtMinor - amountRecoveredMinor, 0)
      : 0;
    const missingEvidence = recovery.status === 'evidence_needed' ? casePlan.requiredEvidence.slice(0, 2) : [];
    return {
      id: uuid(`recovery:${casePlan.key}`),
      merchant_id: merchantId,
      support_payout_case_id: uuid(`case:${casePlan.key}`),
      loss_case_id: uuid(`loss:${casePlan.key}`),
      partner_id: partnerIdForRecovery(casePlan),
      recovery_type: recovery.type,
      owner_type: recovery.owner,
      status: recovery.status,
      merchant_loss_amount: casePlan.amount,
      eligible_loss_amount: casePlan.amount,
      estimated_recoverable_min: recovery.min,
      estimated_recoverable_max: recovery.max,
      amount_recovered: recovery.recovered ?? null,
      amount_sought_minor: amountSoughtMinor,
      amount_approved_minor: amountApprovedMinor,
      amount_recovered_minor: amountRecoveredMinor,
      amount_written_off_minor: amountWrittenOffMinor,
      currency: 'GBP',
      deadline_at: daysFromAnchorIso(recovery.status === 'chase_due' ? 1 : 14, 17),
      next_chase_at: recovery.status === 'chase_due' ? daysAgoIso(1, 9) : daysFromAnchorIso(4, 9),
      last_chased_at: recovery.status === 'waiting_response' ? daysAgoIso(3, 10) : null,
      evidence_required: casePlan.requiredEvidence,
      evidence_missing: missingEvidence,
      evidence_complete: missingEvidence.length === 0,
      rejection_reason: null,
      calculation_reason: [`Sample recovery route seeded for ${casePlan.lossAttribution}.`],
      excluded_costs: [],
      internal_owner_user_id: null,
      created_at: daysAgoIso(Math.max(0, casePlan.ticketDaysAgo - 1), 13),
      updated_at: daysAgoIso(Math.min(1, casePlan.ticketDaysAgo), 14),
    };
  });
}

function lossCategory(casePlan) {
  if (casePlan.claimType === 'chargeback') return 'chargeback_or_payment_dispute';
  if (casePlan.claimType === 'damaged') return 'damaged_goods';
  if (casePlan.claimType === 'wrong_item') return 'wrong_item_or_missing_item';
  if (casePlan.lossAttribution?.includes('supplier')) return 'supplier_or_vendor_issue';
  return 'delivery_loss';
}

function recoveryRoute(casePlan) {
  const type = casePlan.recovery?.type;
  if (type === 'carrier_claim') return 'carrier_claim';
  if (type === 'warehouse_error') return 'internal_fulfilment_issue';
  if (type === 'supplier_defect') return 'supplier_vendor_claim';
  if (type === 'chargeback_evidence') return 'chargeback_evidence_pack';
  return casePlan.recoverability === 'not_recoverable' ? 'not_recoverable' : 'needs_more_evidence';
}

function buildLossRows(merchantId) {
  return CASES.filter((c) => c.outcome || c.recovery).map((c) => ({
    id: uuid(`loss:${c.key}`), merchant_id: merchantId, support_payout_case_id: uuid(`case:${c.key}`),
    order_id: uuid(`order:${c.key}`), helpdesk_ticket_id: uuid(`ticket:${c.key}`), case_category: lossCategory(c),
    case_type: c.claimType, status: c.recovery ? 'collecting_evidence' : 'closed_unrecoverable',
    counterparty_type: c.recovery?.owner === 'carrier' ? 'carrier' : c.recovery?.owner === 'supplier' ? 'supplier' : c.recovery?.owner === 'warehouse' ? 'warehouse' : 'internal_team',
    recovery_route: recoveryRoute(c), source_confidence: c.confidence === 'high' ? 'source_verified' : 'partial_source_verified',
    order_value_minor: Math.round(c.amount * 100), refund_value_minor: Math.round((c.outcome?.amountRefunded ?? 0) * 100),
    estimated_recovery_minor: Math.round((c.recovery?.max ?? 0) * 100), approved_recovery_minor: Math.round((c.recovery?.recovered ?? 0) * 100),
    currency: 'GBP', attribution: c.lossAttribution, recoverability: c.recoverability, prevention_only: !c.outcome,
    financial_state: c.outcome ? 'confirmed' : 'estimated', evidence_completion_score: c.recovery?.status === 'evidence_needed' ? 50 : 100,
    missing_evidence_count: c.recovery?.status === 'evidence_needed' ? 2 : 0, financial_entry_ids: [], source_metadata: { seed: SEED_TAG, sample_data: true },
    created_at: daysAgoIso(Math.max(1, c.ticketDaysAgo - 2), 13), updated_at: daysAgoIso(1, 14),
  }));
}

function buildWorkTaskRows(merchantId) {
  return CASES.filter((c) => !c.status.startsWith('resolved_')).map((c, index) => ({
    id: uuid(`task:${c.key}`), merchant_id: merchantId, support_payout_case_id: uuid(`case:${c.key}`),
    loss_case_id: c.outcome || c.recovery ? uuid(`loss:${c.key}`) : null, recovery_case_id: c.recovery ? uuid(`recovery:${c.key}`) : null,
    title: c.nextAction, description: c.nextActionReason, status: 'open', priority: index < 3 ? 'high' : 'medium',
    due_at: index < 2 ? daysAgoIso(1, 16) : daysFromAnchorIso(2 + (index % 4), 16), owner_role: 'analyst', source: 'demo_seed',
    source_metadata: { seed: SEED_TAG, sample_data: true }, created_at: daysAgoIso(Math.max(1, c.ticketDaysAgo - 1), 14), updated_at: daysAgoIso(1, 14),
  }));
}

function buildCanonicalDecisionRows(merchantId) {
  return CASES.filter((c) => c.outcome).map((c) => ({ id: uuid(`canonical-decision:${c.key}`), merchant_id: merchantId,
    support_payout_case_id: uuid(`case:${c.key}`), decision: c.outcome.decision, action: c.requestedAction,
    amount_minor: Math.round((c.outcome.amountRefunded ?? 0) * 100), currency: 'GBP', actor_type: 'demo_seed',
    reason: `Sample merchant decision for ${c.subject}.`, recommendation_snapshot: { action: c.recommendedAction },
    rule_snapshot: { name: c.ruleName, version: 1 }, followed_recommendation: c.outcome.followed,
    idempotency_key: `${SEED_PREFIX}:decision:${c.key}`, effective_at: daysAgoIso(Math.max(1, c.ticketDaysAgo - 5), 15), recorded_at: daysAgoIso(Math.max(1, c.ticketDaysAgo - 5), 15) }));
}

function buildCanonicalOutcomeRows(merchantId) {
  return CASES.filter((c) => c.outcome).map((c) => ({ id: uuid(`canonical-outcome:${c.key}`), merchant_id: merchantId,
    support_payout_case_id: uuid(`case:${c.key}`), outcome_type: c.outcome.outcome,
    amount_minor: Math.round((c.outcome.amountRefunded ?? c.outcome.amountRecovered ?? 0) * 100), currency: 'GBP', actor_type: 'demo_seed',
    reason: `Sample operational outcome for ${c.subject}.`, metadata: { seed: SEED_TAG, sample_data: true },
    idempotency_key: `${SEED_PREFIX}:outcome:${c.key}`, effective_at: daysAgoIso(Math.max(1, c.ticketDaysAgo - 4), 16), recorded_at: daysAgoIso(Math.max(1, c.ticketDaysAgo - 4), 16) }));
}

function buildPartnerRows(merchantId) {
  return PARTNERS.map((partner, index) => ({
    id: uuid(`partner:${partner.key}`),
    merchant_id: merchantId,
    name: partner.name,
    partner_type: partner.type,
    status: 'active',
    contact_email: partner.contactEmail,
    contact_url: partner.contactUrl,
    external_reference: null,
    notes: `${partner.notes} ${SEED_NOTE}`,
    created_at: daysAgoIso(120 - index * 7, 10),
    updated_at: daysAgoIso(7, 10),
  }));
}

function buildPartnerRuleRows(merchantId) {
  return PARTNER_RULES.map((rule, index) => ({
    id: uuid(`partner-rule:${rule.key}`),
    merchant_id: merchantId,
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
    created_at: daysAgoIso(110 - index * 5, 11),
    updated_at: daysAgoIso(7, 11),
  }));
}

async function upsertRows(table, rows) {
  if (rows.length === 0) return;
  await checked(table, 'upsert', supabase.from(table).upsert(rows, { onConflict: 'id' }));
  console.log(`Upserted ${rows.length} ${table} rows.`);
}

async function insertRows(table, rows) {
  if (rows.length === 0) return;
  await checked(table, 'insert', supabase.from(table).insert(rows));
  console.log(`Inserted ${rows.length} ${table} rows.`);
}

async function insertImmutableRows(table, rows) {
  if (rows.length === 0) return;
  await checked(table, 'insert immutable', supabase.from(table).upsert(rows, { onConflict: 'id', ignoreDuplicates: true }));
  console.log(`Ensured ${rows.length} immutable ${table} rows.`);
}

async function seed(merchantId) {
  await upsertRows('partners', buildPartnerRows(merchantId));
  await upsertRows('partner_recovery_rules', buildPartnerRuleRows(merchantId));
  // All rows have deterministic ids, so re-seeding upserts in place. Deleting
  // support_payout_cases is impossible anyway: claim_events is append-only and
  // blocks the cascade.
  await upsertRows('source_customers', buildCustomerRows(merchantId));
  await upsertRows('source_orders', buildOrderRows(merchantId));
  await upsertRows('source_tickets', buildTicketRows(merchantId));
  await upsertRows('support_payout_cases', buildCaseRows(merchantId));
  await upsertRows('claim_outcomes', buildOutcomeRows());
  await upsertRows('loss_cases', buildLossRows(merchantId));
  await upsertRows('recovery_cases', buildRecoveryRows(merchantId));
  await upsertRows('work_tasks', buildWorkTaskRows(merchantId));
  await insertImmutableRows('case_decisions', buildCanonicalDecisionRows(merchantId));
  await insertImmutableRows('case_outcomes', buildCanonicalOutcomeRows(merchantId));
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
    const [{ count: orderCount }, { count: ticketCount }, { count: caseCount }, { count: recoveryCount }] = await Promise.all([
      supabase.from('source_orders').select('id', { count: 'exact', head: true }).eq('merchant_id', merchantId).eq('note', SEED_NOTE),
      supabase
        .from('source_tickets')
        .select('id', { count: 'exact', head: true })
        .eq('merchant_id', merchantId)
        .in('external_id', CASES.map((_, index) => ticketExternalId(index))),
      supabase
        .from('support_payout_cases')
        .select('id', { count: 'exact', head: true })
        .eq('merchant_id', merchantId)
        .eq('detection_detail->>seed', SEED_TAG),
      supabase.from('recovery_cases').select('id', { count: 'exact', head: true }).eq('merchant_id', merchantId),
    ]);
    console.log(
      `Done. Seeded sample rows: ${orderCount ?? 0} orders, ${ticketCount ?? 0} tickets, ${caseCount ?? 0} payout cases, ${recoveryCount ?? 0} total recovery cases.`,
    );
  } catch (err) {
    console.error('Seed failed:', err?.message ?? err);
    process.exit(1);
  }
})();
