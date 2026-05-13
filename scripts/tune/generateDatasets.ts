/**
 * generateDatasets.ts — Phase 2
 *
 * Generates 30 synthetic datasets:
 *   - 10 × 10 000 orders  (small)
 *   - 10 × 30 000 orders  (medium)
 *   - 10 × 75 000 orders  (large)
 *
 * Each file pair: <dataset>_orders.json + <dataset>_ground_truth.json
 *
 * Usage (ts-node):
 *   npx ts-node --project tsconfig.json scripts/tune/generateDatasets.ts
 */

import { randomUUID, createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import type { SyntheticOrder, GroundTruth, CanonicalCustomer, FalsePositiveTrap, SignalType } from './types';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DATASET_SIZES = [10_000, 30_000, 75_000] as const;
const DATASETS_PER_SIZE = 10;
const OUT_DIR = path.resolve(__dirname, '../../test-data/tune');

// Scenario weights (must sum to 1.0)
const SCENARIO_WEIGHTS: [string, number][] = [
  ['exact_email_match',         0.12],
  ['card_fingerprint_match',    0.10],
  ['card_last4_match',          0.08],
  ['phone_match',               0.08],
  ['device_fingerprint_match',  0.08],
  ['shipping_address_match',    0.07],
  ['ip_address_match',          0.05],
  ['name_fuzzy_match',          0.05],
  ['account_id_match',          0.06],
  ['multi_signal_fraud_ring',   0.11],
  ['innocent_bystander_fp',     0.20],
];

// ---------------------------------------------------------------------------
// Seeded deterministic RNG (xorshift32)
// ---------------------------------------------------------------------------

function makeRng(seed: number) {
  let s = (seed >>> 0) || 1;
  return {
    next(): number {
      s ^= s << 13; s ^= s >> 17; s ^= s << 5;
      return (s >>> 0) / 0xFFFFFFFF;
    },
    int(min: number, max: number): number {
      return Math.floor(this.next() * (max - min + 1)) + min;
    },
    pick<T>(arr: readonly T[]): T {
      return arr[this.int(0, arr.length - 1)];
    },
    bool(p = 0.5): boolean {
      return this.next() < p;
    },
  };
}

// ---------------------------------------------------------------------------
// Data pools
// ---------------------------------------------------------------------------

const BASE_FIRST_NAMES = ['James','Sarah','Michael','Emma','David','Olivia','Daniel','Sophia','Ryan','Chloe','Aiden','Grace','Liam','Mia','Noah','Ava','Logan','Lily','Mason','Hannah','Amelia','Isla','Freya','Ruby','Sienna','Arthur','Oscar','Leo','Theo','Finn','Zara','Layla','Ethan','Isaac','Lucas','Ivy','Eva','Elliot','Maya','Jude'];
const BASE_LAST_NAMES  = ['Smith','Johnson','Williams','Jones','Brown','Davis','Miller','Wilson','Moore','Taylor','Anderson','Thomas','Jackson','White','Harris','Martin','Garcia','Thompson','Martinez','Robinson','Walker','Wright','Green','Hall','Allen','Young','King','Scott','Hill','Adams','Baker','Carter','Mitchell','Perez','Roberts','Turner','Phillips','Campbell','Parker','Evans'];
const EMAIL_DOMAINS = ['gmail.com','yahoo.com','hotmail.com','outlook.com','icloud.com','protonmail.com'] as const;
const STREET_ROOTS = ['High','Church','Station','Park','Victoria','King','Queen','Mill','Grove','Oak','Cedar','Willow','Maple','Ash','Bridge','Market','George','Albert','York','Baker','Canal','College','Union','Harbour','Meadow','Orchard','Priory','Castle','Abbey','Brook'];
const STREET_SUFFIXES = ['Street','Lane','Road','Avenue','Close','Drive','Way','Crescent','Place','Terrace'];

function alphaSuffix(n: number): string {
  let value = n;
  let out = '';
  do {
    out = String.fromCharCode(97 + (value % 26)) + out;
    value = Math.floor(value / 26) - 1;
  } while (value >= 0);
  return out;
}

function buildNamePool(base: string[], size: number): string[] {
  return Array.from({ length: size }, (_, i) => `${base[i % base.length]}${alphaSuffix(Math.floor(i / base.length))}`);
}

function buildStreetPool(size: number): string[] {
  return Array.from({ length: size }, (_, i) => {
    const root = STREET_ROOTS[i % STREET_ROOTS.length];
    const suffix = STREET_SUFFIXES[Math.floor(i / STREET_ROOTS.length) % STREET_SUFFIXES.length];
    return `${root} ${alphaSuffix(Math.floor(i / (STREET_ROOTS.length * STREET_SUFFIXES.length)))} ${suffix}`;
  });
}

function buildPostcodePool(size: number): string[] {
  const areas = ['SW','EC','W','M','B','LS','E','N','SE','WC','BS','CF','G','EH','L','NE','NG','OX','RG','YO'];
  return Array.from({ length: size }, (_, i) => {
    const area = areas[i % areas.length];
    const district = 1 + (Math.floor(i / areas.length) % 99);
    const sector = Math.floor(i / (areas.length * 99)) % 10;
    const unitA = String.fromCharCode(65 + (i % 20));
    const unitB = String.fromCharCode(65 + (Math.floor(i / 20) % 20));
    return `${area}${district} ${sector}${unitA}${unitB}`;
  });
}

const FIRST_NAMES = buildNamePool(BASE_FIRST_NAMES, 600);
const LAST_NAMES = buildNamePool(BASE_LAST_NAMES, 800);
const STREETS = buildStreetPool(600);
const UK_POSTCODES = buildPostcodePool(800);

type Rng = ReturnType<typeof makeRng>;

function mkEmail(rng: Rng, fn: string, ln: string, uniqueToken: string): string {
  const d = rng.pick(EMAIL_DOMAINS);
  const token = uniqueToken.replace(/[^a-z0-9]/gi, '').slice(0, 8).toLowerCase();
  switch (rng.int(0, 3)) {
    case 0: return `${fn.toLowerCase()}.${ln.toLowerCase()}.${token}@${d}`;
    case 1: return `${fn.toLowerCase()}${ln.toLowerCase()}${token}@${d}`;
    case 2: return `${fn.toLowerCase()}${token}@${d}`;
    default: return `${fn[0].toLowerCase()}${ln.toLowerCase()}${token}@${d}`;
  }
}
function mkAddress(rng: Rng): string {
  return `${rng.int(1, 200)} ${rng.pick(STREETS)}, ${rng.pick(UK_POSTCODES)}`;
}
function mkPhone(rng: Rng): string {
  return `+447${rng.int(700000000, 999999999)}`;
}
function mkCard(rng: Rng): { last4: string; bin: string; fp: string } {
  const last4 = String(rng.int(1000, 9999));
  const bin   = String(rng.int(400000, 499999));
  const fp    = createHash('sha256').update(`${bin}${last4}${rng.next()}`).digest('hex').slice(0, 16);
  return { last4, bin, fp };
}
function mkIP(rng: Rng): string {
  return `${rng.int(1,254)}.${rng.int(0,255)}.${rng.int(0,255)}.${rng.int(1,254)}`;
}
function mkDeviceFp(key: string): string {
  return createHash('sha256').update(key).digest('hex').slice(0, 16);
}

// ---------------------------------------------------------------------------
// Internal person record (used during generation only, not exported)
// ---------------------------------------------------------------------------

interface PersonRecord {
  canonicalId:      string;
  firstName:        string;
  lastName:         string;
  email:            string;
  phone:            string | null;
  shippingAddress:  string;
  card:             { last4: string; bin: string; fp: string };
  deviceFp:         string;
  ip:               string;
  accountId:        string | null;
}

function mkPerson(rng: Rng): PersonRecord {
  const fn = rng.pick(FIRST_NAMES);
  const ln = rng.pick(LAST_NAMES);
  const id = randomUUID();
  return {
    canonicalId:     id,
    firstName:       fn,
    lastName:        ln,
    email:           mkEmail(rng, fn, ln, id),
    phone:           rng.bool(0.7) ? mkPhone(rng) : null,
    shippingAddress: mkAddress(rng),
    card:            mkCard(rng),
    deviceFp:        mkDeviceFp(`device-${id}`),
    ip:              mkIP(rng),
    accountId:       rng.bool(0.6) ? `acct_${id.slice(0, 8)}` : null,
  };
}

// ---------------------------------------------------------------------------
// Order factory — emits one SyntheticOrder for a given person
// ---------------------------------------------------------------------------

function mkOrder(
  rng: Rng,
  person: PersonRecord,
  scenario: string,
  variation: number,     // 0=identical, 0.4=heavy variation
): SyntheticOrder {
  const orderId = randomUUID();

  // Start with person's canonical signals
  let email   = person.email;
  let phone   = person.phone;
  let addr    = person.shippingAddress;
  let cardL4  = person.card.last4;
  let cardBin = person.card.bin;
  let cardFp  = person.card.fp;
  let devFp   = person.deviceFp;
  let ip      = person.ip;
  let acct    = person.accountId;
  const name  = `${person.firstName} ${person.lastName}`;

  // Apply controlled variation for repeat-customer orders
  if (variation > 0) {
    if (rng.bool(variation * 0.3)) email = email.replace('@', `+${rng.int(1, 9)}@`);
    if (rng.bool(variation * 0.2) && phone) phone = phone.slice(0, -2) + String(rng.int(10, 99));
    if (rng.bool(variation * 0.15)) ip = mkIP(rng);
    if (rng.bool(variation * 0.1)) { devFp = mkDeviceFp(`device-new-${orderId}`); }
  }

  const orderDate = new Date(Date.now() - rng.int(0, 365 * 86_400_000)).toISOString();
  const isRefund  = rng.bool(0.08);
  const postcode  = addr.match(/([A-Z]{1,2}\d{1,2} ?\d[A-Z]{2})/i)?.[1] ?? null;

  return {
    order_id:           orderId,
    customer_email:     email,
    customer_name:      name,
    shipping_address:   addr,
    billing_address:    rng.bool(0.7) ? addr : mkAddress(rng),
    device_ip:          ip,
    card_last4:         cardL4,
    card_bin:           cardBin,
    card_fingerprint:   cardFp,
    device_fingerprint: devFp,
    account_id:         acct,
    phone:              phone,
    postcode,
    order_date:         orderDate,
    order_value:        rng.int(10, 500) + Math.round(rng.next() * 99) / 100,
    order_status:       isRefund ? 'refunded' : 'completed',
    refund_status:      isRefund ? 'full' : null,
    refund_reason:      isRefund ? rng.pick(['INR','SNAD','not_as_described'] as const) : null,
    refund_date:        isRefund ? new Date(Date.parse(orderDate) + rng.int(1, 30) * 86_400_000).toISOString() : null,
    payment_method:     rng.pick(['card','card','card','paypal','bank_transfer'] as const),
    _canonicalCustomerId: person.canonicalId,
    _scenario:            scenario,
  };
}

// ---------------------------------------------------------------------------
// Which SignalType does each scenario rely on?
// ---------------------------------------------------------------------------

function scenarioSignals(scenario: string): SignalType[] {
  const map: Record<string, SignalType[]> = {
    exact_email_match:        ['email_exact'],
    card_fingerprint_match:   ['card_fingerprint'],
    card_last4_match:         ['card_last4'],
    phone_match:              ['phone_exact'],
    device_fingerprint_match: ['device_exact'],
    shipping_address_match:   ['address_exact'],
    ip_address_match:         ['ip_exact'],
    name_fuzzy_match:         ['name_fuzzy'],
    account_id_match:         ['account_exact'],
    multi_signal_fraud_ring:  ['email_exact','card_fingerprint','device_exact','phone_exact'],
    innocent_bystander_fp:    ['ip_exact'],
  };
  return map[scenario] ?? ['none'];
}

// ---------------------------------------------------------------------------
// Dataset generator
// ---------------------------------------------------------------------------

function generateDataset(size: number, idx: number, seed: number): {
  orders: SyntheticOrder[];
  groundTruth: GroundTruth;
} {
  const rng = makeRng(seed);
  const orders: SyntheticOrder[]           = [];
  const canonicalCustomers: CanonicalCustomer[] = [];
  const genuinelyNewOrders: string[]       = [];
  const falsePositiveTraps: FalsePositiveTrap[] = [];

  // Canonical customer accumulator: id → orderIds[]
  const canonOrderMap = new Map<string, string[]>();

  for (const [scenario, weight] of SCENARIO_WEIGHTS) {
    const count = Math.round(weight * size);

    if (scenario === 'innocent_bystander_fp') {
      // Groups of 2–4 DIFFERENT people sharing weak/collision-prone evidence.
      let gen = 0;
      while (gen < count) {
        const groupSize = Math.min(rng.int(2, 4), count - gen);
        const trapKind = rng.pick(['shared_ip', 'household_address', 'office_address', 'similar_name', 'card_last4_collision', 'email_username_collision'] as const);
        const sharedIP = mkIP(rng);
        const sharedAddr = mkAddress(rng);
        const sharedLast4 = String(rng.int(1000, 9999));
        const sharedFirst = rng.pick(FIRST_NAMES);
        const sharedLast = rng.pick(LAST_NAMES);
        const sharedUsername = `${sharedFirst.toLowerCase()}${sharedLast.toLowerCase()}`;
        const groupOrderIds: string[] = [];
        let trapSignal: SignalType = 'ip_exact';

        for (let i = 0; i < groupSize; i++) {
          const person = mkPerson(rng);
          let availableSignals: SignalType[] = ['none'];
          const sharedPerson: PersonRecord = {
            ...person,
            ip: trapKind === 'shared_ip' ? sharedIP : person.ip,
            shippingAddress: trapKind === 'household_address' || trapKind === 'office_address'
              ? sharedAddr
              : person.shippingAddress,
            firstName: trapKind === 'similar_name' ? sharedFirst : person.firstName,
            lastName: trapKind === 'similar_name' ? sharedLast : person.lastName,
            email: trapKind === 'email_username_collision'
              ? `${sharedUsername}@${EMAIL_DOMAINS[i % EMAIL_DOMAINS.length]}`
              : person.email,
            card: trapKind === 'card_last4_collision'
              ? { ...person.card, last4: sharedLast4, bin: '', fp: '' }
              : person.card,
          };
          if (trapKind === 'shared_ip') {
            trapSignal = 'ip_exact';
            availableSignals = ['ip_exact'];
          } else if (trapKind === 'household_address' || trapKind === 'office_address') {
            trapSignal = 'address_exact';
            availableSignals = ['address_exact'];
          } else if (trapKind === 'similar_name') {
            trapSignal = 'name_exact';
            availableSignals = ['name_exact'];
          } else if (trapKind === 'card_last4_collision') {
            trapSignal = 'card_last4';
            availableSignals = ['card_last4'];
          } else {
            trapSignal = 'email_variant';
            availableSignals = ['email_variant'];
          }
          const order = mkOrder(rng, sharedPerson, scenario, 0);
          if (trapKind === 'card_last4_collision') {
            order.card_last4 = sharedLast4;
            order.card_bin = null;
            order.card_fingerprint = null;
          }
          orders.push(order);
          groupOrderIds.push(order.order_id);
          // Bystanders are each their own canonical customer
          const cc: CanonicalCustomer = {
            id:                   person.canonicalId,
            orderIds:             [order.order_id],
            scenario,
            availableSignals,
          };
          canonicalCustomers.push(cc);
          gen++;
        }

        falsePositiveTraps.push({
          orderIds:     groupOrderIds,
          reason:       `different_people_${trapKind}`,
          sharedSignal: trapSignal,
        });
      }
    } else {
      // Clusters of 2–6 orders for the SAME canonical customer
      let gen = 0;
      while (gen < count) {
        const clusterSize = Math.min(rng.int(2, 6), count - gen);
        const person = mkPerson(rng);
        const orderIds: string[] = [];

        for (let i = 0; i < clusterSize; i++) {
          const variation = i === 0 ? 0 : rng.next() * 0.35;
          const order = mkOrder(rng, person, scenario, variation);
          orders.push(order);
          orderIds.push(order.order_id);
          gen++;
        }

        canonOrderMap.set(person.canonicalId, orderIds);
        canonicalCustomers.push({
          id:               person.canonicalId,
          orderIds,
          scenario,
          availableSignals: scenarioSignals(scenario),
        });
      }
    }
  }

  // Shuffle orders
  for (let i = orders.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [orders[i], orders[j]] = [orders[j], orders[i]];
  }

  // Trim / pad to exact size
  while (orders.length > size) orders.pop();

  const groundTruth: GroundTruth = {
    datasetId:          `ds_${size}_${idx}`,
    canonicalCustomers,
    genuinelyNewOrders,
    falsePositiveTraps,
  };

  return { orders, groundTruth };
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

function main(): void {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  let n = 0;
  for (const size of DATASET_SIZES) {
    for (let i = 0; i < DATASETS_PER_SIZE; i++) {
      const seed = (0xDEAD_BEEF ^ (size * 31) ^ (i * 1337)) >>> 0;
      process.stdout.write(`[${n + 1}/30] size=${size} idx=${i} … `);
      const { orders, groundTruth } = generateDataset(size, i, seed);
      const base = path.join(OUT_DIR, `dataset_${size}_${i}`);
      fs.writeFileSync(`${base}_orders.json`,       JSON.stringify(orders, null, 0));
      fs.writeFileSync(`${base}_ground_truth.json`, JSON.stringify(groundTruth, null, 0));
      console.log(`${orders.length} orders, ${groundTruth.canonicalCustomers.length} canonical customers`);
      n++;
    }
  }
  console.log(`\nAll 30 datasets written to ${OUT_DIR}`);
}

main();
