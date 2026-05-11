import fs from 'node:fs';
import path from 'node:path';

type Scenario =
  | 'clean'
  | 'fraud_same_phone_card_account'
  | 'fraud_phone_bridge'
  | 'fraud_reship_refund'
  | 'fraud_paypal_device'
  | 'fraud_slow_burn'
  | 'fraud_chargeback'
  | 'fraud_high_value_inr'
  | 'fraud_two_order'
  | 'false_shared_household'
  | 'false_corporate_office'
  | 'false_shared_ip'
  | 'false_bin_last4_collision'
  | 'legit_refund'
  | 'normal_repeat';

export interface BlindOrder {
  order_id: string;
  created_at: string;
  order_date: string;
  customer_email: string;
  email: string;
  buyer_email: string;
  customer_name: string;
  name: string;
  buyer_name: string;
  billing_name: string;
  phone: string;
  customer_phone: string;
  shipping_phone: string;
  shipping_address: string;
  address1: string;
  shipping_address_1: string;
  shipping_address_2: string;
  shipping_city: string;
  shipping_state: string;
  shipping_postcode: string;
  zip: string;
  postcode: string;
  shipping_country: string;
  billing_address: string;
  billing_city: string;
  billing_postcode: string;
  ip_address: string;
  customer_ip: string;
  browser_ip: string;
  card_last4: string;
  card_bin: string;
  payment_method: string;
  payment_gateway: string;
  order_total: string;
  total: string;
  amount: string;
  currency: string;
  account_id: string;
  customer_id: string;
  refund_requested: string;
  refund_amount: string;
  refund_reason: string;
  chargeback_filed: string;
  chargeback_date: string;
  chargeback_reason_code: string;
  delivery_status: string;
  order_status: string;
  tracking_number: string;
  device_id: string;
  user_agent: string;
  merchant_note: string;
  loyalty_tier: string;
  _expected_cluster_label: string;
  _expected_confidence: 'definite' | 'probable' | 'possible' | 'weak' | '';
  _expected_should_flag: 'true' | 'false';
  _expected_reason: string;
  _scenario: Scenario;
  _ground_truth_person_id: string;
}

interface DatasetSpec {
  name: string;
  orders: BlindOrder[];
  exactExpected: boolean;
  maxReviewRate: number;
  minRecall: number;
  minDistinctAddresses: number;
  maxLargestCluster: number;
}

export interface DemoSeedDataset {
  name: string;
  label: string;
  orders: BlindOrder[];
}

const GENERATED_DIR = path.resolve(process.cwd(), 'tests/fixtures/generated');

class Rng {
  constructor(private seed: number) {}
  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed / 0x100000000;
  }
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
  pick<T>(arr: T[]): T {
    return arr[this.int(0, arr.length - 1)];
  }
  chance(p: number): boolean {
    return this.next() < p;
  }
}

const firstNames = ['Amelia', 'Olivia', 'Isla', 'Ava', 'Mia', 'Noah', 'Leo', 'Oscar', 'Theo', 'Arthur', 'Grace', 'Freya', 'James', 'Maya', 'Zara', 'Harris'];
const lastNames = ['Patel', 'Smith', 'Jones', 'Brown', 'Wilson', 'Taylor', 'Khan', 'Singh', 'Evans', 'Walker', 'Roberts', 'Hughes', 'Lewis', 'Morgan'];
const streets = ['Baker Street', 'King Street', 'Market Road', 'Station Road', 'Church Lane', 'Victoria Road', 'Queensway', 'High Street', 'Park Avenue', 'Mill Lane'];
const cities = ['London', 'Manchester', 'Birmingham', 'Leeds', 'Bristol', 'Glasgow', 'Cardiff', 'Liverpool', 'Sheffield', 'Newcastle'];
const userAgents = [
  'Mozilla/5.0 Chrome/124.0 Safari/537.36',
  'Mozilla/5.0 Safari/605.1.15',
  'Mozilla/5.0 Firefox/125.0',
  'Mozilla/5.0 Edge/124.0',
];

function pad(n: number, len = 4): string {
  return String(n).padStart(len, '0');
}

