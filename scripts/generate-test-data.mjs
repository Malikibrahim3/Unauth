#!/usr/bin/env node
/**
 * Generates two synthetic CSVs for testing ParcelClaim:
 *   1. test-data/clean.csv          — 200 legitimate orders, no fraud signals
 *   2. test-data/mixed.csv          — 400 orders, ~35% fraud, with ground_truth_label
 *
 * Each fraudulent customer exhibits at least one scoreable signal:
 *   refundRate, inrAbuse, velocity, inrSpeed, emailPattern,
 *   addressClustering, valueAnomaly, paymentChurn
 */

import { createWriteStream, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'test-data');
mkdirSync(OUT_DIR, { recursive: true });

// ── helpers ──────────────────────────────────────────────────────────────────

function rnd(min, max) {
  return Math.random() * (max - min) + min;
}
function rndInt(min, max) {
  return Math.floor(rnd(min, max + 1));
}
function pick(arr) {
  return arr[rndInt(0, arr.length - 1)];
}
function fmt2(n) {
  return n.toFixed(2);
}

const NAMES = [
  'Alice Martin','Bob Chen','Carol White','David Kim','Eve Russo',
  'Frank Osei','Grace Liu','Henry Brown','Iris Patel','Jake Torres',
  'Kate Murphy','Leo Fischer','Mia Nakamura','Noah Clark','Olivia Davis',
  'Paul Garcia','Quinn Adams','Rachel Stone','Sam Wilson','Tina Reyes',
  'Uma Singh','Victor Hall','Wendy Young','Xander Lee','Yara Moore',
  'Zoe Baker','Aaron Scott','Beth Green','Carl Lewis','Diana Hill',
];
const STREETS = [
  '12 Oak Ave','45 Maple St','78 Pine Rd','300 Elm Blvd','9 Cedar Ln',
  '1000 Birch Way','22 Walnut Dr','56 Spruce Ct','88 Ash Pl','4 Willow Ter',
];
const CITIES = ['New York NY 10001','Los Angeles CA 90001','Chicago IL 60601',
  'Houston TX 77001','Phoenix AZ 85001','Philadelphia PA 19103','San Antonio TX 78201',
  'San Diego CA 92101','Dallas TX 75201','San Jose CA 95101'];
const PAYMENT_METHODS = ['visa','mastercard','amex','paypal','apple_pay','google_pay','discover'];
const CURRENCIES = ['USD','USD','USD','USD','CAD','GBP'];
const ORDER_STATUSES_LEGIT = ['completed','completed','completed','pending'];
const DISPOSABLE_DOMAINS = ['mailinator.com','guerrillamail.com','10minutemail.com','trashmail.com','throwaway.email'];

let orderId = 10000;
function nextId() { return `ORD-${++orderId}`; }

function randomDate(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - rndInt(0, daysAgo));
  return d.toISOString().slice(0, 10);
}

function address(street, city) {
  return `${street}, ${city}, USA`;
}

function legitEmail(name) {
  const [first, last] = name.toLowerCase().split(' ');
  const domains = ['gmail.com','yahoo.com','outlook.com','icloud.com','hotmail.com'];
  return `${first}.${last}${rndInt(1,99)}@${pick(domains)}`;
}

