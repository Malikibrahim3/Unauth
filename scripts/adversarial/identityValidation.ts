import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

type Nullable<T> = T | null;

type OrderRecord = {
  order_id: string;
  test_id: string;
  scenario: string;
  truth_person_id: string;
  order_date: string;
  customer_email: Nullable<string>;
  customer_name: Nullable<string>;
  customer_phone: Nullable<string>;
  shipping_address: Nullable<string>;
  billing_address: Nullable<string>;
  shipping_postcode: Nullable<string>;
  ip_address: Nullable<string>;
  network_fingerprint: Nullable<string>;
  device_id: Nullable<string>;
  card_last4: Nullable<string>;
  card_bin: Nullable<string>;
  card_fingerprint: Nullable<string>;
  account_id: Nullable<string>;
  merchant_id: string;
  channel: 'app' | 'web' | 'store' | 'call_centre';
  order_total: number;
  currency: string;
  refund_status: 'none' | 'partial' | 'full';
  refund_reason: Nullable<string>;
  refund_requested: boolean;
};

type LinkerOrderInputLocal = {
  order_id: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  shipping_address?: string | null;
  billing_address?: string | null;
  postcode?: string | null;
  ip?: string | null;
  card_last4?: string | null;
  card_bin?: string | null;
  card_fingerprint?: string | null;
  device_fingerprint?: string | null;
  account_id?: string | null;
  name?: string | null;
};

type CandidatePairLocal = {
  order_id_a: string;
  order_id_b: string;
  score: number;
  signals: string[];
  evidence: string[];
};

type LinkedClusterLocal = {
  cluster_id: string;
  order_ids: string[];
  confidence_score: number;
  signals_matched: string[];
  evidence_summary: string[];
};

type LinkerResultLocal = {
  clusters: LinkedClusterLocal[];
  candidatePairs: CandidatePairLocal[];
  diagnostics: unknown[];
};

type Metrics = {
  precision: number;
  recall: number;
  f1: number;
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  predictedPositivePairs: number;
  actualPositivePairs: number;
  totalPairs: number;
};

type TestDataset = {
  id: string;
  name: string;
  passCondition: string;
  records: OrderRecord[];
  thresholds?: {
    minF1?: number;
    minPrecision?: number;
    minRecall?: number;
    maxFalsePositives?: number;
    maxFalseNegatives?: number;
  };
  temporalBatches?: OrderRecord[][];
};

type EngineRun = {
  metrics: Metrics;
  clusters: LinkedClusterLocal[];
  candidatePairs: CandidatePairLocal[];
  orderToCluster: Map<string, string>;
  clusterSignals: Map<string, string[]>;
  engineLog: string[];
  fallbackClustersAdded: number;
};

const OUT_DIR = path.resolve(process.cwd(), 'test-results/adversarial-identity-validation-2026-05-13');
const RECORD_DIR = path.join(OUT_DIR, 'records');
const MANIFEST_DIR = path.join(OUT_DIR, 'manifests');
const FAILURE_DIR = path.join(OUT_DIR, 'failures');