function dateFrom(base: string, days: number): string {
  const d = new Date(`${base}T10:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

function postcode(rng: Rng, n: number): string {
  const letters = ['SW', 'NW', 'EC', 'W', 'M', 'B', 'LS', 'BS', 'CF', 'G'];
  return `${rng.pick(letters)}${1 + (n % 20)} ${1 + (n % 9)}${String.fromCharCode(65 + (n % 26))}${String.fromCharCode(65 + ((n + 7) % 26))}`;
}

function baseOrder(rng: Rng, idx: number, scenario: Scenario = 'clean'): BlindOrder {
  const first = rng.pick(firstNames);
  const last = rng.pick(lastNames);
  const name = `${first} ${last}`;
  const pc = postcode(rng, idx);
  const city = rng.pick(cities);
  const address1 = `${rng.int(1, 240)} ${rng.pick(streets)}`;
  const address = `${address1}, ${city}, ${pc}, GB`;
  const email = `${first}.${last}.${idx}@example-customer.test`.toLowerCase();
  const total = (rng.int(1800, 22000) / 100).toFixed(2);
  const phone = `07${pad(100000000 + idx, 9)}`.slice(0, 11);
  const ip = `86.${rng.int(1, 220)}.${rng.int(1, 220)}.${rng.int(1, 220)}`;
  const cardBin = String(rng.pick([424242, 400005, 555555, 510510, 378282, 601111]));
  const last4 = pad(rng.int(0, 9999));
  const orderId = `BT-${pad(idx, 6)}`;
  const date = dateFrom('2025-01-01', idx % 420);

  return {
    order_id: orderId,
    created_at: date,
    order_date: date,
    customer_email: email,
    email,
    buyer_email: email,
    customer_name: name,
    name,
    buyer_name: name,
    billing_name: name,
    phone,
    customer_phone: phone,
    shipping_phone: phone,
    shipping_address: address,
    address1,
    shipping_address_1: address1,
    shipping_address_2: rng.chance(0.08) ? `Flat ${rng.int(1, 80)}` : '',
    shipping_city: city,
    shipping_state: '',
    shipping_postcode: pc,
    zip: pc,
    postcode: pc,
    shipping_country: 'GB',
    billing_address: address,
    billing_city: city,
    billing_postcode: pc,
    ip_address: ip,
    customer_ip: ip,
    browser_ip: ip,
    card_last4: last4,
    card_bin: cardBin,
    payment_method: rng.pick(['card', 'paypal', 'apple_pay', 'klarna']),
    payment_gateway: rng.pick(['stripe', 'shopify_payments', 'paypal', 'adyen']),
    order_total: total,
    total,
    amount: total,
    currency: 'GBP',
    account_id: `acct_${pad(idx, 7)}`,
    customer_id: `cust_${pad(idx, 7)}`,
    refund_requested: 'false',
    refund_amount: '',
    refund_reason: '',
    chargeback_filed: 'false',
    chargeback_date: '',
    chargeback_reason_code: '',
    delivery_status: 'delivered',
    order_status: 'completed',
    tracking_number: `TRK${pad(idx, 10)}`,
    device_id: `dev_${pad(idx, 8)}`,
    user_agent: rng.pick(userAgents),
    merchant_note: rng.chance(0.05) ? 'gift wrap requested' : '',
    loyalty_tier: rng.pick(['bronze', 'silver', 'gold', '']),
    _expected_cluster_label: '',
    _expected_confidence: '',
    _expected_should_flag: 'false',
    _expected_reason: 'clean baseline order',
    _scenario: scenario,
    _ground_truth_person_id: `person_${pad(idx, 7)}`,
  };
}

function mark(o: BlindOrder, label: string, confidence: BlindOrder['_expected_confidence'], reason: string, personId: string, scenario: Scenario): BlindOrder {
  o._expected_cluster_label = label;
  o._expected_confidence = confidence;
  o._expected_should_flag = confidence ? 'true' : 'false';
  o._expected_reason = reason;
  o._ground_truth_person_id = personId;
  o._scenario = scenario;
  return o;
}

function fraudOrder(rng: Rng, idx: number, label: string, person: string, scenario: Scenario, signals: Partial<BlindOrder>, confidence: BlindOrder['_expected_confidence']): BlindOrder {
  const o = baseOrder(rng, idx, scenario);
  Object.assign(o, signals);
  o.email = o.customer_email;
  o.buyer_email = o.customer_email;
  o.name = o.customer_name;
  o.buyer_name = o.customer_name;
  o.phone = o.customer_phone;
  o.shipping_phone = o.customer_phone;
  o.customer_ip = o.ip_address;
  o.browser_ip = o.ip_address;
  o.total = o.order_total;
  o.amount = o.order_total;
  o.customer_id = o.account_id || o.customer_id;
  if (scenario.includes('fraud') && rng.chance(0.7)) {
    o.refund_requested = 'true';
    o.refund_amount = (parseFloat(o.order_total) * rng.pick([0.5, 1])).toFixed(2);
    o.refund_reason = rng.pick(['item not received', 'never arrived', 'parcel missing', 'chargeback']);
    o.order_status = rng.chance(0.5) ? 'refunded' : 'completed';
  }
  if (scenario === 'fraud_chargeback') {
    o.chargeback_filed = 'true';
    o.chargeback_date = dateFrom('2025-01-01', (idx % 420) + 12);
    o.chargeback_reason_code = '4855';
  }
  return mark(o, label, confidence, scenario, person, scenario);
}

function addClean(orders: BlindOrder[], rng: Rng, start: number, count: number): number {
  for (let i = 0; i < count; i++) orders.push(baseOrder(rng, start + i));
  return start + count;
}

function addRepeatBuyers(orders: BlindOrder[], rng: Rng, start: number, buyers: number, each: number): number {
  let idx = start;
  for (let b = 0; b < buyers; b++) {
    const seed = baseOrder(rng, idx++);
    seed._scenario = 'normal_repeat';
    for (let j = 0; j < each; j++) {
      const o = { ...baseOrder(rng, idx++, 'normal_repeat') };
      Object.assign(o, {
        customer_email: seed.customer_email,
        email: seed.customer_email,
        buyer_email: seed.customer_email,
        customer_name: seed.customer_name,
        name: seed.customer_name,
        buyer_name: seed.customer_name,
        customer_phone: seed.customer_phone,
        phone: seed.customer_phone,
        shipping_phone: seed.customer_phone,
        account_id: seed.account_id,
        customer_id: seed.account_id,
        shipping_address: seed.shipping_address,
        address1: seed.address1,
        shipping_address_1: seed.shipping_address_1,
        shipping_postcode: seed.shipping_postcode,
        postcode: seed.postcode,
        zip: seed.zip,
      });
      if (j === each - 1 && rng.chance(0.18)) {
        o.refund_requested = 'true';
        o.refund_amount = (parseFloat(o.order_total) * 0.35).toFixed(2);
        o.refund_reason = 'damaged';
        o._scenario = 'legit_refund';
      }
      orders.push(o);
    }
  }
  return idx;
}

function addFalsePositiveTraps(orders: BlindOrder[], rng: Rng, start: number, scale = 1): number {
  let idx = start;
  const officeAddress = '1 Canary Wharf, London, E14 5AB, GB';
  const dormAddress = 'University Hall, 20 College Road, Leeds, LS2 9JT, GB';
  const sharedIp = '203.0.113.42';
  for (let i = 0; i < 16 * scale; i++) {
    const o = baseOrder(rng, idx++, 'false_corporate_office');
    o.shipping_address = officeAddress;
    o.address1 = '1 Canary Wharf';
    o.shipping_address_1 = '1 Canary Wharf';
    o.shipping_postcode = 'E14 5AB';
    o.postcode = 'E14 5AB';
    o.zip = 'E14 5AB';
    o.ip_address = sharedIp;
    o.customer_ip = sharedIp;
    o.browser_ip = sharedIp;
    o._expected_reason = 'corporate office shared address/IP trap';
    orders.push(o);
  }
  for (let i = 0; i < 10 * scale; i++) {
    const o = baseOrder(rng, idx++, 'false_shared_household');
    o.shipping_address = dormAddress;
    o.address1 = 'University Hall';
    o.shipping_address_1 = 'University Hall';
    o.shipping_postcode = 'LS2 9JT';
    o.postcode = 'LS2 9JT';
    o.zip = 'LS2 9JT';
    o.ip_address = i % 2 === 0 ? '198.51.100.24' : o.ip_address;
    o.customer_ip = o.ip_address;
    o.browser_ip = o.ip_address;
    o._expected_reason = 'roommates or dorm shared address trap';
    orders.push(o);
  }
  for (let i = 0; i < 18 * scale; i++) {
    const o = baseOrder(rng, idx++, 'false_bin_last4_collision');
    o.card_bin = '424242';
    o.card_last4 = '1111';
    o._expected_reason = 'BIN + last4 collision trap';
    orders.push(o);
  }
  return idx;
}

function addFraudRings(orders: BlindOrder[], rng: Rng, start: number, multiplier = 1): number {
  let idx = start;
  const rings = [
    { label: 'RING_PHONE_CARD_ACCOUNT', count: 5 * multiplier, scenario: 'fraud_same_phone_card_account' as Scenario, confidence: 'definite' as const, shared: { customer_phone: '07999111000', card_bin: '424242', card_last4: '9001', account_id: 'acct_ring_001' } },
    { label: 'RING_PHONE_BRIDGE', count: 4 * multiplier, scenario: 'fraud_phone_bridge' as Scenario, confidence: 'probable' as const, shared: { customer_phone: '+44 7999 222000', account_id: 'acct_bridge_222' } },
    { label: 'RING_RESHIP_REFUND', count: 5 * multiplier, scenario: 'fraud_reship_refund' as Scenario, confidence: 'possible' as const, shared: { shipping_address: 'Unit 9 Reship Yard, Barking, IG11 8BB, GB', shipping_address_1: 'Unit 9 Reship Yard', address1: 'Unit 9 Reship Yard', shipping_postcode: 'IG11 8BB', postcode: 'IG11 8BB', zip: 'IG11 8BB' } },
    { label: 'RING_PAYPAL_DEVICE', count: 4 * multiplier, scenario: 'fraud_paypal_device' as Scenario, confidence: 'probable' as const, shared: { payment_method: 'paypal', payment_gateway: 'paypal', device_id: 'dev_paypal_ring_77', customer_phone: '07999333000' } },
    { label: 'RING_SLOW_BURN', count: 6 * multiplier, scenario: 'fraud_slow_burn' as Scenario, confidence: 'probable' as const, shared: { customer_phone: '07999444000', account_id: 'acct_slow_burn_44' } },
    { label: 'RING_CHARGEBACK', count: 4 * multiplier, scenario: 'fraud_chargeback' as Scenario, confidence: 'definite' as const, shared: { customer_phone: '07999555000', account_id: 'acct_cbk_55', device_id: 'dev_cbk_55' } },
    { label: 'RING_HIGH_VALUE_INR', count: 4 * multiplier, scenario: 'fraud_high_value_inr' as Scenario, confidence: 'probable' as const, shared: { customer_phone: '07999666000', card_bin: '555555', card_last4: '6666' } },
    { label: 'RING_TWO_ORDER_MIN', count: 2, scenario: 'fraud_two_order' as Scenario, confidence: 'probable' as const, shared: { customer_phone: '07999777000', account_id: 'acct_two_77', card_bin: '400005', card_last4: '7777' } },
  ];

  for (const ring of rings) {
    for (let i = 0; i < ring.count; i++) {
      const emailLocal = `${ring.label.toLowerCase().replace(/_/g, '')}${i}`;
      const o = fraudOrder(
        rng,
        idx++,
        ring.label,
        `person_${ring.label}`,
        ring.scenario,
        {
          ...ring.shared,
          customer_email: i % 2 === 0 ? `${emailLocal}+orders@gmail.com` : `${emailLocal}@gmail.com`,
          customer_name: rng.pick(['Alex Reed', 'A Reed', 'Alexander R.', 'Sam Lane', 'S Lane']),
          billing_name: rng.pick(['Alex Reed', 'A Reed', 'Sam Lane']),
          order_total: ring.scenario === 'fraud_high_value_inr' ? String(rng.int(650, 1400)) : (rng.int(8500, 42000) / 100).toFixed(2),
          ip_address: i % 3 === 0 ? `45.80.${rng.int(1, 20)}.${rng.int(1, 220)}` : `81.2.${rng.int(1, 200)}.${rng.int(1, 200)}`,
        },
        ring.confidence
      );
      if (ring.scenario === 'fraud_slow_burn' && i < Math.max(2, ring.count - 2)) {
        o.refund_requested = 'false';
        o.refund_amount = '';
        o.refund_reason = '';
      }
      orders.push(o);
    }
  }
  return idx;
}

function addSmallObviousFraudRings(orders: BlindOrder[], rng: Rng, start: number): number {
  let idx = start;
  const rings = [
    { label: 'SMALL_PHONE_CARD_ACCOUNT', count: 5, scenario: 'fraud_same_phone_card_account' as Scenario, confidence: 'definite' as const, shared: { customer_phone: '07999111000', card_bin: '424242', card_last4: '9001', account_id: 'acct_small_ring_001' } },
    { label: 'SMALL_PHONE_BRIDGE', count: 4, scenario: 'fraud_phone_bridge' as Scenario, confidence: 'probable' as const, shared: { customer_phone: '+44 7999 222000', account_id: 'acct_small_bridge_222' } },
  ];
  for (const ring of rings) {
    for (let i = 0; i < ring.count; i++) {
      orders.push(fraudOrder(
        rng,
        idx++,
        ring.label,
        `person_${ring.label}`,
        ring.scenario,
        {
          ...ring.shared,
          customer_email: i % 2 === 0 ? `${ring.label.toLowerCase()}${i}+orders@gmail.com` : `${ring.label.toLowerCase()}${i}@gmail.com`,
          customer_name: rng.pick(['Alex Reed', 'A Reed', 'Alexander R.']),
          billing_name: rng.pick(['Alex Reed', 'A Reed']),
          order_total: (rng.int(8500, 42000) / 100).toFixed(2),
        },
        ring.confidence
      ));
    }
  }
  return idx;
}

function buildSmall(): DatasetSpec {
  const rng = new Rng(1001);
  const orders: BlindOrder[] = [];
  let idx = addClean(orders, rng, 1, 26);
  idx = addRepeatBuyers(orders, rng, idx, 4, 3);
  idx = addSmallObviousFraudRings(orders, rng, idx);
  idx = addFalsePositiveTraps(orders, rng, idx, 1);
  return spec('small_sanity', orders.slice(0, 96), true, 0.45, 0.75, 25, 12);
}

function buildMedium(): DatasetSpec {
  const rng = new Rng(2002);
  const orders: BlindOrder[] = [];
  let idx = addClean(orders, rng, 1, 780);
  idx = addRepeatBuyers(orders, rng, idx, 120, 3);
  idx = addFraudRings(orders, rng, idx, 2);
  idx = addFalsePositiveTraps(orders, rng, idx, 4);
  return spec('medium_realistic', orders.slice(0, 1350), false, 0.12, 0.55, 500, 35);
}

function buildLarge(): DatasetSpec {
  const rng = new Rng(3003);
  const orders: BlindOrder[] = [];
  let idx = addClean(orders, rng, 1, 3600);
  idx = addRepeatBuyers(orders, rng, idx, 500, 3);
  idx = addFraudRings(orders, rng, idx, 4);
  idx = addFalsePositiveTraps(orders, rng, idx, 8);
  return spec('large_merchant_scale', orders.slice(0, 5400), false, 0.08, 0.45, 2500, 70);
}

function buildNegative(): DatasetSpec {
  const rng = new Rng(4004);
  const orders: BlindOrder[] = [];
  let idx = addClean(orders, rng, 1, 1000);
  idx = addRepeatBuyers(orders, rng, idx, 100, 3);
  idx = addFalsePositiveTraps(orders, rng, idx, 5);
  return spec('negative_control', orders.slice(0, 1500), false, 0.025, 1, 400, 35);
}

function buildAdversarial(): DatasetSpec {
  const rng = new Rng(5005);
  const orders: BlindOrder[] = [];
  let idx = addClean(orders, rng, 1, 260);
  idx = addFalsePositiveTraps(orders, rng, idx, 1);
  idx = addFraudRings(orders, rng, idx, 3);
  return spec('adversarial_fraud', orders.slice(0, 430), false, 0.35, 0.65, 220, 35);
}

function buildDemo200(): DemoSeedDataset {
  const rng = new Rng(6101);
  const orders: BlindOrder[] = [];
  let idx = addClean(orders, rng, 1, 80);
  idx = addRepeatBuyers(orders, rng, idx, 12, 3);
  idx = addFraudRings(orders, rng, idx, 1);
  idx = addFalsePositiveTraps(orders, rng, idx, 1);
  idx = addClean(orders, rng, idx, 6);
  return {
    name: 'demo_asos_200',
    label: 'ASOS Demo Sprint',
    orders: orders.slice(0, 200),
  };
}

function buildDemo1500(): DemoSeedDataset {
  const rng = new Rng(6202);
  const orders: BlindOrder[] = [];
  let idx = addClean(orders, rng, 1, 900);
  idx = addRepeatBuyers(orders, rng, idx, 120, 3);
  idx = addFraudRings(orders, rng, idx, 2);
  idx = addFalsePositiveTraps(orders, rng, idx, 3);
  idx = addClean(orders, rng, idx, 40);
  return {
    name: 'demo_asos_1500',
    label: 'ASOS Demo Daily Operations',
    orders: orders.slice(0, 1500),
  };
}

function buildDemo5400(): DemoSeedDataset {
  const rng = new Rng(6303);
  const orders: BlindOrder[] = [];
  let idx = addClean(orders, rng, 1, 3600);
  idx = addRepeatBuyers(orders, rng, idx, 450, 3);
  idx = addFraudRings(orders, rng, idx, 4);
  idx = addFalsePositiveTraps(orders, rng, idx, 7);
  idx = addClean(orders, rng, idx, 12);
  return {
    name: 'demo_asos_5400',
    label: 'ASOS Demo Peak Season',
    orders: orders.slice(0, 5400),
  };
}

function spec(name: string, orders: BlindOrder[], exactExpected: boolean, maxReviewRate: number, minRecall: number, minDistinctAddresses: number, maxLargestCluster: number): DatasetSpec {
  return { name, orders, exactExpected, maxReviewRate, minRecall, minDistinctAddresses, maxLargestCluster };
}

const canonicalHeaders = [
  'order_id', 'order_date', 'customer_email', 'customer_name', 'billing_name',
  'customer_phone', 'shipping_address',
  'shipping_address_2', 'shipping_city', 'shipping_state', 'shipping_postcode',
  'shipping_country', 'billing_address', 'billing_city', 'billing_postcode', 'ip_address', 'customer_ip',
  'card_last4', 'card_bin', 'payment_method', 'payment_gateway', 'order_total',
  'currency', 'account_id', 'refund_requested', 'refund_amount', 'refund_reason',
  'chargeback_filed', 'chargeback_date', 'chargeback_reason_code', 'delivery_status', 'order_status',
  'tracking_number', 'device_id', 'user_agent', 'merchant_note', 'loyalty_tier',
] as const;

const answerHeaders = [
  'order_id', '_expected_cluster_label', '_expected_confidence', '_expected_should_flag',
  '_expected_reason', '_scenario', '_ground_truth_person_id',
] as const;

function csvEscape(value: unknown, delimiter = ','): string {
  const raw = value == null ? '' : String(value);
  if (raw.includes('"') || raw.includes('\n') || raw.includes('\r') || raw.includes(delimiter)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

function toCsv(rows: BlindOrder[], headers: readonly string[], delimiter = ','): string {
  return [
    headers.map((h) => csvEscape(h, delimiter)).join(delimiter),
    ...rows.map((row) => headers.map((h) => csvEscape((row as any)[h], delimiter)).join(delimiter)),
  ].join('\n');
}

type Format = { suffix: string; delimiter: string; bom?: boolean; headers: string[]; source: Record<string, string>; drop?: string[] };

const formats: Format[] = [
  {
    suffix: 'shopify',
    delimiter: ',',
    headers: ['Name', 'Created At', 'Email', 'Billing Name', 'Phone', 'Shipping Street', 'Shipping City', 'Shipping Province', 'Shipping Zip', 'Shipping Country', 'Browser IP', 'Card Last 4', 'Card BIN', 'Gateway', 'Total', 'Currency', 'Customer ID', 'Refund Requested', 'Refund Amount', 'Refund Reason', 'Chargeback Filed', 'Fulfillment Status', 'Tracking Number', 'Device ID', 'User Agent', 'Unmapped Loyalty Tier'],
    source: { 'Name': 'order_id', 'Created At': 'created_at', 'Email': 'customer_email', 'Billing Name': 'billing_name', 'Phone': 'customer_phone', 'Shipping Street': 'shipping_address', 'Shipping City': 'shipping_city', 'Shipping Province': 'shipping_state', 'Shipping Zip': 'shipping_postcode', 'Shipping Country': 'shipping_country', 'Browser IP': 'ip_address', 'Card Last 4': 'card_last4', 'Card BIN': 'card_bin', 'Gateway': 'payment_gateway', 'Total': 'order_total', 'Currency': 'currency', 'Customer ID': 'account_id', 'Refund Requested': 'refund_requested', 'Refund Amount': 'refund_amount', 'Refund Reason': 'refund_reason', 'Chargeback Filed': 'chargeback_filed', 'Fulfillment Status': 'order_status', 'Tracking Number': 'tracking_number', 'Device ID': 'device_id', 'User Agent': 'user_agent', 'Unmapped Loyalty Tier': 'loyalty_tier' },
  },
  {
    suffix: 'woocommerce',
    delimiter: ',',
    headers: ['order_id', 'date_created', 'billing_email', 'billing_first_name', 'billing_phone', 'shipping_address_1', 'shipping_city', 'shipping_postcode', 'billing_address_1', 'customer_ip_address', 'payment_method', 'order_total', 'currency', 'customer_id', 'refund_requested', 'refund_total', 'refund_reason', 'chargeback_filed', 'status', 'card_last4', 'card_bin', 'device_id'],
    source: { order_id: 'order_id', date_created: 'order_date', billing_email: 'customer_email', billing_first_name: 'customer_name', billing_phone: 'customer_phone', shipping_address_1: 'shipping_address', shipping_city: 'shipping_city', shipping_postcode: 'shipping_postcode', billing_address_1: 'billing_address', customer_ip_address: 'ip_address', payment_method: 'payment_method', order_total: 'order_total', currency: 'currency', customer_id: 'account_id', refund_requested: 'refund_requested', refund_total: 'refund_amount', refund_reason: 'refund_reason', chargeback_filed: 'chargeback_filed', status: 'order_status', card_last4: 'card_last4', card_bin: 'card_bin', device_id: 'device_id' },
  },
  {
    suffix: 'amazon',
    delimiter: '\t',
    headers: ['order-id', 'purchase-date', 'buyer-email', 'buyer-name', 'ship-address-1', 'ship-city', 'ship-postal-code', 'ship-country', 'buyer-phone-number', 'buyer-ip', 'item-price', 'currency', 'payment-method', 'card-last-four', 'card-bin', 'is-refunded', 'refund-reason', 'is-chargeback', 'device-id'],
    source: { 'order-id': 'order_id', 'purchase-date': 'order_date', 'buyer-email': 'customer_email', 'buyer-name': 'customer_name', 'ship-address-1': 'shipping_address', 'ship-city': 'shipping_city', 'ship-postal-code': 'shipping_postcode', 'ship-country': 'shipping_country', 'buyer-phone-number': 'customer_phone', 'buyer-ip': 'ip_address', 'item-price': 'order_total', currency: 'currency', 'payment-method': 'payment_method', 'card-last-four': 'card_last4', 'card-bin': 'card_bin', 'is-refunded': 'refund_requested', 'refund-reason': 'refund_reason', 'is-chargeback': 'chargeback_filed', 'device-id': 'device_id' },
  },
  {
    suffix: 'etsy_semicolon_bom',
    delimiter: ';',
    bom: true,
    headers: ['Receipt ID', 'Sale Date', 'Buyer Email', 'Buyer Name', 'Ship Name', 'Address 1', 'Address 2', 'Ship City', 'Ship Zipcode', 'Ship Country', 'Order Value', 'Currency', 'Payment Method', 'IP Address', 'Refunded Amount', 'Refund Reason', 'Chargeback Filed', 'Device Fingerprint'],
    source: { 'Receipt ID': 'order_id', 'Sale Date': 'order_date', 'Buyer Email': 'customer_email', 'Buyer Name': 'customer_name', 'Ship Name': 'billing_name', 'Address 1': 'shipping_address', 'Address 2': 'shipping_address_2', 'Ship City': 'shipping_city', 'Ship Zipcode': 'shipping_postcode', 'Ship Country': 'shipping_country', 'Order Value': 'order_total', Currency: 'currency', 'Payment Method': 'payment_method', 'IP Address': 'ip_address', 'Refunded Amount': 'refund_amount', 'Refund Reason': 'refund_reason', 'Chargeback Filed': 'chargeback_filed', 'Device Fingerprint': 'device_id' },
  },
  {
    suffix: 'stripe_pipe',
    delimiter: '|',
    headers: ['transaction_id', 'created', 'email', 'name', 'billing phone', 'billing address', 'shipping address', 'zip', 'country', 'client_ip', 'last4', 'bin', 'payment method fingerprint', 'amount', 'currency', 'refund amount', 'refund note', 'disputed', 'device id', 'metadata, merchant note'],
    source: { transaction_id: 'order_id', created: 'order_date', email: 'customer_email', name: 'customer_name', 'billing phone': 'customer_phone', 'billing address': 'billing_address', 'shipping address': 'shipping_address', zip: 'shipping_postcode', country: 'shipping_country', client_ip: 'ip_address', last4: 'card_last4', bin: 'card_bin', 'payment method fingerprint': 'device_id', amount: 'order_total', currency: 'currency', 'refund amount': 'refund_amount', 'refund note': 'refund_reason', disputed: 'chargeback_filed', 'device id': 'device_id', 'metadata, merchant note': 'merchant_note' },
  },
  {
    suffix: 'custom_mixed_case',
    delimiter: ',',
    headers: ['ORDER ID', 'Date', 'Buyer_Email', 'Buyer-Name', 'Customer Phone', 'Shipping_Address_1', 'Shipping PostCode', 'Shipping-Country', 'Customer_IP', 'Card Last Four', 'Card BIN', 'Payment Gateway', 'Amount', 'Currency', 'Account ID', 'Refund Claim', 'Refund Notes', 'ChargeBack Filed', 'Device Hash', 'Extra Column'],
    source: { 'ORDER ID': 'order_id', Date: 'order_date', Buyer_Email: 'customer_email', 'Buyer-Name': 'customer_name', 'Customer Phone': 'customer_phone', Shipping_Address_1: 'shipping_address', 'Shipping PostCode': 'shipping_postcode', 'Shipping-Country': 'shipping_country', Customer_IP: 'ip_address', 'Card Last Four': 'card_last4', 'Card BIN': 'card_bin', 'Payment Gateway': 'payment_gateway', Amount: 'order_total', Currency: 'currency', 'Account ID': 'account_id', 'Refund Claim': 'refund_requested', 'Refund Notes': 'refund_reason', 'ChargeBack Filed': 'chargeback_filed', 'Device Hash': 'device_id', 'Extra Column': 'loyalty_tier' },
  },
];

function writeFormat(baseName: string, rows: BlindOrder[], format: Format): string {
  const projected = rows.map((row) => {
    const out: Record<string, string> = {};
    for (const h of format.headers) out[h] = String((row as any)[format.source[h]] ?? '');
    return out;
  });
  const body = [
    format.headers.map((h) => csvEscape(h, format.delimiter)).join(format.delimiter),
    ...projected.map((row) => format.headers.map((h) => csvEscape(row[h], format.delimiter)).join(format.delimiter)),
  ].join('\n');
  const fileName = `${baseName}_${format.suffix}.csv`;
  fs.writeFileSync(path.join(GENERATED_DIR, fileName), `${format.bom ? '\ufeff' : ''}${body}`);
  return fileName;
}

function expectedSummary(ds: DatasetSpec) {
  const expectedFlagged = ds.orders.filter((o) => o._expected_should_flag === 'true');
  const labels = new Set(expectedFlagged.map((o) => o._expected_cluster_label).filter(Boolean));
  return {
    dataset: ds.name,
    seedNote: 'Deterministic generator seeds are embedded in scripts/test-data/generateBlindMerchantCSVs.ts',
    totalRows: ds.orders.length,
    expectedFlaggedRows: expectedFlagged.length,
    expectedFlaggedRate: expectedFlagged.length / ds.orders.length,
    expectedClusters: labels.size,
    exactExpected: ds.exactExpected,
    acceptance: {
      maxReviewRate: ds.maxReviewRate,
      minSeededRecall: ds.minRecall,
      minDistinctNormalizedAddresses: ds.minDistinctAddresses,
      maxLargestCluster: ds.maxLargestCluster,
    },
    expectedGradeCounts: expectedFlagged.reduce<Record<string, number>>((acc, row) => {
      if (row._expected_confidence) acc[row._expected_confidence] = (acc[row._expected_confidence] ?? 0) + 1;
      return acc;
    }, {}),
    scenarioCounts: ds.orders.reduce<Record<string, number>>((acc, row) => {
      acc[row._scenario] = (acc[row._scenario] ?? 0) + 1;
      return acc;
    }, {}),
  };
}

function writeDataset(ds: DatasetSpec): void {
  fs.writeFileSync(path.join(GENERATED_DIR, `${ds.name}.csv`), toCsv(ds.orders, canonicalHeaders));
  fs.writeFileSync(path.join(GENERATED_DIR, `${ds.name}_ANSWER_KEY.csv`), toCsv(ds.orders, answerHeaders));
  fs.writeFileSync(path.join(GENERATED_DIR, `${ds.name}_EXPECTED_SUMMARY.json`), `${JSON.stringify(expectedSummary(ds), null, 2)}\n`);
}

function writeHeaderChaos(base: BlindOrder[]): void {
  const rows = base.slice(0, 72);
  fs.writeFileSync(path.join(GENERATED_DIR, 'header_chaos_underlying_ANSWER_KEY.csv'), toCsv(rows, answerHeaders));
  fs.writeFileSync(path.join(GENERATED_DIR, 'header_chaos_EXPECTED_SUMMARY.json'), `${JSON.stringify({
    dataset: 'header_chaos',
    totalRows: rows.length,
    formats: formats.map((f) => f.suffix),
    mustParseDelimiters: [',', '\\t', ';', '|'],
    minDistinctNormalizedAddresses: 25,
  }, null, 2)}\n`);
  for (const format of formats) writeFormat('header_chaos', rows, format);

  const missingImportant = rows.map((row) => ({
    order_id: row.order_id,
    order_date: row.order_date,
    customer_email: row.customer_email,
    order_total: row.order_total,
    shipping_country: row.shipping_country,
  })) as any[];
  fs.writeFileSync(path.join(GENERATED_DIR, 'header_chaos_missing_important.csv'), toCsv(missingImportant, ['order_id', 'order_date', 'customer_email', 'order_total', 'shipping_country']));

  const duplicateHeaders = [
    'order_id', 'order_date', 'customer_email', 'shipping_address', 'shipping_country',
    'order_total', 'currency', 'ip_address', 'card_last4', 'card_bin', 'customer_phone',
    'customer_phone', 'unmapped_extra',
  ];
  const duplicateRows = rows.map((row) => ({
    ...row,
    unmapped_extra: row.loyalty_tier,
  })) as any[];
  fs.writeFileSync(path.join(GENERATED_DIR, 'header_chaos_duplicate_headers.csv'), toCsv(duplicateRows, duplicateHeaders));
}

export function generateBlindFixtures(): void {
  fs.mkdirSync(GENERATED_DIR, { recursive: true });
  const datasets = [buildSmall(), buildMedium(), buildLarge(), buildNegative(), buildAdversarial()];
  for (const ds of datasets) writeDataset(ds);
  writeHeaderChaos(buildSmall().orders);
  fs.writeFileSync(path.join(GENERATED_DIR, 'MANIFEST.json'), `${JSON.stringify({
    generatedAt: 'deterministic',
    datasets: datasets.map((ds) => expectedSummary(ds)),
    headerChaosFormats: formats.map((f) => ({ suffix: f.suffix, delimiter: f.delimiter, bom: !!f.bom })),
  }, null, 2)}\n`);
}

export function buildDemoSeedDatasets(): DemoSeedDataset[] {
  return [buildDemo200(), buildDemo1500(), buildDemo5400()];
}

if (require.main === module) {
  generateBlindFixtures();
  console.log(`Generated blind merchant CSV fixtures in ${GENERATED_DIR}`);
}