function csvRow(fields) {
  return fields.map(f => {
    const s = String(f ?? '');
    return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(',');
}

const HEADER = [
  'order_id','order_date','customer_email','customer_name','shipping_address',
  'order_total','currency','order_status','customer_phone','billing_address',
  'refund_status','refund_reason','refund_date','refund_amount','payment_method',
  'ip_address','device_id','ground_truth_label',
];

// ── legitimate order builder ──────────────────────────────────────────────────

function makeLegitOrder(email, name, street, city, overrides = {}) {
  const total = fmt2(rnd(15, 250));
  const date = randomDate(365);
  return {
    order_id: nextId(),
    order_date: date,
    customer_email: email,
    customer_name: name,
    shipping_address: address(street, city),
    order_total: total,
    currency: pick(CURRENCIES),
    order_status: pick(ORDER_STATUSES_LEGIT),
    customer_phone: `+1${rndInt(2000000000,9999999999)}`,
    billing_address: address(street, city),
    refund_status: 'none',
    refund_reason: '',
    refund_date: '',
    refund_amount: '',
    payment_method: pick(PAYMENT_METHODS),
    ip_address: `${rndInt(1,254)}.${rndInt(0,254)}.${rndInt(0,254)}.${rndInt(1,254)}`,
    device_id: `dev_${Math.random().toString(36).slice(2,10)}`,
    ground_truth_label: 'legitimate',
    ...overrides,
  };
}

// ── fraud pattern builders ────────────────────────────────────────────────────

// Signal: inrAbuse — 3+ INR claims
function makeInrAbuserOrders(name) {
  const email = legitEmail(name);
  const street = pick(STREETS);
  const city = pick(CITIES);
  const orders = [];
  // 3 INR refunds
  for (let i = 0; i < 3; i++) {
    const total = fmt2(rnd(40, 300));
    const orderDate = randomDate(180);
    const refDate = new Date(orderDate);
    refDate.setDate(refDate.getDate() + rndInt(5, 30));
    orders.push(makeLegitOrder(email, name, street, city, {
      order_status: 'refunded',
      refund_status: 'full',
      refund_reason: 'inr',
      refund_date: refDate.toISOString().slice(0, 10),
      refund_amount: total,
      order_total: total,
      ground_truth_label: 'fraud',
    }));
  }
  // 1 normal order
  orders.push(makeLegitOrder(email, name, street, city, { ground_truth_label: 'fraud' }));
  return orders;
}

// Signal: refundRate — >80% refund rate over 5+ orders
function makeHighRefundRateOrders(name) {
  const email = legitEmail(name);
  const street = pick(STREETS);
  const city = pick(CITIES);
  const orders = [];
  for (let i = 0; i < 5; i++) {
    const total = fmt2(rnd(20, 200));
    const orderDate = randomDate(300);
    const refDate = new Date(orderDate);
    refDate.setDate(refDate.getDate() + rndInt(3, 20));
    const isRefund = i < 4; // 4/5 = 80%
    orders.push(makeLegitOrder(email, name, street, city, {
      order_total: total,
      order_status: isRefund ? 'refunded' : 'completed',
      refund_status: isRefund ? 'full' : 'none',
      refund_reason: isRefund ? pick(['not_as_described','changed_mind','damaged']) : '',
      refund_date: isRefund ? refDate.toISOString().slice(0, 10) : '',
      refund_amount: isRefund ? total : '',
      ground_truth_label: 'fraud',
    }));
  }
  return orders;
}

// Signal: velocity — 5+ orders within 24h
function makeVelocityOrders(name) {
  const email = legitEmail(name);
  const street = pick(STREETS);
  const city = pick(CITIES);
  const burstDate = randomDate(60);
  const orders = [];
  for (let i = 0; i < 6; i++) {
    orders.push(makeLegitOrder(email, name, street, city, {
      order_date: burstDate,
      ground_truth_label: 'fraud',
    }));
  }
  return orders;
}

// Signal: inrSpeed — INR claimed within 48h of order
function makeInrSpeedOrders(name) {
  const email = legitEmail(name);
  const street = pick(STREETS);
  const city = pick(CITIES);
  const orders = [];
  for (let i = 0; i < 2; i++) {
    const orderDate = randomDate(120);
    const refDate = new Date(orderDate);
    refDate.setDate(refDate.getDate() + 1); // next day = 24h
    const total = fmt2(rnd(50, 400));
    orders.push(makeLegitOrder(email, name, street, city, {
      order_total: total,
      order_date: orderDate,
      order_status: 'refunded',
      refund_status: 'full',
      refund_reason: 'inr',
      refund_date: refDate.toISOString().slice(0, 10),
      refund_amount: total,
      ground_truth_label: 'fraud',
    }));
  }
  // pad with legit
  orders.push(makeLegitOrder(email, name, street, city, { ground_truth_label: 'fraud' }));
  return orders;
}

// Signal: emailPattern — disposable email domain
function makeDisposableEmailOrders(name) {
  const [first, last] = name.toLowerCase().split(' ');
  const email = `${first}${last}${rndInt(1,9999)}@${pick(DISPOSABLE_DOMAINS)}`;
  const street = pick(STREETS);
  const city = pick(CITIES);
  return [
    makeLegitOrder(email, name, street, city, { ground_truth_label: 'fraud' }),
    makeLegitOrder(email, name, street, city, { ground_truth_label: 'fraud' }),
  ];
}

// Signal: addressClustering — same shipping address, different emails
function makeAddressClusterOrders(sharedStreet, sharedCity) {
  const addr = address(sharedStreet, sharedCity);
  const orders = [];
  for (let i = 0; i < 4; i++) {
    const name = pick(NAMES);
    const email = legitEmail(name + i);
    orders.push(makeLegitOrder(email, name, sharedStreet, sharedCity, {
      shipping_address: addr,
      ground_truth_label: 'fraud',
    }));
  }
  return orders;
}

// Signal: valueAnomaly — one huge order among small ones
function makeValueAnomalyOrders(name) {
  const email = legitEmail(name);
  const street = pick(STREETS);
  const city = pick(CITIES);
  const orders = [];
  // 4 small orders to establish baseline
  for (let i = 0; i < 4; i++) {
    orders.push(makeLegitOrder(email, name, street, city, {
      order_total: fmt2(rnd(10, 30)),
      ground_truth_label: 'fraud',
    }));
  }
  // 1 anomalously large order
  orders.push(makeLegitOrder(email, name, street, city, {
    order_total: fmt2(rnd(800, 2000)),
    ground_truth_label: 'fraud',
  }));
  return orders;
}

// Signal: paymentChurn — 5+ distinct payment methods
function makePaymentChurnOrders(name) {
  const email = legitEmail(name);
  const street = pick(STREETS);
  const city = pick(CITIES);
  const methods = ['visa','mastercard','amex','paypal','apple_pay','google_pay'];
  return methods.map(pm =>
    makeLegitOrder(email, name, street, city, {
      payment_method: pm,
      ground_truth_label: 'fraud',
    })
  );
}

// ── write CSV ─────────────────────────────────────────────────────────────────

function writeCSV(filename, rows) {
  const path = join(OUT_DIR, filename);
  const ws = createWriteStream(path);
  ws.write(HEADER.join(',') + '\n');
  for (const row of rows) {
    ws.write(csvRow(HEADER.map(h => row[h])) + '\n');
  }
  ws.end();
  console.log(`Wrote ${rows.length} rows → ${path}`);
}

// ── clean.csv — 200 purely legitimate orders ──────────────────────────────────

const cleanRows = [];
for (let i = 0; i < 200; i++) {
  const name = pick(NAMES);
  cleanRows.push(makeLegitOrder(legitEmail(name), name, pick(STREETS), pick(CITIES)));
}
writeCSV('clean.csv', cleanRows);

// ── mixed.csv — fraud patterns + legitimate filler ───────────────────────────

const mixedRows = [];

// Fraud cohorts
const FRAUD_NAMES = NAMES.slice(0, 20);

// inrAbuse × 4 customers (4 orders each = 16 rows)
for (let i = 0; i < 4; i++) mixedRows.push(...makeInrAbuserOrders(FRAUD_NAMES[i]));

// highRefundRate × 4 customers (5 orders each = 20 rows)
for (let i = 4; i < 8; i++) mixedRows.push(...makeHighRefundRateOrders(FRAUD_NAMES[i]));

// velocity × 3 customers (6 orders each = 18 rows)
for (let i = 8; i < 11; i++) mixedRows.push(...makeVelocityOrders(FRAUD_NAMES[i]));

// inrSpeed × 3 customers (3 orders each = 9 rows)
for (let i = 11; i < 14; i++) mixedRows.push(...makeInrSpeedOrders(FRAUD_NAMES[i]));

// disposableEmail × 3 customers (2 orders each = 6 rows)
for (let i = 14; i < 17; i++) mixedRows.push(...makeDisposableEmailOrders(FRAUD_NAMES[i]));

// addressClustering × 2 clusters (4 orders each = 8 rows)
mixedRows.push(...makeAddressClusterOrders('12 Oak Ave', 'New York NY 10001'));
mixedRows.push(...makeAddressClusterOrders('45 Maple St', 'Los Angeles CA 90001'));

// valueAnomaly × 3 customers (5 orders each = 15 rows)
for (let i = 17; i < 20; i++) mixedRows.push(...makeValueAnomalyOrders(FRAUD_NAMES[i]));

// paymentChurn × 2 customers (6 orders each = 12 rows)
for (let i = 0; i < 2; i++) mixedRows.push(...makePaymentChurnOrders(NAMES[20 + i]));

// Fill remainder with legitimate orders up to ~400 total
const fraudCount = mixedRows.length;
const targetTotal = 400;
for (let i = fraudCount; i < targetTotal; i++) {
  const name = pick(NAMES.slice(22));
  mixedRows.push(makeLegitOrder(legitEmail(name), name, pick(STREETS), pick(CITIES)));
}

// Shuffle
for (let i = mixedRows.length - 1; i > 0; i--) {
  const j = rndInt(0, i);
  [mixedRows[i], mixedRows[j]] = [mixedRows[j], mixedRows[i]];
}

writeCSV('mixed.csv', mixedRows);

const fraudInMixed = mixedRows.filter(r => r.ground_truth_label === 'fraud').length;
console.log(`mixed.csv: ${fraudInMixed} fraud / ${mixedRows.length - fraudInMixed} legitimate`);