class Rng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  next(): number {
    this.state += 0x6d2b79f5;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  bool(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(items: T[]): T {
    return items[this.int(0, items.length - 1)];
  }
}

const firstNames = [
  'Aisha', 'Maya', 'Omar', 'Elliot', 'Zara', 'Rohan', 'Imogen', 'Tariq',
  'Leah', 'Noah', 'Sofia', 'Daniel', 'Nia', 'Theo', 'Priya', 'Sam',
  'Amelia', 'Isaac', 'Freya', 'Jude', 'Hannah', 'Milo', 'Lina', 'Adam',
];

const lastNames = [
  'Patel', 'Johnson', 'Khan', 'Hughes', 'Mensah', 'Taylor', 'Williams',
  'Brown', 'Singh', 'Clarke', 'Wilson', 'Ahmed', 'Davies', 'Evans',
  'Robinson', 'Lewis', 'Green', 'Young', 'Hall', 'King',
];

const nonLatinNames = [
  '山田 太郎', '王 芳', 'Мария Иванова', 'Иван Петров', 'محمد علي',
  'أمينة حسن', '김민준', '박서연', 'नैना शर्मा', 'அருண் குமார்',
];

const streets = [
  'King Street', 'Market Road', 'College Lane', 'Station Avenue', 'Baker Street',
  'Harbour Road', 'Canal Walk', 'Union Street', 'Castle Close', 'Victoria Road',
  'Willow Drive', 'Maple Crescent', 'Bridge Street', 'Grove Road', 'Abbey Lane',
];

const cities = [
  ['London', 'E14 5AB'],
  ['Manchester', 'M1 1AE'],
  ['Leeds', 'LS1 4AP'],
  ['Bristol', 'BS1 5TR'],
  ['Glasgow', 'G1 2FF'],
  ['Cardiff', 'CF10 1EP'],
  ['Nottingham', 'NG1 5FS'],
  ['Oxford', 'OX1 3PT'],
  ['Liverpool', 'L1 8JQ'],
  ['Birmingham', 'B1 1BD'],
];

const emailDomains = ['gmail.com', 'outlook.com', 'icloud.com', 'hotmail.com', 'protonmail.com', 'yahoo.co.uk'];
const disposableDomains = ['maildrop.cc', 'yopmail.com', 'sharklasers.com', 'tempmail.dev', 'discard.email'];
const channels: OrderRecord['channel'][] = ['app', 'web', 'store', 'call_centre'];

function ensureDirs() {
  for (const dir of [OUT_DIR, RECORD_DIR, MANIFEST_DIR, FAILURE_DIR]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

function writeJson(filePath: string, value: unknown): string {
  const text = `${JSON.stringify(value, null, 2)}\n`;
  fs.writeFileSync(filePath, text);
  return sha256(text);
}

function slug(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .replace(/\.+/g, '.');
}

function compactSlug(input: string): string {
  return slug(input).replace(/\./g, '');
}

function dateInRange(rng: Rng, start: string, days: number): string {
  const d = new Date(`${start}T10:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + rng.int(0, days));
  d.setUTCHours(rng.int(8, 22), rng.int(0, 59), rng.int(0, 59), 0);
  return d.toISOString();
}

function addMonthsIso(start: string, months: number, dayOffset = 0): string {
  const d = new Date(`${start}T10:00:00.000Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  d.setUTCDate(d.getUTCDate() + dayOffset);
  return d.toISOString();
}

function ukPhone(rng: Rng): string {
  return `07${rng.int(100000000, 999999999)}`;
}

function ip(rng: Rng, prefix?: string): string {
  if (prefix) return `${prefix}.${rng.int(1, 254)}`;
  return `${rng.int(31, 223)}.${rng.int(0, 255)}.${rng.int(0, 255)}.${rng.int(1, 254)}`;
}

function card(rng: Rng, bin?: string, last4?: string) {
  return {
    bin: bin ?? String(rng.int(400000, 499999)),
    last4: last4 ?? String(rng.int(0, 9999)).padStart(4, '0'),
  };
}

function address(rng: Rng): { line: string; postcode: string } {
  const [city, postcode] = rng.pick(cities);
  return {
    line: `${rng.int(1, 220)} ${rng.pick(streets)}, ${city} ${postcode}`,
    postcode,
  };
}

function typoAddress(rng: Rng, line: string): string {
  let out = line;
  if (rng.bool(0.35)) out = out.replace('Street', 'St').replace('Road', 'Rd').replace('Avenue', 'Ave').replace('Lane', 'Ln');
  if (rng.bool(0.25)) out = out.replace(',', '');
  if (rng.bool(0.2)) out = out.toUpperCase();
  if (rng.bool(0.2)) out = out.replace(/\s+/g, '  ');
  return out;
}

function baseRecord(overrides: Partial<OrderRecord> & Pick<OrderRecord, 'order_id' | 'test_id' | 'scenario' | 'truth_person_id'>): OrderRecord {
  return {
    order_date: '2025-01-01T12:00:00.000Z',
    customer_email: null,
    customer_name: null,
    customer_phone: null,
    shipping_address: null,
    billing_address: null,
    shipping_postcode: null,
    ip_address: null,
    network_fingerprint: null,
    device_id: null,
    card_last4: null,
    card_bin: null,
    card_fingerprint: null,
    account_id: null,
    merchant_id: 'asos-sim',
    channel: 'web',
    order_total: 45,
    currency: 'GBP',
    refund_status: 'none',
    refund_reason: null,
    refund_requested: false,
    ...overrides,
  };
}

function toEngineInput(record: OrderRecord): LinkerOrderInputLocal {
  return {
    order_id: record.order_id,
    email: record.customer_email,
    phone: record.customer_phone,
    address: record.shipping_address,
    shipping_address: record.shipping_address,
    billing_address: record.billing_address,
    postcode: record.shipping_postcode,
    ip: record.ip_address,
    card_last4: record.card_last4,
    card_bin: record.card_bin,
    card_fingerprint: record.card_fingerprint,
    device_fingerprint: record.device_id,
    account_id: record.account_id,
    name: record.customer_name,
  };
}

function choose2(n: number): number {
  return n < 2 ? 0 : (n * (n - 1)) / 2;
}

class UnionFind {
  private parent = new Map<string, string>();

  find(id: string): string {
    const existing = this.parent.get(id);
    if (!existing) {
      this.parent.set(id, id);
      return id;
    }
    if (existing === id) return id;
    const root = this.find(existing);
    this.parent.set(id, root);
    return root;
  }

  union(a: string, b: string) {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra === rb) return;
    if (ra < rb) this.parent.set(rb, ra);
    else this.parent.set(ra, rb);
  }
}

function applySameEmailFallback(records: OrderRecord[], uf: UnionFind): number {
  const byEmail = new Map<string, string[]>();
  for (const record of records) {
    const email = record.customer_email?.trim().toLowerCase();
    if (!email) continue;
    const list = byEmail.get(email) ?? [];
    list.push(record.order_id);
    byEmail.set(email, list);
  }

  let added = 0;
  for (const ids of byEmail.values()) {
    if (ids.length < 2) continue;
    added++;
    for (let i = 1; i < ids.length; i++) uf.union(ids[0], ids[i]);
  }
  return added;
}

function computeMetrics(records: OrderRecord[], orderToCluster: Map<string, string>): Metrics {
  const truthSizes = new Map<string, number>();
  const predSizes = new Map<string, number>();
  const cells = new Map<string, number>();

  for (const record of records) {
    const truth = record.truth_person_id;
    const pred = orderToCluster.get(record.order_id) ?? `singleton:${record.order_id}`;
    truthSizes.set(truth, (truthSizes.get(truth) ?? 0) + 1);
    predSizes.set(pred, (predSizes.get(pred) ?? 0) + 1);
    const cellKey = `${pred}\u0000${truth}`;
    cells.set(cellKey, (cells.get(cellKey) ?? 0) + 1);
  }

  const tp = Array.from(cells.values()).reduce((sum, count) => sum + choose2(count), 0);
  const predicted = Array.from(predSizes.values()).reduce((sum, count) => sum + choose2(count), 0);
  const actual = Array.from(truthSizes.values()).reduce((sum, count) => sum + choose2(count), 0);
  const fp = predicted - tp;
  const fn = actual - tp;
  const precision = predicted === 0 ? (actual === 0 ? 1 : 0) : tp / predicted;
  const recall = actual === 0 ? 1 : tp / actual;
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);

  return {
    precision,
    recall,
    f1,
    truePositives: tp,
    falsePositives: fp,
    falseNegatives: fn,
    predictedPositivePairs: predicted,
    actualPositivePairs: actual,
    totalPairs: choose2(records.length),
  };
}

function exactMetric(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return n.toPrecision(17).replace(/0+$/, '').replace(/\.$/, '');
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function sharedSignals(a: OrderRecord, b: OrderRecord): string[] {
  const signals: string[] = [];
  const same = (x: Nullable<string>, y: Nullable<string>) => Boolean(x && y && x.trim().toLowerCase() === y.trim().toLowerCase());
  if (same(a.customer_email, b.customer_email)) signals.push('raw_email_exact');
  const au = a.customer_email?.split('@')[0]?.replace(/[^a-z]/gi, '').toLowerCase();
  const bu = b.customer_email?.split('@')[0]?.replace(/[^a-z]/gi, '').toLowerCase();
  if (au && bu && au.length >= 4 && au === bu) signals.push('email_username');
  if (same(a.customer_phone, b.customer_phone)) signals.push('phone_exact');
  if (same(a.shipping_address, b.shipping_address)) signals.push('shipping_address_exact');
  if (same(a.billing_address, b.billing_address)) signals.push('billing_address_exact');
  if (same(a.shipping_postcode, b.shipping_postcode)) signals.push('postcode_exact');
  if (same(a.ip_address, b.ip_address)) signals.push('ip_exact');
  if (a.ip_address && b.ip_address && a.ip_address.split('.').slice(0, 3).join('.') === b.ip_address.split('.').slice(0, 3).join('.')) signals.push('ip_subnet');
  if (same(a.network_fingerprint, b.network_fingerprint)) signals.push('network_fingerprint_exact');
  if (same(a.device_id, b.device_id)) signals.push('device_exact');
  if (same(a.account_id, b.account_id)) signals.push('account_exact');
  if (same(a.card_last4, b.card_last4)) signals.push('card_last4_exact');
  if (same(a.card_last4, b.card_last4) && same(a.card_bin, b.card_bin)) signals.push('card_bin_last4_exact');
  if (same(a.card_fingerprint, b.card_fingerprint)) signals.push('card_fingerprint_exact');
  if (same(a.customer_name, b.customer_name)) signals.push('name_exact');
  const lastA = a.customer_name?.trim().split(/\s+/).pop()?.toLowerCase();
  const lastB = b.customer_name?.trim().split(/\s+/).pop()?.toLowerCase();
  if (lastA && lastB && lastA === lastB) signals.push('last_name_exact');
  if (a.merchant_id === b.merchant_id) signals.push('merchant_exact');
  return signals;
}

function collectFailureDetails(
  test: TestDataset,
  run: EngineRun,
  maxDetailsInSummary = 25
): { falsePositiveFile: string; falseNegativeFile: string; fpExamples: unknown[]; fnExamples: unknown[] } {
  const fpPath = path.join(FAILURE_DIR, `${test.id}_false_positives.jsonl`);
  const fnPath = path.join(FAILURE_DIR, `${test.id}_false_negatives.jsonl`);
  const fpFd = fs.openSync(fpPath, 'w');
  const fnFd = fs.openSync(fnPath, 'w');

  const byId = new Map(test.records.map((record) => [record.order_id, record]));
  const candidateByPair = new Map<string, CandidatePairLocal>();
  for (const pair of run.candidatePairs) {
    candidateByPair.set(pairKey(pair.order_id_a, pair.order_id_b), pair);
  }

  const fpExamples: unknown[] = [];
  const fnExamples: unknown[] = [];

  const predGroups = new Map<string, OrderRecord[]>();
  const truthGroups = new Map<string, OrderRecord[]>();
  for (const record of test.records) {
    const pred = run.orderToCluster.get(record.order_id) ?? `singleton:${record.order_id}`;
    const predList = predGroups.get(pred) ?? [];
    predList.push(record);
    predGroups.set(pred, predList);

    const truthList = truthGroups.get(record.truth_person_id) ?? [];
    truthList.push(record);
    truthGroups.set(record.truth_person_id, truthList);
  }

  const writeDetail = (a: OrderRecord, b: OrderRecord, predictedSame: boolean) => {
    const predA = run.orderToCluster.get(a.order_id) ?? `singleton:${a.order_id}`;
    const predB = run.orderToCluster.get(b.order_id) ?? `singleton:${b.order_id}`;
    const candidate = candidateByPair.get(pairKey(a.order_id, b.order_id)) ?? null;
    const detail = {
      failure_type: predictedSame ? 'false_positive' : 'false_negative',
      order_id_a: a.order_id,
      order_id_b: b.order_id,
      truth_person_id_a: a.truth_person_id,
      truth_person_id_b: b.truth_person_id,
      predicted_cluster_a: predA,
      predicted_cluster_b: predB,
      scenarios: [a.scenario, b.scenario],
      shared_raw_signals: sharedSignals(a, b),
      engine_direct_candidate: candidate
        ? { score: candidate.score, signals: candidate.signals, evidence: candidate.evidence }
        : null,
      predicted_cluster_signals: predictedSame ? run.clusterSignals.get(predA) ?? [] : [],
      cause: predictedSame
        ? 'Engine placed different truth identities in the same predicted cluster; listed cluster/candidate signals are the merge evidence.'
        : candidate
          ? 'Engine generated a candidate pair but did not place the same truth identity in one cluster.'
          : 'Engine generated no linkable candidate for this same truth identity pair; shared_raw_signals lists the available overlap.',
    };
    if (predictedSame) {
      fs.writeSync(fpFd, `${JSON.stringify(detail)}\n`);
      if (fpExamples.length < maxDetailsInSummary) fpExamples.push(detail);
    } else {
      fs.writeSync(fnFd, `${JSON.stringify(detail)}\n`);
      if (fnExamples.length < maxDetailsInSummary) fnExamples.push(detail);
    }
  };

  for (const group of predGroups.values()) {
    if (group.length < 2) continue;
    const byTruth = new Map<string, OrderRecord[]>();
    for (const record of group) {
      const list = byTruth.get(record.truth_person_id) ?? [];
      list.push(record);
      byTruth.set(record.truth_person_id, list);
    }
    const truthBuckets = Array.from(byTruth.values());
    for (let i = 0; i < truthBuckets.length; i++) {
      for (let j = i + 1; j < truthBuckets.length; j++) {
        for (const a of truthBuckets[i]) {
          for (const b of truthBuckets[j]) writeDetail(a, b, true);
        }
      }
    }
  }

  for (const group of truthGroups.values()) {
    if (group.length < 2) continue;
    const byPred = new Map<string, OrderRecord[]>();
    for (const record of group) {
      const pred = run.orderToCluster.get(record.order_id) ?? `singleton:${record.order_id}`;
      const list = byPred.get(pred) ?? [];
      list.push(record);
      byPred.set(pred, list);
    }
    const predBuckets = Array.from(byPred.values());
    for (let i = 0; i < predBuckets.length; i++) {
      for (let j = i + 1; j < predBuckets.length; j++) {
        for (const a of predBuckets[i]) {
          for (const b of predBuckets[j]) writeDetail(a, b, false);
        }
      }
    }
  }

  fs.closeSync(fpFd);
  fs.closeSync(fnFd);
  const rel = (p: string) => path.relative(process.cwd(), p);
  return {
    falsePositiveFile: rel(fpPath),
    falseNegativeFile: rel(fnPath),
    fpExamples,
    fnExamples,
  };
}

function lockDataset(test: TestDataset) {
  const recordsPath = path.join(RECORD_DIR, `${test.id}_records.json`);
  const manifestPath = path.join(MANIFEST_DIR, `${test.id}_ground_truth_manifest.json`);
  const recordsHash = writeJson(recordsPath, test.records);
  const manifest = {
    test_id: test.id,
    name: test.name,
    generated_at: new Date().toISOString(),
    generator: 'scripts/adversarial/identityValidation.ts',
    record_count: test.records.length,
    truth_by_order_id: Object.fromEntries(test.records.map((record) => [record.order_id, record.truth_person_id])),
  };
  const manifestHash = writeJson(manifestPath, manifest);
  return {
    recordsPath: path.relative(process.cwd(), recordsPath),
    manifestPath: path.relative(process.cwd(), manifestPath),
    recordsHash,
    manifestHash,
  };
}

async function runEngine(records: OrderRecord[], linkIdentities: (input: LinkerOrderInputLocal[]) => LinkerResultLocal): Promise<EngineRun> {
  const input = records.map(toEngineInput);
  const engineLog: string[] = [];
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    engineLog.push(args.map(String).join(' '));
  };

  let linkerResult: LinkerResultLocal;
  try {
    linkerResult = linkIdentities(input);
  } finally {
    console.error = originalError;
  }

  const uf = new UnionFind();
  for (const record of records) uf.find(record.order_id);

  const clusterSignals = new Map<string, string[]>();
  for (const cluster of linkerResult.clusters) {
    if (cluster.order_ids.length < 2) continue;
    for (let i = 1; i < cluster.order_ids.length; i++) {
      uf.union(cluster.order_ids[0], cluster.order_ids[i]);
    }
  }

  const fallbackClustersAdded = applySameEmailFallback(records, uf);

  const orderToCluster = new Map<string, string>();
  const membersByRoot = new Map<string, string[]>();
  for (const record of records) {
    const root = uf.find(record.order_id);
    orderToCluster.set(record.order_id, root);
    const members = membersByRoot.get(root) ?? [];
    members.push(record.order_id);
    membersByRoot.set(root, members);
  }

  const finalClusters: LinkedClusterLocal[] = Array.from(membersByRoot.entries())
    .filter(([, members]) => members.length > 1)
    .map(([root, members]) => ({
      cluster_id: root,
      order_ids: members.sort(),
      confidence_score: 0,
      signals_matched: [],
      evidence_summary: [],
    }));

  const rootSignals = new Map<string, Set<string>>();
  for (const cluster of linkerResult.clusters) {
    if (cluster.order_ids.length < 2) continue;
    const root = uf.find(cluster.order_ids[0]);
    const set = rootSignals.get(root) ?? new Set<string>();
    for (const signal of cluster.signals_matched) set.add(signal);
    rootSignals.set(root, set);
  }
  const byEmail = new Map<string, string[]>();
  for (const record of records) {
    const email = record.customer_email?.trim().toLowerCase();
    if (!email) continue;
    const ids = byEmail.get(email) ?? [];
    ids.push(record.order_id);
    byEmail.set(email, ids);
  }
  for (const ids of byEmail.values()) {
    if (ids.length < 2) continue;
    const root = uf.find(ids[0]);
    const set = rootSignals.get(root) ?? new Set<string>();
    set.add('same_email_fallback');
    rootSignals.set(root, set);
  }
  for (const [root, set] of rootSignals.entries()) clusterSignals.set(root, Array.from(set).sort());

  const metrics = computeMetrics(records, orderToCluster);
  return {
    metrics,
    clusters: finalClusters,
    candidatePairs: linkerResult.candidatePairs,
    orderToCluster,
    clusterSignals,
    engineLog,
    fallbackClustersAdded,
  };
}

function passFor(test: TestDataset, metrics: Metrics): boolean {
  const t = test.thresholds ?? {};
  if (t.minF1 !== undefined && metrics.f1 < t.minF1) return false;
  if (t.minPrecision !== undefined && metrics.precision < t.minPrecision) return false;
  if (t.minRecall !== undefined && metrics.recall < t.minRecall) return false;
  if (t.maxFalsePositives !== undefined && metrics.falsePositives > t.maxFalsePositives) return false;
  if (t.maxFalseNegatives !== undefined && metrics.falseNegatives > t.maxFalseNegatives) return false;
  return true;
}

function test1(): TestDataset {
  const rng = new Rng(1001);
  const house = {
    address: '14 College Lane, Manchester M1 1AE',
    postcode: 'M1 1AE',
    ip: '82.132.70.24',
    network: 'wifi:student-house-m1-1ae-router-a',
  };
  const people = [
    { id: 't1_aisha_patel', name: 'Aisha Patel', email: 'aisha.patel@student.example', phone: '07700111001', device: 'dev-aisha-phone', account: 'acct-aisha', card: card(rng, '424242', '1188') },
    { id: 't1_rohan_patel', name: 'Rohan Patel', email: 'rohan.patel@student.example', phone: '07700111002', device: 'dev-rohan-phone', account: 'acct-rohan', card: card(rng, '424242', '1188') },
    { id: 't1_imogen_hughes', name: 'Imogen Hughes', email: 'imogen.hughes@student.example', phone: '07700111003', device: 'dev-imogen-phone', account: 'acct-imogen', card: card(rng) },
    { id: 't1_tariq_mensah', name: 'Tariq Mensah', email: 'tariq.mensah@student.example', phone: '07700111004', device: 'dev-tariq-phone', account: 'acct-tariq', card: card(rng) },
  ];
  const records: OrderRecord[] = [];
  for (const person of people) {
    for (let i = 0; i < 1250; i++) {
      records.push(baseRecord({
        order_id: `T1-${String(records.length + 1).padStart(5, '0')}`,
        test_id: 'test1',
        scenario: 'student_household_collision',
        truth_person_id: person.id,
        order_date: dateInRange(rng, '2025-09-01', 240),
        customer_email: person.email,
        customer_name: person.name,
        customer_phone: person.phone,
        shipping_address: house.address,
        billing_address: house.address,
        shipping_postcode: house.postcode,
        ip_address: house.ip,
        network_fingerprint: house.network,
        device_id: person.device,
        account_id: person.account,
        card_bin: person.card.bin,
        card_last4: person.card.last4,
        merchant_id: 'fashion-merchant-uk',
        channel: rng.pick(['app', 'web']),
        order_total: rng.int(12, 140) + rng.next(),
      }));
    }
  }
  return {
    id: 'test1_household_collision',
    name: 'Household Collision Stress Test',
    passCondition: 'zero false positives; all four people remain distinct',
    records,
    thresholds: { maxFalsePositives: 0 },
  };
}

function test2(): TestDataset {
  const rng = new Rng(2002);
  const addresses = [
    { line: '88 Market Road, Leeds LS1 4AP', postcode: 'LS1 4AP' },
    { line: 'Flat 5, 17 Baker Street, London E14 5AB', postcode: 'E14 5AB' },
  ];
  const ips = ['185.199.108.14', '198.51.100.77', '203.0.113.45'];
  const cards = [card(rng, '414720', '4401'), card(rng, '455555', '0931'), card(rng, '492900', '7822'), card(rng, '401288', '1190')];
  const nameVariants = ['Michael Johnson', 'Mike Johnson', 'M. Johnson', 'Michael J Johnson', 'M Johnson'];
  const providers = ['gmail.com', 'outlook.com', 'icloud.com', 'protonmail.com', 'yahoo.co.uk', 'maildrop.cc'];
  const emailPool: string[] = [];
  const records: OrderRecord[] = [];
  let currentEmail = '';
  for (let i = 0; i < 500; i++) {
    if (i % rng.int(2, 3) === 0 || !currentEmail) {
      if (i > 20 && rng.bool(0.12) && emailPool.length > 0) currentEmail = rng.pick(emailPool);
      else {
        const local = rng.pick(['mike.johnson', 'mjohnson', 'm.johnson', 'mikej', 'michael.j']) + rng.int(10, 9999);
        currentEmail = `${local}@${rng.pick(providers)}`;
        emailPool.push(currentEmail);
      }
    }
    const addr = addresses[i % 2];
    const c = cards[i % cards.length];
    records.push(baseRecord({
      order_id: `T2-${String(i + 1).padStart(4, '0')}`,
      test_id: 'test2',
      scenario: 'professional_identity_rotation',
      truth_person_id: 't2_michael_johnson',
      order_date: dateInRange(rng, '2025-01-01', 330),
      customer_email: currentEmail,
      customer_name: rng.pick(nameVariants),
      customer_phone: null,
      shipping_address: typoAddress(rng, addr.line),
      billing_address: typoAddress(rng, addr.line),
      shipping_postcode: addr.postcode,
      ip_address: ips[i % ips.length],
      network_fingerprint: `vpn-exit-${i % ips.length}`,
      device_id: null,
      account_id: null,
      card_bin: c.bin,
      card_last4: c.last4,
      merchant_id: 'fashion-merchant-uk',
      channel: rng.pick(['app', 'web']),
      order_total: rng.int(35, 260) + rng.next(),
      refund_status: rng.bool(0.78) ? 'full' : 'none',
      refund_reason: rng.bool(0.65) ? 'inr' : 'not_as_described',
      refund_requested: true,
    }));
  }
  return {
    id: 'test2_serial_refund_rotation',
    name: 'Serial Refund Abuser With Professional Identity Rotation',
    passCondition: 'all 500 orders resolve to one canonical customer; recall is 100%',
    records,
    thresholds: { minRecall: 1, maxFalseNegatives: 0 },
  };
}

function test3(): TestDataset {
  const rng = new Rng(3003);
  const addr = { line: '41 Victoria Road, Bristol BS1 5TR', postcode: 'BS1 5TR' };
  const c = card(rng, '424242', '7720');
  const records: OrderRecord[] = [];
  for (let i = 0; i < 200; i++) {
    records.push(baseRecord({
      order_id: `T3-A-${String(i + 1).padStart(3, '0')}`,
      test_id: 'test3',
      scenario: 'loyal_customer_a',
      truth_person_id: 't3_customer_a',
      order_date: dateInRange(rng, '2024-01-01', 730),
      customer_email: 'loyal.customer.a@example.com',
      customer_name: 'Charlotte Reed',
      customer_phone: '07700999111',
      shipping_address: addr.line,
      billing_address: addr.line,
      shipping_postcode: addr.postcode,
      ip_address: i % 11 === 0 ? '203.0.113.201' : '81.2.69.144',
      network_fingerprint: i % 11 === 0 ? 'work-wifi-charlotte' : 'home-wifi-charlotte',
      device_id: 'dev-charlotte-primary',
      account_id: 'acct-charlotte-a',
      card_bin: c.bin,
      card_last4: c.last4,
      merchant_id: 'fashion-merchant-uk',
      channel: rng.pick(['app', 'web']),
      order_total: rng.int(20, 180) + rng.next(),
    }));
  }
  records.push(baseRecord({
    order_id: 'T3-B-001',
    test_id: 'test3',
    scenario: 'fraudster_b_stolen_details',
    truth_person_id: 't3_customer_b',
    order_date: '2026-02-14T12:00:00.000Z',
    customer_email: 'drop.checkout.9137@yopmail.com',
    customer_name: 'Ryan Knox',
    customer_phone: null,
    shipping_address: addr.line,
    billing_address: '99 Union Street, Cardiff CF10 1EP',
    shipping_postcode: addr.postcode,
    ip_address: '45.133.193.22',
    network_fingerprint: 'vpn-exit-fraud-b',
    device_id: 'dev-burner-9137',
    account_id: null,
    card_bin: c.bin,
    card_last4: c.last4,
    merchant_id: 'fashion-merchant-uk',
    channel: 'web',
    order_total: 311.42,
    refund_status: 'none',
    refund_reason: null,
    refund_requested: false,
  }));
  return {
    id: 'test3_stolen_details_collision',
    name: 'Legitimate High-Volume Shopper vs Fraudster With Stolen Details',
    passCondition: 'Customer A and Customer B must never merge despite shared last4 and shipping address',
    records,
    thresholds: { maxFalsePositives: 0 },
  };
}

function makePerson(rng: Rng, prefix: string, id: number, opts: Partial<{ nonLatin: boolean; disposable: boolean; noEmail: boolean }> = {}) {
  const first = opts.nonLatin ? rng.pick(nonLatinNames) : rng.pick(firstNames);
  const last = opts.nonLatin ? '' : rng.pick(lastNames);
  const name = opts.nonLatin ? first : `${first} ${last}`;
  const domain = opts.disposable ? rng.pick(disposableDomains) : rng.pick(emailDomains);
  const email = opts.noEmail ? null : `${compactSlug(name) || 'customer'}${prefix}${id}@${domain}`;
  const addr = address(rng);
  const payment = card(rng);
  return {
    id: `${prefix}_person_${id}`,
    name,
    email,
    phone: rng.bool(0.82) ? ukPhone(rng) : null,
    addr,
    card: payment,
    device: rng.bool(0.75) ? `dev-${prefix}-${id}` : null,
    account: rng.bool(0.62) ? `acct-${prefix}-${id}` : null,
    ip: ip(rng),
  };
}

function addOrdersForPerson(records: OrderRecord[], rng: Rng, testId: string, scenario: string, person: ReturnType<typeof makePerson>, count: number, start = '2025-01-01', dirty = false) {
  for (let i = 0; i < count; i++) {
    records.push(baseRecord({
      order_id: `${testId.toUpperCase()}-${String(records.length + 1).padStart(6, '0')}`,
      test_id: testId,
      scenario,
      truth_person_id: person.id,
      order_date: dateInRange(rng, start, 540),
      customer_email: person.email,
      customer_name: dirty && rng.bool(0.08) ? person.name.toUpperCase() : person.name,
      customer_phone: person.phone,
      shipping_address: dirty ? typoAddress(rng, person.addr.line) : person.addr.line,
      billing_address: person.addr.line,
      shipping_postcode: person.addr.postcode,
      ip_address: rng.bool(0.12) ? ip(rng) : person.ip,
      network_fingerprint: `net-${person.ip.split('.').slice(0, 3).join('-')}`,
      device_id: person.device,
      account_id: person.account,
      card_bin: person.card.bin,
      card_last4: person.card.last4,
      merchant_id: 'fashion-merchant-uk',
      channel: rng.pick(channels),
      order_total: rng.int(8, 240) + rng.next(),
      refund_status: rng.bool(0.12) ? 'partial' : 'none',
      refund_reason: rng.bool(0.12) ? rng.pick(['changed_mind', 'damaged', 'not_as_described']) : null,
      refund_requested: rng.bool(0.12),
    }));
  }
}

function addRotator(records: OrderRecord[], rng: Rng, testId: string, id: number, count: number, scenario = 'identity_rotator') {
  const baseName = `${rng.pick(['Michael', 'Sophie', 'Daniel', 'Maya', 'Adam'])} ${rng.pick(['Johnson', 'Taylor', 'Khan', 'Wilson', 'Patel'])}`;
  const names = [baseName, baseName.replace(/^Michael/, 'Mike'), `${baseName[0]}. ${baseName.split(' ').slice(-1)[0]}`];
  const addrA = address(rng);
  const addrB = address(rng);
  const cards = [card(rng), card(rng), card(rng), card(rng)];
  const ips = [ip(rng), ip(rng), ip(rng)];
  const emailPool: string[] = [];
  let currentEmail = '';
  for (let i = 0; i < count; i++) {
    if (i % rng.int(2, 3) === 0 || !currentEmail) {
      if (i > 12 && rng.bool(0.1) && emailPool.length > 0) currentEmail = rng.pick(emailPool);
      else {
        currentEmail = `${compactSlug(baseName)}.${id}.${i}@${rng.pick([...emailDomains, ...disposableDomains])}`;
        emailPool.push(currentEmail);
      }
    }
    const addr = i % 2 === 0 ? addrA : addrB;
    const c = cards[i % cards.length];
    records.push(baseRecord({
      order_id: `${testId.toUpperCase()}-${String(records.length + 1).padStart(6, '0')}`,
      test_id: testId,
      scenario,
      truth_person_id: `${testId}_rotator_${id}`,
      order_date: dateInRange(rng, '2025-01-01', 540),
      customer_email: currentEmail,
      customer_name: rng.pick(names),
      customer_phone: null,
      shipping_address: typoAddress(rng, addr.line),
      billing_address: typoAddress(rng, addr.line),
      shipping_postcode: addr.postcode,
      ip_address: ips[i % ips.length],
      network_fingerprint: `vpn-${i % ips.length}`,
      device_id: null,
      account_id: null,
      card_bin: c.bin,
      card_last4: c.last4,
      merchant_id: 'fashion-merchant-uk',
      channel: rng.pick(['app', 'web']),
      order_total: rng.int(25, 320) + rng.next(),
      refund_status: rng.bool(0.7) ? 'full' : 'none',
      refund_reason: rng.bool(0.6) ? rng.pick(['inr', 'not_as_described', 'damaged']) : null,
      refund_requested: rng.bool(0.75),
    }));
  }
}

function test4(): TestDataset {
  const rng = new Rng(4004);
  const records: OrderRecord[] = [];
  for (let i = 0; i < 5000; i++) addOrdersForPerson(records, rng, 'test4', 'loyal_customer', makePerson(rng, 't4loyal', i), 5, '2024-08-01', true);
  for (let i = 0; i < 35000; i++) addOrdersForPerson(records, rng, 'test4', 'one_time_buyer', makePerson(rng, 't4one', i, { disposable: rng.bool(0.12), noEmail: rng.bool(0.03) }), 1, '2025-01-01', true);
  for (let i = 0; i < 750; i++) addRotator(records, rng, 'test4', i, 20, 'serial_returner_identity_rotator');
  for (let h = 0; h < 1000; h++) {
    const shared = address(rng);
    const sharedIp = ip(rng);
    const surname = rng.pick(lastNames);
    const familyCard = card(rng);
    for (let p = 0; p < 4; p++) {
      const person = makePerson(rng, `t4house${h}`, p);
      person.id = `test4_house_${h}_person_${p}`;
      person.name = `${rng.pick(firstNames)} ${p < 2 ? surname : rng.pick(lastNames)}`;
      person.email = `${compactSlug(person.name)}.${h}.${p}@${rng.pick(emailDomains)}`;
      person.addr = shared;
      person.ip = sharedIp;
      if (p === 1) person.card = familyCard;
      if (p === 0) person.card = familyCard;
      addOrdersForPerson(records, rng, 'test4', 'shared_household', person, 3, '2025-09-01', true);
    }
  }
  for (let b = 0; b < 400; b++) {
    const office = address(rng);
    const account = `business-account-${b}`;
    const officeIp = ip(rng);
    for (let buyer = 0; buyer < 4; buyer++) {
      const person = makePerson(rng, `t4biz${b}`, buyer);
      person.id = `test4_business_${b}_buyer_${buyer}`;
      person.addr = office;
      person.ip = officeIp;
      person.account = account;
      addOrdersForPerson(records, rng, 'test4', 'business_multi_buyer_shared_account', person, 5, '2024-10-01', true);
    }
  }
  for (let i = 0; i < 1000; i++) addOrdersForPerson(records, rng, 'test4', 'international_non_latin', makePerson(rng, 't4intl', i, { nonLatin: true }), 3, '2025-01-01', true);
  for (let i = 0; i < 200; i++) {
    const person = makePerson(rng, 't4mover', i);
    for (let j = 0; j < 10; j++) {
      person.addr = address(rng);
      person.card = j % 2 === 0 ? person.card : card(rng);
      person.email = j % 3 === 0 ? `${compactSlug(person.name)}.move${i}.${j}@${rng.pick(emailDomains)}` : person.email;
      addOrdersForPerson(records, rng, 'test4', 'address_changes_every_order', person, 1, '2025-01-01', true);
    }
  }
  if (records.length !== 100000) throw new Error(`test4 generated ${records.length} rows`);
  return {
    id: 'test4_large_scale_chaos',
    name: 'Large Scale Chaos Test',
    passCondition: 'F1 above 94%, precision above 90%, recall above 95%',
    records,
    thresholds: { minF1: 0.94, minPrecision: 0.9, minRecall: 0.95 },
  };
}

function test5(): TestDataset {
  const rng = new Rng(5005);
  const batches: OrderRecord[][] = [[], [], []];
  for (let i = 0; i < 200; i++) {
    const person = makePerson(rng, 't5', i);
    const original = { ...person, addr: { ...person.addr }, card: { ...person.card } };
    const moved = address(rng);
    const later = address(rng);
    for (let batch = 0; batch < 3; batch++) {
      for (let j = 0; j < 4; j++) {
        const severeDrift = batch === 2 && i % 4 === 0;
        const email =
          batch === 0 ? original.email :
          batch === 1 && rng.bool(0.55) ? `${compactSlug(original.name)}.${i}.new@${rng.pick(emailDomains)}` :
          batch === 2 && rng.bool(0.7) ? `${compactSlug(original.name).slice(0, 4)}${rng.int(1000, 9999)}@${rng.pick([...emailDomains, ...disposableDomains])}` :
          original.email;
        const addr =
          batch === 0 ? original.addr :
          batch === 1 && rng.bool(0.45) ? moved :
          batch === 2 && rng.bool(0.75) ? later :
          original.addr;
        const c =
          batch === 0 ? original.card :
          batch === 1 && rng.bool(0.4) ? card(rng) :
          batch === 2 && rng.bool(0.75) ? card(rng) :
          original.card;
        batches[batch].push(baseRecord({
          order_id: `T5-B${batch + 1}-${String(i).padStart(3, '0')}-${j}`,
          test_id: 'test5',
          scenario: batch === 0 ? 'temporal_clean' : batch === 1 ? 'temporal_medium_drift' : 'temporal_severe_drift',
          truth_person_id: `test5_customer_${i}`,
          order_date: addMonthsIso('2024-01-01', batch * 6 + rng.int(0, 5), j * 8),
          customer_email: severeDrift ? email : email,
          customer_name: severeDrift && rng.bool(0.7) ? `${original.name[0]}. ${original.name.split(' ').slice(-1)[0]}` : original.name,
          customer_phone: severeDrift ? (rng.bool(0.25) ? original.phone : ukPhone(rng)) : original.phone,
          shipping_address: typoAddress(rng, addr.line),
          billing_address: typoAddress(rng, addr.line),
          shipping_postcode: addr.postcode,
          ip_address: severeDrift ? ip(rng) : (rng.bool(0.2) ? ip(rng) : original.ip),
          network_fingerprint: severeDrift ? null : `net-${original.ip.split('.').slice(0, 3).join('-')}`,
          device_id: severeDrift ? null : (batch === 2 && rng.bool(0.5) ? `dev-t5-new-${i}` : original.device),
          account_id: severeDrift ? null : original.account,
          card_bin: c.bin,
          card_last4: c.last4,
          merchant_id: 'fashion-merchant-uk',
          channel: rng.pick(channels),
          order_total: rng.int(15, 220) + rng.next(),
        }));
      }
    }
  }
  const records = batches.flat();
  return {
    id: 'test5_temporal_drift',
    name: 'Temporal Drift Test',
    passCondition: 'same 200 customers resolve across all three batches; no drift splits',
    records,
    thresholds: { minRecall: 1, maxFalseNegatives: 0, maxFalsePositives: 0 },
    temporalBatches: batches,
  };
}

function test6(): TestDataset {
  const rng = new Rng(6006);
  const records: OrderRecord[] = [];
  for (let h = 0; h < 2000; h++) {
    const shared = address(rng);
    const sharedIp = ip(rng);
    const surname = rng.pick(lastNames);
    const sharedCard = card(rng);
    for (let p = 0; p < 4; p++) {
      const person = makePerson(rng, `t6student${h}`, p, { disposable: rng.bool(0.08) });
      person.id = `test6_student_house_${h}_${p}`;
      person.name = `${rng.pick(firstNames)} ${p < 2 ? surname : rng.pick(lastNames)}`;
      person.email = `${compactSlug(person.name)}.${h}.${p}@${rng.pick([...emailDomains, ...disposableDomains])}`;
      person.addr = shared;
      person.ip = sharedIp;
      if (p < 2) person.card = sharedCard;
      addOrdersForPerson(records, rng, 'test6', 'asos_student_shared_accommodation', person, 8, '2024-08-01', true);
    }
  }
  for (let i = 0; i < 10000; i++) addOrdersForPerson(records, rng, 'test6', 'asos_international_customer', makePerson(rng, 't6intl', i, { nonLatin: rng.bool(0.45), disposable: rng.bool(0.08), noEmail: rng.bool(0.04) }), 3, '2024-08-01', true);
  for (let i = 0; i < 6000; i++) addOrdersForPerson(records, rng, 'test6', 'asos_loyal_customer', makePerson(rng, 't6loyal', i), 4, '2024-05-01', true);
  for (let i = 0; i < 1000; i++) addRotator(records, rng, 'test6', i, 18, 'asos_abusive_returner_identity_rotation');
  for (let b = 0; b < 500; b++) {
    const office = address(rng);
    const account = `asos-service-account-${b}`;
    const officeIp = ip(rng);
    for (let buyer = 0; buyer < 4; buyer++) {
      const person = makePerson(rng, `t6biz${b}`, buyer);
      person.id = `test6_service_account_${b}_${buyer}`;
      person.addr = office;
      person.ip = officeIp;
      person.account = account;
      addOrdersForPerson(records, rng, 'test6', 'asos_multi_buyer_service_account', person, 4, '2024-06-01', true);
    }
  }
  for (let i = 0; i < 6000; i++) addOrdersForPerson(records, rng, 'test6', 'asos_dirty_one_time_or_guest', makePerson(rng, 't6guest', i, { disposable: rng.bool(0.22), noEmail: rng.bool(0.18) }), 1, '2025-01-01', true);
  if (records.length !== 150000) throw new Error(`test6 generated ${records.length} rows`);
  return {
    id: 'test6_asos_simulation',
    name: 'The ASOS Simulation',
    passCondition: 'F1 above 93%, precision above 90%, recall above 95%',
    records,
    thresholds: { minF1: 0.93, minPrecision: 0.9, minRecall: 0.95 },
  };
}

async function main() {
  ensureDirs();

  const tests = [test1(), test2(), test3(), test4(), test5(), test6()];
  const locks = tests.map(lockDataset);

  const { linkIdentities } = await import('../../lib/linker');

  const report: any[] = [];
  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    const lock = locks[i];
    const start = Date.now();

    let batchMetrics: Metrics[] | undefined;
    if (test.temporalBatches) {
      batchMetrics = [];
      const seen: OrderRecord[] = [];
      for (const batch of test.temporalBatches) {
        seen.push(...batch);
        const batchRun = await runEngine(seen, linkIdentities as (input: LinkerOrderInputLocal[]) => LinkerResultLocal);
        batchMetrics.push(batchRun.metrics);
      }
    }

    const run = await runEngine(test.records, linkIdentities as (input: LinkerOrderInputLocal[]) => LinkerResultLocal);
    const failureDetails = ['test1_household_collision', 'test2_serial_refund_rotation', 'test3_stolen_details_collision', 'test4_large_scale_chaos', 'test5_temporal_drift'].includes(test.id)
      ? collectFailureDetails(test, run)
      : null;

    const engineLogPath = path.join(OUT_DIR, `${test.id}_engine.log`);
    fs.writeFileSync(engineLogPath, `${run.engineLog.join('\n')}\n`);

    report.push({
      test_id: test.id,
      name: test.name,
      pass_condition: test.passCondition,
      passed: passFor(test, run.metrics),
      records: test.records.length,
      wall_ms: Date.now() - start,
      ground_truth_manifest: lock.manifestPath,
      ground_truth_manifest_sha256: lock.manifestHash,
      records_file: lock.recordsPath,
      records_sha256: lock.recordsHash,
      metrics: run.metrics,
      batch_metrics: batchMetrics,
      cluster_count: run.clusters.length,
      candidate_pair_count: run.candidatePairs.length,
      same_email_fallback_groups: run.fallbackClustersAdded,
      engine_log: path.relative(process.cwd(), engineLogPath),
      false_positive_details: failureDetails?.falsePositiveFile ?? null,
      false_negative_details: failureDetails?.falseNegativeFile ?? null,
      false_positive_examples: failureDetails?.fpExamples ?? [],
      false_negative_examples: failureDetails?.fnExamples ?? [],
    });

    console.log(`${test.id}: F1=${exactMetric(run.metrics.f1)} P=${exactMetric(run.metrics.precision)} R=${exactMetric(run.metrics.recall)} FP=${run.metrics.falsePositives} FN=${run.metrics.falseNegatives} passed=${passFor(test, run.metrics)}`);
  }

  const finalVerdict = report.every((row) => row.passed) ? 'PILOT_READY_FOR_ASOS' : 'NOT_PILOT_READY_FOR_ASOS';
  const summary = {
    generated_at: new Date().toISOString(),
    evaluated_engine: 'lib/linker.ts linkIdentities, unchanged, with same-raw-email fallback matching production identityMatching fallback for high-volume exact-email groups',
    independence_note: 'No test-data/tune files, synthetic-lab generators, generated fixtures, or prior answer keys are imported or read by this harness.',
    verdict: finalVerdict,
    tests: report,
  };

  const summaryPath = path.join(OUT_DIR, 'summary.json');
  writeJson(summaryPath, summary);
  const md = [
    '# Blind Adversarial Identity Validation',
    '',
    `Verdict: ${finalVerdict}`,
    '',
    '| test | records | precision | recall | F1 | TP | FP | FN | pass |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |',
    ...report.map((row) => `| ${row.test_id} | ${row.records} | ${exactMetric(row.metrics.precision)} | ${exactMetric(row.metrics.recall)} | ${exactMetric(row.metrics.f1)} | ${row.metrics.truePositives} | ${row.metrics.falsePositives} | ${row.metrics.falseNegatives} | ${row.passed ? 'PASS' : 'FAIL'} |`),
    '',
    'Ground truth manifests were written and hashed before importing the engine.',
  ].join('\n');
  fs.writeFileSync(path.join(OUT_DIR, 'REPORT.md'), `${md}\n`);
  console.log(`summary=${path.relative(process.cwd(), summaryPath)}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
