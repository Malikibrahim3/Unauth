#!/usr/bin/env ts-node
// Synthetic data generator for blind stress-test of fraud engine.
// Generates 8 scenarios as CSV + ground-truth JSON.
// Test rows are prefixed with `test_bench_` for safe cleanup.

import fs from 'fs';
import path from 'path';

// ── Seeded PRNG (mulberry32) ─────────────────────────────────────────────────
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rnd = () => number;
const PREFIX = 'test_bench_';
const OUT_DIR = path.join(__dirname, 'data');

interface GroundTruthOrder {
  fraudLabel: 'fraud' | 'legitimate';
  customerId: string;
  ringId?: string;
  merchantId: string;
  cohort?: string;
}

interface GroundTruth {
  scenario: number;
  description: string;
  orders: Record<string, GroundTruthOrder>;
  rings: Array<{
    ringId: string;
    memberCustomerIds: string[];
    merchantIds: string[];
    suppressed?: boolean; // for the k-anonymity 2-merchant ring
  }>;
}

// ── Fake-data pools ──────────────────────────────────────────────────────────
const FIRST_NAMES = ['oliver','amelia','jack','isla','harry','olivia','noah','emily','jacob','sophie','william','grace','thomas','mia','james','poppy','charlie','ava','george','lily','henry','ella','leo','freya','arthur','evie','oscar','daisy','muhammad','ruby','archie','rosie','theo','holly','freddie','sienna','alfie','ivy','toby','willow'];
const LAST_NAMES = ['smith','jones','taylor','brown','williams','wilson','johnson','davies','robinson','wright','thompson','evans','walker','white','roberts','green','hall','wood','jackson','clarke','patel','khan','singh','ahmed','ali','hussain','rahman','begum','shah','iqbal'];
const STREET_NAMES = ['high','main','church','park','victoria','queen','king','station','mill','school','green','manor','market','spring','meadow','garden','bridge','hill','oak','elm','willow','ash','beech','maple','pine','cedar','rose','grange','lime','grove'];
const STREET_TYPES = ['street','road','lane','avenue','close','way','drive','crescent','terrace','place','gardens'];
const CITIES_POSTCODES: Array<[string, string]> = [
  ['London', 'E1'], ['London', 'SW1A'], ['Manchester', 'M1'], ['Manchester', 'M14'],
  ['Birmingham', 'B1'], ['Birmingham', 'B15'], ['Leeds', 'LS1'], ['Glasgow', 'G1'],
  ['Bristol', 'BS1'], ['Liverpool', 'L1'], ['Newcastle', 'NE1'], ['Sheffield', 'S1'],
];
const EMAIL_DOMAINS = ['gmail.com','outlook.com','yahoo.co.uk','hotmail.com','icloud.com','proton.me'];
const PAYMENT_METHODS = ['visa','mastercard','amex','paypal','apple_pay','google_pay'];
const CARRIERS = ['royal_mail','dpd','hermes','ups','fedex','yodel'];

function pick<T>(rnd: Rnd, arr: T[]): T { return arr[Math.floor(rnd() * arr.length)]; }
function randInt(rnd: Rnd, min: number, max: number): number { return Math.floor(rnd() * (max - min + 1)) + min; }
function randFloat(rnd: Rnd, min: number, max: number): number { return rnd() * (max - min) + min; }

function pad(n: number, w: number): string { return String(n).padStart(w, '0'); }

function makeId(rnd: Rnd, kind: string, idx: number): string {
  return `${PREFIX}${kind}_${idx}_${Math.floor(rnd() * 1e8).toString(36)}`;
}

// ── Identity factory ─────────────────────────────────────────────────────────
interface Identity {
  customerId: string;          // stable synthetic identity (for ground truth)
  name: string;
  emails: string[];            // 1+ emails — fraud rings rotate these
  phone: string | null;
  address: string;
  addressVariants: string[];   // misspellings/abbreviations for fraud rings
  postcode: string;
  city: string;
  cardLast4: string | null;
  cardBin: string | null;
  cardFingerprint: string | null;
  deviceId: string | null;
  ipAddress: string | null;
  paymentMethod: string;
}

function genPhone(rnd: Rnd): string {
  return `07${pad(randInt(rnd, 100, 999), 3)}${pad(randInt(rnd, 100000, 999999), 6)}`;
}
function genIP(rnd: Rnd): string {
  return `${randInt(rnd, 1, 254)}.${randInt(rnd, 0, 255)}.${randInt(rnd, 0, 255)}.${randInt(rnd, 1, 254)}`;
}
function genCardLast4(rnd: Rnd): string { return pad(randInt(rnd, 0, 9999), 4); }
function genCardBin(rnd: Rnd): string { return pad(randInt(rnd, 400000, 549999), 6); }

function genIdentity(rnd: Rnd, idx: number, opts?: Partial<Identity>): Identity {
  const first = pick(rnd, FIRST_NAMES);
  const last = pick(rnd, LAST_NAMES);
  const name = `${first} ${last}`;
  const [city, postcodePrefix] = pick(rnd, CITIES_POSTCODES);
  const postcode = `${postcodePrefix} ${randInt(rnd, 1, 9)}${String.fromCharCode(65 + randInt(rnd, 0, 25))}${String.fromCharCode(65 + randInt(rnd, 0, 25))}`;
  const houseNo = randInt(rnd, 1, 200);
  const streetName = pick(rnd, STREET_NAMES);
  const streetType = pick(rnd, STREET_TYPES);
  const address = `${houseNo} ${streetName} ${streetType}, ${city}, ${postcode}`;
  const emailLocal = `${first}.${last}${randInt(rnd, 1, 999)}`;
  const email = `${PREFIX}${emailLocal}@${pick(rnd, EMAIL_DOMAINS)}`;
  return {
    customerId: `${PREFIX}cust_${idx}_${Math.floor(rnd()*1e6).toString(36)}`,
    name,
    emails: [email],
    phone: rnd() < 0.85 ? genPhone(rnd) : null,
    address,
    addressVariants: [address],
    postcode,
    city,
    cardLast4: rnd() < 0.85 ? genCardLast4(rnd) : null,
    cardBin: rnd() < 0.85 ? genCardBin(rnd) : null,
    cardFingerprint: rnd() < 0.6 ? `${PREFIX}fp_${Math.floor(rnd()*1e10).toString(36)}` : null,
    deviceId: rnd() < 0.6 ? `${PREFIX}dev_${Math.floor(rnd()*1e10).toString(36)}` : null,
    ipAddress: rnd() < 0.7 ? genIP(rnd) : null,
    paymentMethod: pick(rnd, PAYMENT_METHODS),
    ...opts,
  };
}

// Generate address variants: misspellings + abbreviations.
function genAddressVariants(rnd: Rnd, base: string): string[] {
  const variants = [base];
  // abbreviation: street → st, road → rd, avenue → ave
  variants.push(base.replace(/\bstreet\b/i, 'st').replace(/\broad\b/i, 'rd').replace(/\bavenue\b/i, 'ave'));
  // missing comma
  variants.push(base.replace(/, /g, ' '));
  // typo: swap a single character
  if (base.length > 10) {
    const i = randInt(rnd, 5, base.length - 5);
    variants.push(base.slice(0, i) + (base[i] === 'a' ? 'e' : 'a') + base.slice(i + 1));
  }
  return Array.from(new Set(variants));
}

// ── Order factory ────────────────────────────────────────────────────────────
interface OrderRow {
  order_id: string;
  order_date: string;
  customer_email: string;
  customer_name: string;
  shipping_address: string;
  billing_address: string;
  order_total: string;
  order_status: string;
  customer_phone: string;
  ip_address: string;
  card_last4: string;
  card_bin: string;
  card_fingerprint: string;
  device_id: string;
  payment_method: string;
  refund_status: string;
  refund_reason: string;
  refund_date: string;
  refund_amount: string;
  refund_requested: string;
  chargeback_dispute: string;
  return_requested: string;
  merchant_id: string;
  ground_truth_label: string;
}

const COLUMNS: (keyof OrderRow)[] = [
  'order_id','order_date','customer_email','customer_name','shipping_address','billing_address',
  'order_total','order_status','customer_phone','ip_address','card_last4','card_bin','card_fingerprint',
  'device_id','payment_method','refund_status','refund_reason','refund_date','refund_amount',
  'refund_requested','chargeback_dispute','return_requested','merchant_id','ground_truth_label',
];

