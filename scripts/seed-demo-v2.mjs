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
const ANCHOR = new Date('2026-06-20T12:00:00.000Z');

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
    ticketDaysAgo: 4,
    fulfillmentState: 'delivered',
    reason: 'Tracking shows delivered but customer says the parcel never arrived.',
    subject: 'Delivered order not received',
    lossAttribution: 'failed_delivery_evidence',
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
    ticketDaysAgo: 3,
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
    orderDaysAgo: 21,
    ticketDaysAgo: 2,
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
    ticketDaysAgo: 6,
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
    orderDaysAgo: 31,
    ticketDaysAgo: 5,
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
    ticketDaysAgo: 1,
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
    ticketDaysAgo: 7,
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
    ticketDaysAgo: 2,
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
    orderDaysAgo: 19,
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
    ticketDaysAgo: 42,
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
    ticketDaysAgo: 55,
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
    ticketDaysAgo: 51,
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
    ticketDaysAgo: 1,
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
    ticketDaysAgo: 2,
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
    orderDaysAgo: 10,
    ticketDaysAgo: 1,
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
  await checked(
    'source_tickets',
    'delete',
    supabase.from('source_tickets').delete().eq('merchant_id', merchantId).like('external_id', `${SEED_PREFIX}-%`),
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
      placed_at: daysAgoIso(casePlan.orderDaysAgo, 11),
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
      external_id: `${SEED_PREFIX}-ticket-${casePlan.key}`,
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
      linked_order_external_ids: [orderNumber, `${SEED_PREFIX}-order-${casePlan.key}`],
      opened_at_provider: daysAgoIso(casePlan.ticketDaysAgo, 12),
      closed_at_provider: casePlan.status.startsWith('resolved_') ? daysAgoIso(Math.max(1, casePlan.ticketDaysAgo - 4), 14) : null,
      created_at_provider: daysAgoIso(casePlan.ticketDaysAgo, 12),
      updated_at_provider: daysAgoIso(casePlan.status.startsWith('resolved_') ? 9 : 1, 15),
      raw_payload_hash: sha(`ticket:${casePlan.key}`),
      ingested_at: daysAgoIso(0, 8),
      updated_at: daysAgoIso(1, 8),
    };
  });
}

function buildCaseRows(merchantId) {
  return CASES.map((casePlan, index) => {
    const submittedDaysAgo = casePlan.status.startsWith('resolved_')
      ? Math.max(12, casePlan.ticketDaysAgo)
      : casePlan.ticketDaysAgo;
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
      first_viewed_at: index % 4 === 0 ? null : daysAgoIso(1, 11),
      submitted_at: daysAgoIso(submittedDaysAgo, 12),
      created_at: daysAgoIso(submittedDaysAgo, 12),
      updated_at: daysAgoIso(resolved ? 9 : 1, 15),
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
    decided_at: daysAgoIso(8, 15),
    updated_at: daysAgoIso(8, 15),
  }));
}

function buildRecoveryRows(merchantId) {
  return CASES.filter((casePlan) => casePlan.recovery).map((casePlan) => {
    const recovery = casePlan.recovery;
    const missingEvidence = recovery.status === 'evidence_needed' ? casePlan.requiredEvidence.slice(0, 2) : [];
    return {
      id: uuid(`recovery:${casePlan.key}`),
      merchant_id: merchantId,
      support_payout_case_id: uuid(`case:${casePlan.key}`),
      partner_id: null,
      recovery_type: recovery.type,
      owner_type: recovery.owner,
      status: recovery.status,
      merchant_loss_amount: casePlan.amount,
      eligible_loss_amount: casePlan.amount,
      estimated_recoverable_min: recovery.min,
      estimated_recoverable_max: recovery.max,
      amount_recovered: recovery.recovered ?? null,
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
      created_at: daysAgoIso(casePlan.ticketDaysAgo, 13),
      updated_at: daysAgoIso(1, 14),
    };
  });
}

async function insertRows(table, rows) {
  if (rows.length === 0) return;
  await checked(table, 'insert', supabase.from(table).insert(rows));
  console.log(`Inserted ${rows.length} ${table} rows.`);
}

async function seed(merchantId) {
  await insertRows('source_customers', buildCustomerRows(merchantId));
  await insertRows('source_orders', buildOrderRows(merchantId));
  await insertRows('source_tickets', buildTicketRows(merchantId));
  await insertRows('support_payout_cases', buildCaseRows(merchantId));
  await insertRows('claim_outcomes', buildOutcomeRows());
  await insertRows('recovery_cases', buildRecoveryRows(merchantId));
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
      supabase.from('source_tickets').select('id', { count: 'exact', head: true }).eq('merchant_id', merchantId).like('external_id', `${SEED_PREFIX}-%`),
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