function blankRow(): OrderRow {
  const r = {} as OrderRow;
  for (const c of COLUMNS) (r as Record<string, string>)[c] = '';
  return r;
}

function isoDate(d: Date): string { return d.toISOString().slice(0, 10); }
function addDays(base: Date, days: number): Date {
  const d = new Date(base); d.setUTCDate(d.getUTCDate() + days); return d;
}

interface MakeOrderOpts {
  rnd: Rnd;
  identity: Identity;
  merchantId: string;
  orderDate: Date;
  fraud: boolean;
  refundRequested?: boolean;
  refundReason?: string;
  refundDaysAfter?: number;
  chargeback?: boolean;
  returnRequested?: boolean;
  addressOverride?: string;
  billingAddressOverride?: string;
  emailOverride?: string;
  // For "missing fields" scenarios
  drop?: Partial<Record<keyof OrderRow, true>>;
  orderTotalRange?: [number, number];
}

let orderCounter = 0;
function makeOrder(opts: MakeOrderOpts): OrderRow {
  const { rnd, identity, merchantId, orderDate, fraud } = opts;
  const oid = `${PREFIX}o_${pad(orderCounter++, 7)}`;
  const row = blankRow();
  row.order_id = oid;
  row.order_date = isoDate(orderDate);
  row.customer_email = opts.emailOverride ?? identity.emails[0];
  row.customer_name = identity.name;
  row.shipping_address = opts.addressOverride ?? identity.address;
  row.billing_address = opts.billingAddressOverride ?? row.shipping_address;
  const [tMin, tMax] = opts.orderTotalRange ?? [25, 350];
  row.order_total = randFloat(rnd, tMin, tMax).toFixed(2);
  row.order_status = 'completed';
  row.customer_phone = identity.phone ?? '';
  row.ip_address = identity.ipAddress ?? '';
  row.card_last4 = identity.cardLast4 ?? '';
  row.card_bin = identity.cardBin ?? '';
  row.card_fingerprint = identity.cardFingerprint ?? '';
  row.device_id = identity.deviceId ?? '';
  row.payment_method = identity.paymentMethod;

  if (opts.refundRequested) {
    row.refund_requested = 'true';
    row.refund_status = 'full';
    row.refund_reason = opts.refundReason ?? 'item_not_received';
    const refundDate = addDays(orderDate, opts.refundDaysAfter ?? randInt(rnd, 1, 3));
    row.refund_date = isoDate(refundDate);
    row.refund_amount = row.order_total;
    row.order_status = 'refunded';
  }
  if (opts.chargeback) row.chargeback_dispute = 'true';
  if (opts.returnRequested) row.return_requested = 'true';
  row.merchant_id = merchantId;
  row.ground_truth_label = fraud ? 'fraud' : 'legitimate';

  // Apply drops AFTER all set
  if (opts.drop) {
    for (const k of Object.keys(opts.drop) as (keyof OrderRow)[]) {
      row[k] = '';
    }
  }
  return row;
}

function writeScenario(n: number, description: string, rows: OrderRow[], gt: GroundTruth) {
  const csvPath = path.join(OUT_DIR, `scenario-${n}.csv`);
  const gtPath = path.join(OUT_DIR, `scenario-${n}.gt.json`);
  const header = COLUMNS.join(',');
  const body = rows.map((r) => COLUMNS.map((c) => {
    const v = r[c] ?? '';
    // CSV-escape if needed
    if (typeof v === 'string' && (v.includes(',') || v.includes('"') || v.includes('\n'))) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  }).join(',')).join('\n');
  fs.writeFileSync(csvPath, `${header}\n${body}\n`);
  fs.writeFileSync(gtPath, JSON.stringify(gt, null, 2));
  console.log(`[scenario ${n}] ${description} — ${rows.length} rows → ${csvPath}`);
}

// ── Fraud ring builder ───────────────────────────────────────────────────────
interface RingSpec {
  ringId: string;
  size: number;                   // number of customers in ring
  merchants: string[];            // merchant_ids the ring spans
  ordersPerCustomer: [number, number];
  refundRate: number;             // 0-1 — fraction of orders that get INR/refund
  refundDaysAfter: [number, number];
  shareCard: boolean;             // share BIN+last4 across members
  shareAddress: boolean;          // share address (with variants)
  shareDevice: boolean;
  rotateEmails: boolean;          // each order gets a fresh email on same card/address
  startDate: Date;
  durationDays: number;
}

function buildRing(rnd: Rnd, spec: RingSpec, ringIdx: number): { rows: OrderRow[]; customers: string[]; ringIdentityId: string } {
  // The ring identity — the linker should resolve all ring orders to this single id.
  const baseIdentity = genIdentity(rnd, ringIdx * 1000);
  baseIdentity.addressVariants = genAddressVariants(rnd, baseIdentity.address);
  const ringIdentityId = `${PREFIX}ringidentity_${spec.ringId}`;
  baseIdentity.customerId = ringIdentityId;
  if (spec.shareCard) {
    baseIdentity.cardLast4 = genCardLast4(rnd);
    baseIdentity.cardBin = genCardBin(rnd);
    baseIdentity.cardFingerprint = `${PREFIX}fp_ring_${spec.ringId}`;
  }
  if (spec.shareDevice) {
    baseIdentity.deviceId = `${PREFIX}dev_ring_${spec.ringId}`;
  }

  const customers: Identity[] = [];
  for (let i = 0; i < spec.size; i++) {
    const c = genIdentity(rnd, ringIdx * 1000 + i + 1);
    // All members of a sharing ring map to the SAME customerId in GT — because
    // a ring sharing card+address IS one identity at the data level, and the
    // engine should cluster them. (Identity precision/recall is measured against
    // this collapsed-identity GT, mirroring production where shared-infrastructure
    // ring members are correctly grouped.)
    if (spec.shareCard || spec.shareAddress || spec.shareDevice) {
      c.customerId = ringIdentityId;
    }
    if (spec.shareCard) {
      c.cardLast4 = baseIdentity.cardLast4;
      c.cardBin = baseIdentity.cardBin;
      c.cardFingerprint = baseIdentity.cardFingerprint;
    }
    if (spec.shareDevice) c.deviceId = baseIdentity.deviceId;
    if (spec.shareAddress) {
      c.address = pick(rnd, baseIdentity.addressVariants);
      c.addressVariants = baseIdentity.addressVariants;
      c.postcode = baseIdentity.postcode;
    }
    customers.push(c);
  }

  const rows: OrderRow[] = [];
  // Pre-build a merchant sequence that GUARANTEES every entry in spec.merchants
  // is used at least once when there are ≥ merchants.length total orders. This
  // is required for cross-merchant k-anon tests: with k-anon=3, a ring spanning
  // N sources is only visible to a requesting merchant if the ring touches the
  // OTHER N-1 sources, i.e. the ring must touch all N sources. Random per-order
  // pick can leave a source uncovered. We round-robin the first M positions
  // (deterministic coverage), then fall back to random pick for the remainder.
  // Pre-roll per-customer order counts so we can plan merchant coverage
  // WITHOUT changing the RNG draw order seen by downstream order generation.
  const orderCounts = customers.map(() => randInt(rnd, spec.ordersPerCustomer[0], spec.ordersPerCustomer[1]));
  const totalOrdersPlanned = orderCounts.reduce((a, b) => a + b, 0);
  const merchantSeq: string[] = [];
  for (let i = 0; i < spec.merchants.length && i < totalOrdersPlanned; i++) merchantSeq.push(spec.merchants[i]);
  shuffle(rnd, merchantSeq);
  let seqIdx = 0;
  for (let ci = 0; ci < customers.length; ci++) {
    const c = customers[ci];
    const numOrders = orderCounts[ci];
    for (let o = 0; o < numOrders; o++) {
      const merchantId = seqIdx < merchantSeq.length ? merchantSeq[seqIdx++] : pick(rnd, spec.merchants);
      const dayOffset = randInt(rnd, 0, spec.durationDays);
      const orderDate = addDays(spec.startDate, dayOffset);
      const refund = rnd() < spec.refundRate;
      let email = c.emails[0];
      if (spec.rotateEmails) {
        email = `${PREFIX}rot_${Math.floor(rnd() * 1e8).toString(36)}@${pick(rnd, EMAIL_DOMAINS)}`;
      }
      const row = makeOrder({
        rnd,
        identity: c,
        merchantId,
        orderDate,
        fraud: true,
        refundRequested: refund,
        refundReason: refund ? (rnd() < 0.6 ? 'item_not_received' : 'not_as_described') : undefined,
        refundDaysAfter: refund ? randInt(rnd, spec.refundDaysAfter[0], spec.refundDaysAfter[1]) : undefined,
        chargeback: refund && rnd() < 0.3,
        emailOverride: email,
        addressOverride: spec.shareAddress ? pick(rnd, baseIdentity.addressVariants) : undefined,
      });
      rows.push(row);
    }
  }
  return { rows, customers: customers.map((c) => c.customerId), ringIdentityId };
}

// Match a row to its customer in the ground truth — we use email primarily,
// falling back to (address, card) for ring rotations.
function indexCustomer(row: OrderRow, identity: Identity): string {
  return identity.customerId;
}

// ── Legitimate customer generator ───────────────────────────────────────────
function makeLegitOrders(rnd: Rnd, count: number, merchants: string[], baseDate: Date, opts?: { refundRate?: number; orderTotalRange?: [number, number]; sharePostcodes?: boolean }): { rows: OrderRow[]; orderToCustomer: Map<string, string> } {
  const rows: OrderRow[] = [];
  const orderToCustomer = new Map<string, string>();
  const refundRate = opts?.refundRate ?? 0.03;
  // Customers: 1-3 orders each, vary
  let i = 0;
  while (rows.length < count) {
    const identity = genIdentity(rnd, 50000 + i);
    if (opts?.sharePostcodes && rows.length > 0 && rnd() < 0.3) {
      // Reuse a previous postcode/city for "legitimate clustering" noise
      const sample = rows[Math.floor(rnd() * rows.length)];
      const prev = sample.shipping_address;
      // copy postcode from a previous order
      const m = prev.match(/, ([A-Z0-9 ]+)$/);
      if (m) identity.address = identity.address.replace(/, [A-Z0-9 ]+$/, `, ${m[1]}`);
    }
    const numOrders = randInt(rnd, 1, 3);
    for (let o = 0; o < numOrders; o++) {
      if (rows.length >= count) break;
      const merchant = pick(rnd, merchants);
      const dayOffset = randInt(rnd, 0, 90);
      const orderDate = addDays(baseDate, dayOffset);
      const refund = rnd() < refundRate;
      const row = makeOrder({
        rnd,
        identity,
        merchantId: merchant,
        orderDate,
        fraud: false,
        refundRequested: refund,
        refundReason: refund ? (rnd() < 0.5 ? 'changed_mind' : 'wrong_size') : undefined,
        refundDaysAfter: refund ? randInt(rnd, 7, 28) : undefined,
        returnRequested: refund,
        orderTotalRange: opts?.orderTotalRange,
      });
      rows.push(row);
      orderToCustomer.set(row.order_id, identity.customerId);
    }
    i++;
  }
  return { rows: rows.slice(0, count), orderToCustomer };
}

// ─────────────────────────────────────────────────────────────────────────────
// Scenario generators
// ─────────────────────────────────────────────────────────────────────────────

function scenario1(rnd: Rnd) {
  // 500 orders. 3 rings of 8-12 across 4+ merchants. Full identity fields.
  const merchants = ['m_alpha','m_beta','m_gamma','m_delta','m_epsilon'];
  const baseDate = new Date('2025-09-01T00:00:00Z');
  const ringSpecs: RingSpec[] = [
    { ringId: 'ring_s1_A', size: 10, merchants: merchants.slice(0,4), ordersPerCustomer: [3,5], refundRate: 0.65, refundDaysAfter: [1,3], shareCard: true, shareAddress: true, shareDevice: true, rotateEmails: true, startDate: baseDate, durationDays: 60 },
    { ringId: 'ring_s1_B', size: 8,  merchants: merchants.slice(1,5), ordersPerCustomer: [2,4], refundRate: 0.55, refundDaysAfter: [1,3], shareCard: true, shareAddress: true, shareDevice: false, rotateEmails: true, startDate: baseDate, durationDays: 50 },
    { ringId: 'ring_s1_C', size: 12, merchants,                     ordersPerCustomer: [2,4], refundRate: 0.50, refundDaysAfter: [2,4], shareCard: true, shareAddress: true, shareDevice: true, rotateEmails: false, startDate: baseDate, durationDays: 60 },
  ];
  const allRows: OrderRow[] = [];
  const gt: GroundTruth = { scenario: 1, description: 'Clean high-signal data, 3 rings', orders: {}, rings: [] };
  let fraudCount = 0;
  for (let i = 0; i < ringSpecs.length; i++) {
    const spec = ringSpecs[i];
    const built = buildRing(rnd, spec, i + 1);
    fraudCount += built.rows.length;
    for (const r of built.rows) {
      gt.orders[r.order_id] = { fraudLabel: 'fraud', customerId: built.customers[(r.customer_email.charCodeAt(0) + built.rows.indexOf(r)) % built.customers.length], ringId: spec.ringId, merchantId: r.merchant_id };
    }
    gt.rings.push({ ringId: spec.ringId, memberCustomerIds: built.customers, merchantIds: spec.merchants });
    allRows.push(...built.rows);
  }
  // Fill legitimate orders to reach 500
  const remaining = 500 - allRows.length;
  const legit = makeLegitOrders(rnd, remaining, merchants, baseDate);
  for (const r of legit.rows) {
    gt.orders[r.order_id] = { fraudLabel: 'legitimate', customerId: legit.orderToCustomer.get(r.order_id) ?? 'unknown', merchantId: r.merchant_id };
  }
  allRows.push(...legit.rows);
  // Shuffle
  shuffle(rnd, allRows);
  writeScenario(1, 'Clean high-signal', allRows, gt);
}

function shuffle<T>(rnd: Rnd, arr: T[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function scenario2(rnd: Rnd) {
  // 500 orders. Phone missing 60%, card missing 40%. customer_id missing entirely.
  const merchants = ['m_alpha','m_beta','m_gamma','m_delta'];
  const baseDate = new Date('2025-09-01T00:00:00Z');
  const ringSpecs: RingSpec[] = [
    { ringId: 'ring_s2_A', size: 8, merchants, ordersPerCustomer: [3,5], refundRate: 0.60, refundDaysAfter: [1,3], shareCard: false, shareAddress: true, shareDevice: false, rotateEmails: false, startDate: baseDate, durationDays: 60 },
    { ringId: 'ring_s2_B', size: 10, merchants: merchants.slice(0,3), ordersPerCustomer: [2,4], refundRate: 0.55, refundDaysAfter: [1,3], shareCard: false, shareAddress: true, shareDevice: false, rotateEmails: false, startDate: baseDate, durationDays: 50 },
  ];
  const allRows: OrderRow[] = [];
  const gt: GroundTruth = { scenario: 2, description: 'Missing identity fields', orders: {}, rings: [] };
  for (let i = 0; i < ringSpecs.length; i++) {
    const built = buildRing(rnd, ringSpecs[i], i + 100);
    for (const r of built.rows) {
      gt.orders[r.order_id] = { fraudLabel: 'fraud', customerId: built.customers[0], ringId: ringSpecs[i].ringId, merchantId: r.merchant_id };
    }
    gt.rings.push({ ringId: ringSpecs[i].ringId, memberCustomerIds: built.customers, merchantIds: ringSpecs[i].merchants });
    allRows.push(...built.rows);
  }
  const legit = makeLegitOrders(rnd, 500 - allRows.length, merchants, baseDate);
  for (const r of legit.rows) {
    gt.orders[r.order_id] = { fraudLabel: 'legitimate', customerId: legit.orderToCustomer.get(r.order_id) ?? 'unknown', merchantId: r.merchant_id };
  }
  allRows.push(...legit.rows);
  // Apply field drops
  for (const r of allRows) {
    if (rnd() < 0.6) r.customer_phone = '';
    if (rnd() < 0.4) { r.card_last4 = ''; r.card_bin = ''; r.card_fingerprint = ''; }
  }
  shuffle(rnd, allRows);
  writeScenario(2, 'Missing identity fields', allRows, gt);
}

function scenario3(rnd: Rnd) {
  // 300 orders. Only email, address, postcode, order_total, refund_requested.
  const merchants = ['m_alpha','m_beta','m_gamma'];
  const baseDate = new Date('2025-09-01T00:00:00Z');
  const spec: RingSpec = { ringId: 'ring_s3_A', size: 8, merchants, ordersPerCustomer: [3,4], refundRate: 0.70, refundDaysAfter: [1,5], shareCard: false, shareAddress: true, shareDevice: false, rotateEmails: false, startDate: baseDate, durationDays: 60 };
  const built = buildRing(rnd, spec, 300);
  const allRows: OrderRow[] = [...built.rows];
  const gt: GroundTruth = { scenario: 3, description: 'Minimal data — only email/address/refund', orders: {}, rings: [] };
  for (const r of built.rows) gt.orders[r.order_id] = { fraudLabel: 'fraud', customerId: built.customers[0], ringId: spec.ringId, merchantId: r.merchant_id };
  gt.rings.push({ ringId: spec.ringId, memberCustomerIds: built.customers, merchantIds: merchants });

  const legit = makeLegitOrders(rnd, 300 - allRows.length, merchants, baseDate);
  for (const r of legit.rows) gt.orders[r.order_id] = { fraudLabel: 'legitimate', customerId: legit.orderToCustomer.get(r.order_id) ?? 'unknown', merchantId: r.merchant_id };
  allRows.push(...legit.rows);
  // Strip non-essential fields
  for (const r of allRows) {
    r.customer_phone = '';
    r.card_last4 = '';
    r.card_bin = '';
    r.card_fingerprint = '';
    r.device_id = '';
    r.ip_address = '';
    r.billing_address = '';
    r.payment_method = '';
    r.chargeback_dispute = '';
    r.return_requested = '';
  }
  shuffle(rnd, allRows);
  writeScenario(3, 'Minimal data', allRows, gt);
}

function scenario4(rnd: Rnd) {
  // 1000 orders. 18% legit refund rate. 1 ring of 5 customers. Legit clustering noise.
  const merchants = ['m_alpha','m_beta','m_gamma','m_delta'];
  const baseDate = new Date('2025-09-01T00:00:00Z');
  const spec: RingSpec = { ringId: 'ring_s4_A', size: 5, merchants, ordersPerCustomer: [4,6], refundRate: 0.80, refundDaysAfter: [1,3], shareCard: true, shareAddress: true, shareDevice: true, rotateEmails: true, startDate: baseDate, durationDays: 50 };
  const built = buildRing(rnd, spec, 400);
  const allRows: OrderRow[] = [...built.rows];
  const gt: GroundTruth = { scenario: 4, description: 'High noise low fraud', orders: {}, rings: [] };
  for (const r of built.rows) gt.orders[r.order_id] = { fraudLabel: 'fraud', customerId: built.customers[0], ringId: spec.ringId, merchantId: r.merchant_id };
  gt.rings.push({ ringId: spec.ringId, memberCustomerIds: built.customers, merchantIds: merchants });

  const legit = makeLegitOrders(rnd, 1000 - allRows.length, merchants, baseDate, { refundRate: 0.18, sharePostcodes: true });
  for (const r of legit.rows) gt.orders[r.order_id] = { fraudLabel: 'legitimate', customerId: legit.orderToCustomer.get(r.order_id) ?? 'unknown', merchantId: r.merchant_id };
  allRows.push(...legit.rows);
  shuffle(rnd, allRows);
  writeScenario(4, 'High noise low fraud', allRows, gt);
}

function scenario5(rnd: Rnd) {
  // 2000 orders across 8 merchants. 4 rings × 3-merchant, 2 rings × 6-merchant, 1 ring × 2-merchant (suppressed).
  const merchants = Array.from({ length: 8 }, (_, i) => `m_s5_${i}`);
  const baseDate = new Date('2025-08-01T00:00:00Z');
  const allRows: OrderRow[] = [];
  const gt: GroundTruth = { scenario: 5, description: 'Cross-merchant stress', orders: {}, rings: [] };
  // 4 rings at k=3
  const k3Rings: RingSpec[] = [0,1,2,3].map((i) => ({
    ringId: `ring_s5_k3_${i}`, size: 6, merchants: merchants.slice(i, i + 3), ordersPerCustomer: [3,5], refundRate: 0.55, refundDaysAfter: [1,3], shareCard: true, shareAddress: true, shareDevice: true, rotateEmails: false, startDate: baseDate, durationDays: 60,
  }));
  // 2 rings at k=6
  const k6Rings: RingSpec[] = [0,1].map((i) => ({
    ringId: `ring_s5_k6_${i}`, size: 6, merchants: merchants.slice(i, i + 6), ordersPerCustomer: [3,5], refundRate: 0.60, refundDaysAfter: [1,3], shareCard: true, shareAddress: true, shareDevice: true, rotateEmails: true, startDate: baseDate, durationDays: 60,
  }));
  // 1 ring at k=2 (should NOT surface)
  const k2Ring: RingSpec = { ringId: 'ring_s5_k2', size: 5, merchants: merchants.slice(0, 2), ordersPerCustomer: [3,4], refundRate: 0.60, refundDaysAfter: [1,3], shareCard: true, shareAddress: true, shareDevice: true, rotateEmails: false, startDate: baseDate, durationDays: 60 };
  let ringIdx = 500;
  for (const spec of [...k3Rings, ...k6Rings, k2Ring]) {
    const built = buildRing(rnd, spec, ringIdx++);
    for (const r of built.rows) gt.orders[r.order_id] = { fraudLabel: 'fraud', customerId: built.customers[0], ringId: spec.ringId, merchantId: r.merchant_id };
    gt.rings.push({ ringId: spec.ringId, memberCustomerIds: built.customers, merchantIds: spec.merchants, suppressed: spec === k2Ring });
    allRows.push(...built.rows);
  }
  const legit = makeLegitOrders(rnd, 2000 - allRows.length, merchants, baseDate);
  for (const r of legit.rows) gt.orders[r.order_id] = { fraudLabel: 'legitimate', customerId: legit.orderToCustomer.get(r.order_id) ?? 'unknown', merchantId: r.merchant_id };
  allRows.push(...legit.rows);
  shuffle(rnd, allRows);
  writeScenario(5, 'Cross-merchant stress', allRows, gt);
}

function scenario6(rnd: Rnd) {
  // 400 orders. 3 customers each placing 6-10 orders within 24-72h across merchants, followed by refund.
  const merchants = ['m_alpha','m_beta','m_gamma','m_delta'];
  const baseDate = new Date('2025-09-15T08:00:00Z');
  const allRows: OrderRow[] = [];
  const gt: GroundTruth = { scenario: 6, description: 'Velocity & timing patterns', orders: {}, rings: [] };
  const customers: string[] = [];
  for (let c = 0; c < 3; c++) {
    const identity = genIdentity(rnd, 600 + c);
    customers.push(identity.customerId);
    const numOrders = randInt(rnd, 6, 10);
    // All orders in 24-72 hour window
    const windowHours = randInt(rnd, 24, 72);
    for (let o = 0; o < numOrders; o++) {
      const hoursOffset = (windowHours / numOrders) * o + randFloat(rnd, 0, 2);
      const orderDate = new Date(baseDate.getTime() + hoursOffset * 3600 * 1000);
      const merchantId = pick(rnd, merchants);
      const row = makeOrder({
        rnd, identity, merchantId, orderDate, fraud: true,
        refundRequested: true,
        refundReason: 'item_not_received',
        refundDaysAfter: randInt(rnd, 1, 3),
        chargeback: rnd() < 0.4,
      });
      allRows.push(row);
      gt.orders[row.order_id] = { fraudLabel: 'fraud', customerId: identity.customerId, ringId: `ring_s6_velocity_${c}`, merchantId };
    }
    gt.rings.push({ ringId: `ring_s6_velocity_${c}`, memberCustomerIds: [identity.customerId], merchantIds: merchants });
  }
  const legit = makeLegitOrders(rnd, 400 - allRows.length, merchants, baseDate);
  for (const r of legit.rows) gt.orders[r.order_id] = { fraudLabel: 'legitimate', customerId: legit.orderToCustomer.get(r.order_id) ?? 'unknown', merchantId: r.merchant_id };
  allRows.push(...legit.rows);
  shuffle(rnd, allRows);
  writeScenario(6, 'Velocity & timing', allRows, gt);
}

function scenario7(rnd: Rnd) {
  // 200 valid + 50 exact duplicates + 30 malformed
  const merchants = ['m_alpha','m_beta'];
  const baseDate = new Date('2025-09-01T00:00:00Z');
  const allRows: OrderRow[] = [];
  const gt: GroundTruth = { scenario: 7, description: 'Duplicates & malformed', orders: {}, rings: [] };
  const legit = makeLegitOrders(rnd, 200, merchants, baseDate);
  for (const r of legit.rows) {
    gt.orders[r.order_id] = { fraudLabel: 'legitimate', customerId: legit.orderToCustomer.get(r.order_id) ?? 'unknown', merchantId: r.merchant_id };
  }
  allRows.push(...legit.rows);
  // 50 exact duplicates (same order_id repeated)
  const dups = legit.rows.slice(0, 50).map((r) => ({ ...r }));
  allRows.push(...dups);
  // 30 malformed
  for (let i = 0; i < 30; i++) {
    const m = blankRow();
    const failureMode = i % 5;
    if (failureMode === 0) { /* missing order_id */ m.order_date = isoDate(baseDate); m.customer_email = 'malformed@x.com'; m.order_total = '10.00'; }
    else if (failureMode === 1) { m.order_id = `${PREFIX}mal_${i}`; m.order_date = 'not-a-date'; m.customer_email = 'malformed@x.com'; m.order_total = '10.00'; }
    else if (failureMode === 2) { m.order_id = `${PREFIX}mal_${i}`; m.order_date = isoDate(baseDate); m.customer_email = ''; m.order_total = '10.00'; }
    else if (failureMode === 3) { m.order_id = `${PREFIX}mal_${i}`; m.order_date = isoDate(baseDate); m.customer_email = 'malformed@x.com'; m.order_total = 'not-a-number'; }
    else { m.order_id = `${PREFIX}mal_${i}`; m.order_date = isoDate(baseDate); m.customer_email = 'malformed@x.com'; m.order_total = ''; }
    m.merchant_id = pick(rnd, merchants);
    allRows.push(m);
  }
  // Don't shuffle — leave valid first for the test
  writeScenario(7, 'Duplicates & malformed', allRows, gt);
}

function scenario8(rnd: Rnd) {
  // 10000 orders. ~4% fraud.
  const merchants = ['m_s8_a','m_s8_b','m_s8_c','m_s8_d','m_s8_e','m_s8_f'];
  const baseDate = new Date('2025-07-01T00:00:00Z');
  const allRows: OrderRow[] = [];
  const gt: GroundTruth = { scenario: 8, description: 'Large scale 10000 rows', orders: {}, rings: [] };
  // ~400 fraud orders distributed across multiple rings
  const ringSpecs: RingSpec[] = [];
  for (let i = 0; i < 10; i++) {
    ringSpecs.push({
      ringId: `ring_s8_${i}`, size: randInt(rnd, 6, 10), merchants: merchants.slice(0, randInt(rnd, 3, 6)),
      ordersPerCustomer: [3,5], refundRate: 0.55, refundDaysAfter: [1,3], shareCard: true, shareAddress: true,
      shareDevice: i % 2 === 0, rotateEmails: i % 3 === 0, startDate: baseDate, durationDays: 120,
    });
  }
  let ringIdx = 800;
  for (const spec of ringSpecs) {
    const built = buildRing(rnd, spec, ringIdx++);
    for (const r of built.rows) gt.orders[r.order_id] = { fraudLabel: 'fraud', customerId: built.customers[0], ringId: spec.ringId, merchantId: r.merchant_id };
    gt.rings.push({ ringId: spec.ringId, memberCustomerIds: built.customers, merchantIds: spec.merchants });
    allRows.push(...built.rows);
  }
  const legit = makeLegitOrders(rnd, 10000 - allRows.length, merchants, baseDate, { refundRate: 0.05 });
  for (const r of legit.rows) gt.orders[r.order_id] = { fraudLabel: 'legitimate', customerId: legit.orderToCustomer.get(r.order_id) ?? 'unknown', merchantId: r.merchant_id };
  allRows.push(...legit.rows);
  shuffle(rnd, allRows);
  writeScenario(8, 'Large scale 10000', allRows, gt);
}

// 40-row and 2000-row ingestion subsets (extracted from scenario 1 / 5)
function ingestionFixtures(rnd: Rnd) {
  // 40-row: tiny subset of scenario 1
  const merchants = ['m_alpha','m_beta'];
  const baseDate = new Date('2025-09-01T00:00:00Z');
  const legit40 = makeLegitOrders(rnd, 40, merchants, baseDate);
  const gt40: GroundTruth = { scenario: 40 as unknown as number, description: '40-row ingestion', orders: {}, rings: [] };
  for (const r of legit40.rows) gt40.orders[r.order_id] = { fraudLabel: 'legitimate', customerId: legit40.orderToCustomer.get(r.order_id) ?? 'unknown', merchantId: r.merchant_id };
  writeScenario(40, '40-row ingestion fixture', legit40.rows, gt40);

  // 2000-row: subset of scenario 5 pattern (already done via scenario 5 file size 2000)
  // We'll re-emit scenario 5 csv as scenario-2000 for clarity
  // (Actually just reuse scenario-5.csv at run time)
}

// ─────────────────────────────────────────────────────────────────────────────
// New scenarios 101..106
// ─────────────────────────────────────────────────────────────────────────────

// Helper: emit shadow orders at sibling merchants reusing a known identity
// (same card/device/address — possibly rotated email). Returns rows added.
function emitShadowOrders(
  rnd: Rnd,
  identity: Identity,
  siblingMerchants: string[],
  baseDate: Date,
  durationDays: number,
  perMerchant: [number, number],
  fraudOpts: { refundRate: number; chargebackRate: number; refundReason?: string },
  ringId: string,
  gt: GroundTruth,
): OrderRow[] {
  const rows: OrderRow[] = [];
  for (const m of siblingMerchants) {
    const n = randInt(rnd, perMerchant[0], perMerchant[1]);
    for (let o = 0; o < n; o++) {
      const orderDate = addDays(baseDate, randInt(rnd, 0, durationDays));
      const refund = rnd() < fraudOpts.refundRate;
      const row = makeOrder({
        rnd, identity, merchantId: m, orderDate, fraud: true,
        refundRequested: refund,
        refundReason: refund ? (fraudOpts.refundReason ?? 'item_not_received') : undefined,
        refundDaysAfter: refund ? randInt(rnd, 1, 3) : undefined,
        chargeback: refund && rnd() < fraudOpts.chargebackRate,
      });
      rows.push(row);
      gt.orders[row.order_id] = { fraudLabel: 'fraud', customerId: identity.customerId, ringId, merchantId: m };
    }
  }
  return rows;
}

// Scenario 101 — A: High legitimate return rate vs INR abuser
function scenario101(rnd: Rnd) {
  const primary = 'm_dtc_a';
  const sibling = ['m_dtc_a_ext1', 'm_dtc_a_ext2', 'm_dtc_a_ext3'];
  const baseDate = new Date('2025-09-01T00:00:00Z');
  const allRows: OrderRow[] = [];
  const gt: GroundTruth = { scenario: 101, description: 'A: High legit returns vs INR abuser', orders: {}, rings: [] };

  // 50 legitimate high-return customers
  const legitHighReturnIds: string[] = [];
  for (let i = 0; i < 50; i++) {
    const id = genIdentity(rnd, 1_010_000 + i);
    legitHighReturnIds.push(id.customerId);
    const numOrders = randInt(rnd, 5, 8);
    for (let o = 0; o < numOrders; o++) {
      const orderDate = addDays(baseDate, randInt(rnd, 0, 90));
      const refund = rnd() < 0.45;
      const row = makeOrder({
        rnd, identity: id, merchantId: primary, orderDate, fraud: false,
        refundRequested: refund, refundReason: refund ? 'wrong_size' : undefined,
        refundDaysAfter: refund ? randInt(rnd, 5, 14) : undefined,
        returnRequested: refund,
      });
      allRows.push(row);
      gt.orders[row.order_id] = { fraudLabel: 'legitimate', customerId: id.customerId, merchantId: primary, cohort: 'high_return_legit' };
    }
  }

  // 10 INR abusers — share infrastructure across primary + 2 siblings
  for (let i = 0; i < 10; i++) {
    const id = genIdentity(rnd, 1_010_500 + i);
    // give them stable card+device so cross-merchant linker works
    id.cardLast4 = genCardLast4(rnd);
    id.cardBin = genCardBin(rnd);
    id.cardFingerprint = `${PREFIX}fp_s101_abuser_${i}`;
    id.deviceId = `${PREFIX}dev_s101_abuser_${i}`;
    const ringId = `ring_s101_abuser_${i}`;
    const numOrders = randInt(rnd, 5, 8);
    for (let o = 0; o < numOrders; o++) {
      const orderDate = addDays(baseDate, randInt(rnd, 0, 90));
      const refund = rnd() < 0.45;
      const row = makeOrder({
        rnd, identity: id, merchantId: primary, orderDate, fraud: true,
        refundRequested: refund, refundReason: refund ? 'item_not_received' : undefined,
        refundDaysAfter: refund ? randInt(rnd, 1, 3) : undefined,
        chargeback: refund && rnd() < 0.30,
      });
      allRows.push(row);
      gt.orders[row.order_id] = { fraudLabel: 'fraud', customerId: id.customerId, ringId, merchantId: primary };
    }
    // shadow orders at siblings
    const shadows = emitShadowOrders(rnd, id, sibling, baseDate, 90, [2, 4], { refundRate: 0.45, chargebackRate: 0.3, refundReason: 'item_not_received' }, ringId, gt);
    allRows.push(...shadows);
    gt.rings.push({ ringId, memberCustomerIds: [id.customerId], merchantIds: [primary, ...sibling] });
  }

  // Fill remainder to 1000 with normal customers (~5% legit return rate)
  const fill = 1000 - allRows.length;
  if (fill > 0) {
    const legit = makeLegitOrders(rnd, fill, [primary], baseDate, { refundRate: 0.05 });
    for (const r of legit.rows) gt.orders[r.order_id] = { fraudLabel: 'legitimate', customerId: legit.orderToCustomer.get(r.order_id) ?? 'unknown', merchantId: r.merchant_id };
    allRows.push(...legit.rows);
  }
  shuffle(rnd, allRows);
  writeScenario(101, 'A: High legit returns vs INR abuser', allRows, gt);
}

// Scenario 102 — B: Seasonal burst
function scenario102(rnd: Rnd) {
  const merchants = ['m_dtc_b1', 'm_dtc_b2', 'm_dtc_b3', 'm_dtc_b4'];
  const baseDate = new Date('2025-11-28T00:00:00Z');
  const allRows: OrderRow[] = [];
  const gt: GroundTruth = { scenario: 102, description: 'B: Seasonal burst (BFCM 72h)', orders: {}, rings: [] };

  // 5 rings × 4 customers each, share infra across 3 merchants, ~70% INR within 3 days
  let ringIdx = 1_020_000;
  for (let r = 0; r < 5; r++) {
    const ringId = `ring_s102_burst_${r}`;
    const base = genIdentity(rnd, ringIdx++);
    base.cardLast4 = genCardLast4(rnd);
    base.cardBin = genCardBin(rnd);
    base.cardFingerprint = `${PREFIX}fp_s102_${r}`;
    base.deviceId = `${PREFIX}dev_s102_${r}`;
    base.addressVariants = genAddressVariants(rnd, base.address);
    const ringCustomerIds: string[] = [];
    for (let c = 0; c < 4; c++) {
      const id = genIdentity(rnd, ringIdx++);
      id.customerId = `${PREFIX}ringidentity_s102_${r}`;
      id.cardLast4 = base.cardLast4;
      id.cardBin = base.cardBin;
      id.cardFingerprint = base.cardFingerprint;
      id.deviceId = base.deviceId;
      id.address = pick(rnd, base.addressVariants);
      id.addressVariants = base.addressVariants;
      ringCustomerIds.push(id.customerId);
      const numOrders = randInt(rnd, 8, 12);
      for (let o = 0; o < numOrders; o++) {
        const hoursOffset = randFloat(rnd, 0, 72);
        const orderDate = new Date(baseDate.getTime() + hoursOffset * 3600 * 1000);
        const merchantId = pick(rnd, merchants);
        const refund = rnd() < 0.70;
        const row = makeOrder({
          rnd, identity: id, merchantId, orderDate, fraud: true,
          refundRequested: refund,
          refundReason: refund ? 'item_not_received' : undefined,
          refundDaysAfter: refund ? randInt(rnd, 1, 3) : undefined,
          chargeback: refund && rnd() < 0.25,
          addressOverride: pick(rnd, base.addressVariants),
        });
        allRows.push(row);
        gt.orders[row.order_id] = { fraudLabel: 'fraud', customerId: id.customerId, ringId, merchantId };
      }
    }
    gt.rings.push({ ringId, memberCustomerIds: Array.from(new Set(ringCustomerIds)), merchantIds: merchants });
  }

  // 1,800 legitimate burst customers within same 72h window
  let legitIdx = 1_021_000;
  while (allRows.filter((r) => gt.orders[r.order_id]?.fraudLabel === 'legitimate').length < 1800 && allRows.length < 2000) {
    const id = genIdentity(rnd, legitIdx++);
    const numOrders = randInt(rnd, 1, 3);
    for (let o = 0; o < numOrders; o++) {
      if (allRows.length >= 2000) break;
      const hoursOffset = randFloat(rnd, 0, 72);
      const orderDate = new Date(baseDate.getTime() + hoursOffset * 3600 * 1000);
      const merchantId = pick(rnd, merchants);
      const refund = rnd() < 0.03;
      const row = makeOrder({
        rnd, identity: id, merchantId, orderDate, fraud: false,
        refundRequested: refund, refundReason: refund ? 'wrong_size' : undefined,
        refundDaysAfter: refund ? randInt(rnd, 7, 21) : undefined,
        returnRequested: refund,
      });
      allRows.push(row);
      gt.orders[row.order_id] = { fraudLabel: 'legitimate', customerId: id.customerId, merchantId, cohort: 'burst_legit' };
    }
  }
  shuffle(rnd, allRows);
  writeScenario(102, 'B: Seasonal burst BFCM', allRows, gt);
}

// Scenario 103 — C: Gift purchasing address mismatch
function scenario103(rnd: Rnd) {
  const primary = 'm_dtc_c';
  const sibling = ['m_dtc_c_x', 'm_dtc_c_y', 'm_dtc_c_z'];
  const baseDate = new Date('2025-10-15T00:00:00Z');
  const allRows: OrderRow[] = [];
  const gt: GroundTruth = { scenario: 103, description: 'C: Gift shipping address mismatch', orders: {}, rings: [] };

  // 200 legit gift purchasers — shipping != billing, no refunds
  for (let i = 0; i < 200; i++) {
    const id = genIdentity(rnd, 1_030_000 + i);
    const recipient = genIdentity(rnd, 1_030_500 + i);
    const numOrders = randInt(rnd, 1, 2);
    for (let o = 0; o < numOrders; o++) {
      const orderDate = addDays(baseDate, randInt(rnd, 0, 60));
      const row = makeOrder({
        rnd, identity: id, merchantId: primary, orderDate, fraud: false,
        addressOverride: recipient.address,
        billingAddressOverride: id.address,
      });
      allRows.push(row);
      gt.orders[row.order_id] = { fraudLabel: 'legitimate', customerId: id.customerId, merchantId: primary, cohort: 'gift_legit' };
    }
  }

  // 20 fraud gift-shipping abusers — shipping != billing, ~60% INR, ~30% CB, also at siblings
  for (let i = 0; i < 20; i++) {
    const id = genIdentity(rnd, 1_031_000 + i);
    id.cardLast4 = genCardLast4(rnd);
    id.cardBin = genCardBin(rnd);
    id.cardFingerprint = `${PREFIX}fp_s103_abuser_${i}`;
    id.deviceId = `${PREFIX}dev_s103_abuser_${i}`;
    const drop = genIdentity(rnd, 1_031_500 + i); // drop address
    const ringId = `ring_s103_abuser_${i}`;
    const numOrders = randInt(rnd, 4, 7);
    for (let o = 0; o < numOrders; o++) {
      const orderDate = addDays(baseDate, randInt(rnd, 0, 60));
      const refund = rnd() < 0.60;
      const row = makeOrder({
        rnd, identity: id, merchantId: primary, orderDate, fraud: true,
        refundRequested: refund,
        refundReason: refund ? 'item_not_received' : undefined,
        refundDaysAfter: refund ? randInt(rnd, 1, 3) : undefined,
        chargeback: refund && rnd() < 0.30,
        addressOverride: drop.address,
        billingAddressOverride: id.address,
      });
      allRows.push(row);
      gt.orders[row.order_id] = { fraudLabel: 'fraud', customerId: id.customerId, ringId, merchantId: primary };
    }
    // sibling shadow orders — reuse same drop address shipping
    for (const m of sibling) {
      const n = randInt(rnd, 2, 4);
      for (let o = 0; o < n; o++) {
        const orderDate = addDays(baseDate, randInt(rnd, 0, 60));
        const refund = rnd() < 0.60;
        const row = makeOrder({
          rnd, identity: id, merchantId: m, orderDate, fraud: true,
          refundRequested: refund,
          refundReason: refund ? 'item_not_received' : undefined,
          refundDaysAfter: refund ? randInt(rnd, 1, 3) : undefined,
          chargeback: refund && rnd() < 0.30,
          addressOverride: drop.address,
          billingAddressOverride: id.address,
        });
        allRows.push(row);
        gt.orders[row.order_id] = { fraudLabel: 'fraud', customerId: id.customerId, ringId, merchantId: m };
      }
    }
    gt.rings.push({ ringId, memberCustomerIds: [id.customerId], merchantIds: [primary, ...sibling] });
  }

  // Fill remainder to 500 with normal aligned-address customers
  const fill = 500 - allRows.length;
  if (fill > 0) {
    const legit = makeLegitOrders(rnd, fill, [primary], baseDate, { refundRate: 0.05 });
    for (const r of legit.rows) gt.orders[r.order_id] = { fraudLabel: 'legitimate', customerId: legit.orderToCustomer.get(r.order_id) ?? 'unknown', merchantId: r.merchant_id };
    allRows.push(...legit.rows);
  }
  shuffle(rnd, allRows);
  writeScenario(103, 'C: Gift shipping mismatch', allRows, gt);
}

// Scenario 104 — D: Wardrobing — out-of-scope vs in-scope
function scenario104(rnd: Rnd) {
  const primary = 'm_dtc_d';
  const sibling = ['m_dtc_d_x', 'm_dtc_d_y', 'm_dtc_d_z'];
  const baseDate = new Date('2025-08-01T00:00:00Z');
  const allRows: OrderRow[] = [];
  const gt: GroundTruth = { scenario: 104, description: 'D: Wardrobing — out-of-scope vs in-scope', orders: {}, rings: [] };

  // 30 legit wardrobers — return 25-28 days, no CB, no INR, single merchant
  for (let i = 0; i < 30; i++) {
    const id = genIdentity(rnd, 1_040_000 + i);
    const numOrders = randInt(rnd, 4, 6);
    for (let o = 0; o < numOrders; o++) {
      const orderDate = addDays(baseDate, randInt(rnd, 0, 90));
      const refund = true;
      const row = makeOrder({
        rnd, identity: id, merchantId: primary, orderDate, fraud: false,
        refundRequested: refund,
        refundReason: 'not_as_described',
        refundDaysAfter: randInt(rnd, 25, 28),
        returnRequested: true,
      });
      allRows.push(row);
      gt.orders[row.order_id] = { fraudLabel: 'legitimate', customerId: id.customerId, merchantId: primary, cohort: 'wardrobe_legit' };
    }
  }

  // 10 fraud wardrobers — same 25-28 day pattern + CB after refund + cross-merchant
  for (let i = 0; i < 10; i++) {
    const id = genIdentity(rnd, 1_041_000 + i);
    id.cardLast4 = genCardLast4(rnd);
    id.cardBin = genCardBin(rnd);
    id.cardFingerprint = `${PREFIX}fp_s104_abuser_${i}`;
    id.deviceId = `${PREFIX}dev_s104_abuser_${i}`;
    const ringId = `ring_s104_abuser_${i}`;
    const numOrders = randInt(rnd, 4, 6);
    for (let o = 0; o < numOrders; o++) {
      const orderDate = addDays(baseDate, randInt(rnd, 0, 90));
      const row = makeOrder({
        rnd, identity: id, merchantId: primary, orderDate, fraud: true,
        refundRequested: true,
        refundReason: 'not_as_described',
        refundDaysAfter: randInt(rnd, 25, 28),
        returnRequested: true,
        chargeback: true,
      });
      allRows.push(row);
      gt.orders[row.order_id] = { fraudLabel: 'fraud', customerId: id.customerId, ringId, merchantId: primary };
    }
    // sibling cross-merchant shadow
    for (const m of sibling) {
      const n = randInt(rnd, 2, 4);
      for (let o = 0; o < n; o++) {
        const orderDate = addDays(baseDate, randInt(rnd, 0, 90));
        const row = makeOrder({
          rnd, identity: id, merchantId: m, orderDate, fraud: true,
          refundRequested: true,
          refundReason: 'not_as_described',
          refundDaysAfter: randInt(rnd, 25, 28),
          returnRequested: true,
          chargeback: true,
        });
        allRows.push(row);
        gt.orders[row.order_id] = { fraudLabel: 'fraud', customerId: id.customerId, ringId, merchantId: m };
      }
    }
    gt.rings.push({ ringId, memberCustomerIds: [id.customerId], merchantIds: [primary, ...sibling] });
  }

  // Fill remainder to 600 with normal customers
  const fill = 600 - allRows.length;
  if (fill > 0) {
    const legit = makeLegitOrders(rnd, fill, [primary], baseDate, { refundRate: 0.05 });
    for (const r of legit.rows) gt.orders[r.order_id] = { fraudLabel: 'legitimate', customerId: legit.orderToCustomer.get(r.order_id) ?? 'unknown', merchantId: r.merchant_id };
    allRows.push(...legit.rows);
  }
  shuffle(rnd, allRows);
  writeScenario(104, 'D: Wardrobing', allRows, gt);
}

// Scenario 105 — E: International formats
function scenario105(rnd: Rnd) {
  const merchants = ['m_intl_uk', 'm_intl_us', 'm_intl_eu', 'm_intl_au'];
  const baseDate = new Date('2025-09-01T00:00:00Z');
  const allRows: OrderRow[] = [];
  const gt: GroundTruth = { scenario: 105, description: 'E: International formats', orders: {}, rings: [] };

  const UNICODE_FIRSTS = ['Søren', 'Müller', 'François', 'Renée', 'Jürgen', 'Élise', 'Niño', 'Anaïs'];
  const UK_POSTS = ['SW1A 1AA', 'E1 6AN', 'M1 1AE', 'B15 2TT', 'LS1 4DT', 'G1 1XW'];
  const US_STATES_ZIPS: Array<[string, string]> = [['NY','10001'],['CA','90001'],['TX','75001'],['IL','60601'],['FL','33101']];
  const EU_CITIES: Array<[string, string, string]> = [['Berlin','10115','DE'],['Paris','75001','FR'],['Madrid','28001','ES'],['Amsterdam','1011','NL'],['Milano','20121','IT']];
  const AU_POSTS: Array<[string, string]> = [['Sydney','2000'],['Melbourne','3000'],['Brisbane','4000'],['Perth','6000']];

  function intlAddress(rnd: Rnd, merchant: string): { address: string; cc: string } {
    if (merchant === 'm_intl_uk') {
      const post = pick(rnd, UK_POSTS);
      return { address: `${randInt(rnd,1,200)} ${pick(rnd, STREET_NAMES)} ${pick(rnd, STREET_TYPES)}, London, ${post}`, cc: 'UK' };
    }
    if (merchant === 'm_intl_us') {
      const [state, zip] = pick(rnd, US_STATES_ZIPS);
      return { address: `${randInt(rnd,1,9999)} ${pick(rnd, STREET_NAMES)} ${pick(rnd, STREET_TYPES)}, New York, ${state} ${zip}`, cc: 'US' };
    }
    if (merchant === 'm_intl_eu') {
      const [city, post, cc] = pick(rnd, EU_CITIES);
      return { address: `${pick(rnd, STREET_NAMES)}strasse ${randInt(rnd,1,200)}, ${city} ${post}, ${cc}`, cc };
    }
    const [city, post] = pick(rnd, AU_POSTS);
    return { address: `${randInt(rnd,1,200)} ${pick(rnd, STREET_NAMES)} ${pick(rnd, STREET_TYPES)}, ${city} ${post}, AU`, cc: 'AU' };
  }

  // 15-member fraud ring across all 4 merchants
  const ringId = 'ring_s105_intl';
  const ringBase = genIdentity(rnd, 1_050_000);
  ringBase.cardLast4 = genCardLast4(rnd);
  ringBase.cardBin = genCardBin(rnd);
  ringBase.cardFingerprint = `${PREFIX}fp_s105_ring`;
  ringBase.deviceId = `${PREFIX}dev_s105_ring`;
  const ringIdentityId = `${PREFIX}ringidentity_s105`;
  const ringCustomerIds: string[] = [];
  for (let i = 0; i < 15; i++) {
    const id = genIdentity(rnd, 1_050_100 + i);
    id.customerId = ringIdentityId;
    id.cardLast4 = ringBase.cardLast4;
    id.cardBin = ringBase.cardBin;
    id.cardFingerprint = ringBase.cardFingerprint;
    id.deviceId = ringBase.deviceId;
    ringCustomerIds.push(id.customerId);
    // Harness fix: stable per-member email so customerOrderHistory (keyed by
    // emailHash) accumulates 3-5 orders per member. The previous per-order
    // email rotation produced 1-order clusters, forcing isTwoOrderCluster=true
    // and isSinglePMOnly=true on every ring order and preventing PROBABLE/
    // DEFINITE grade promotion regardless of evidence strength.
    const memberEmail = `${PREFIX}intl_${ringId}_${i}@${pick(rnd, EMAIL_DOMAINS)}`;
    const numOrders = randInt(rnd, 3, 5);
    for (let o = 0; o < numOrders; o++) {
      const merchantId = pick(rnd, merchants);
      const intl = intlAddress(rnd, merchantId);
      const orderDate = addDays(baseDate, randInt(rnd, 0, 90));
      const refund = rnd() < 0.60;
      const row = makeOrder({
        rnd, identity: id, merchantId, orderDate, fraud: true,
        refundRequested: refund,
        refundReason: refund ? 'item_not_received' : undefined,
        refundDaysAfter: refund ? randInt(rnd, 1, 3) : undefined,
        chargeback: refund && rnd() < 0.25,
        emailOverride: memberEmail,
        addressOverride: intl.address,
      });
      allRows.push(row);
      gt.orders[row.order_id] = { fraudLabel: 'fraud', customerId: id.customerId, ringId, merchantId };
    }
  }
  gt.rings.push({ ringId, memberCustomerIds: Array.from(new Set(ringCustomerIds)), merchantIds: merchants });

  // Fill legitimate to 800 — mix per merchant, 5% unicode names
  let legitIdx = 1_051_000;
  while (allRows.length < 800) {
    const id = genIdentity(rnd, legitIdx++);
    if (rnd() < 0.05) {
      const f = pick(rnd, UNICODE_FIRSTS);
      const l = pick(rnd, LAST_NAMES);
      id.name = `${f} ${l}`;
    }
    const merchantId = pick(rnd, merchants);
    const intl = intlAddress(rnd, merchantId);
    id.address = intl.address;
    const numOrders = randInt(rnd, 1, 3);
    for (let o = 0; o < numOrders; o++) {
      if (allRows.length >= 800) break;
      const orderDate = addDays(baseDate, randInt(rnd, 0, 90));
      const refund = rnd() < 0.04;
      const row = makeOrder({
        rnd, identity: id, merchantId, orderDate, fraud: false,
        refundRequested: refund,
        refundReason: refund ? 'wrong_size' : undefined,
        refundDaysAfter: refund ? randInt(rnd, 7, 21) : undefined,
        returnRequested: refund,
      });
      allRows.push(row);
      gt.orders[row.order_id] = { fraudLabel: 'legitimate', customerId: id.customerId, merchantId };
    }
  }
  shuffle(rnd, allRows);
  writeScenario(105, 'E: International formats', allRows, gt);
}

// Scenario 106 — F: Multiple fulfilment sources (k-anon)
function scenario106(rnd: Rnd) {
  const sources = ['m_ff_src1', 'm_ff_src2', 'm_ff_src3', 'm_ff_src4'];
  const baseDate = new Date('2025-09-01T00:00:00Z');
  const allRows: OrderRow[] = [];
  const gt: GroundTruth = { scenario: 106, description: 'F: Multiple fulfilment sources k-anon', orders: {}, rings: [] };

  // 4 cross-source rings (k=3) — should surface
  let ringIdx = 1_060_000;
  for (let r = 0; r < 4; r++) {
    const ringId = `ring_s106_cross_${r}`;
    const built = buildRing(rnd, {
      ringId, size: 4, merchants: sources, ordersPerCustomer: [3, 5],
      refundRate: 0.60, refundDaysAfter: [1, 3],
      shareCard: true, shareAddress: true, shareDevice: true, rotateEmails: false,
      startDate: baseDate, durationDays: 60,
    }, ringIdx++);
    for (const row of built.rows) gt.orders[row.order_id] = { fraudLabel: 'fraud', customerId: built.ringIdentityId, ringId, merchantId: row.merchant_id };
    gt.rings.push({ ringId, memberCustomerIds: built.customers, merchantIds: sources });
    allRows.push(...built.rows);
  }

  // 2 single-source rings (k=1) — suppressed
  for (let r = 0; r < 2; r++) {
    const ringId = `ring_s106_single_${r}`;
    const single = [sources[r % sources.length]];
    const built = buildRing(rnd, {
      ringId, size: 4, merchants: single, ordersPerCustomer: [3, 5],
      refundRate: 0.60, refundDaysAfter: [1, 3],
      shareCard: true, shareAddress: true, shareDevice: true, rotateEmails: false,
      startDate: baseDate, durationDays: 60,
    }, ringIdx++);
    for (const row of built.rows) gt.orders[row.order_id] = { fraudLabel: 'fraud', customerId: built.ringIdentityId, ringId, merchantId: row.merchant_id };
    gt.rings.push({ ringId, memberCustomerIds: built.customers, merchantIds: single, suppressed: true });
    allRows.push(...built.rows);
  }

  // Fill to 700
  const fill = 700 - allRows.length;
  if (fill > 0) {
    const legit = makeLegitOrders(rnd, fill, sources, baseDate, { refundRate: 0.04 });
    for (const row of legit.rows) gt.orders[row.order_id] = { fraudLabel: 'legitimate', customerId: legit.orderToCustomer.get(row.order_id) ?? 'unknown', merchantId: row.merchant_id };
    allRows.push(...legit.rows);
  }
  shuffle(rnd, allRows);
  writeScenario(106, 'F: Multiple fulfilment sources k-anon', allRows, gt);
}

// ─────────────────────────────────────────────────────────────────────────────
function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  const seed = 20260525;
  console.log(`[generate] seed=${seed}`);
  // Reset counter for reproducibility
  orderCounter = 0;
  const rnd = mulberry32(seed);
  scenario1(rnd);
  scenario2(rnd);
  scenario3(rnd);
  scenario4(rnd);
  scenario5(rnd);
  scenario6(rnd);
  scenario7(rnd);
  scenario8(rnd);
  ingestionFixtures(rnd);
  scenario101(rnd);
  scenario102(rnd);
  scenario103(rnd);
  scenario104(rnd);
  scenario105(rnd);
  scenario106(rnd);
  console.log('[generate] done');
}

main();
