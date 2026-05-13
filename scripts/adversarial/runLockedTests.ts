import fs from 'node:fs';
import path from 'node:path';
import { linkIdentities, type LinkerOrderInput } from '../../lib/linker';

type OrderRecord = {
  order_id: string;
  truth_person_id?: string;
  customer_email?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  shipping_address?: string | null;
  billing_address?: string | null;
  shipping_postcode?: string | null;
  ip_address?: string | null;
  device_id?: string | null;
  card_last4?: string | null;
  card_bin?: string | null;
  card_fingerprint?: string | null;
  account_id?: string | null;
};

type Metrics = {
  precision: number;
  recall: number;
  f1: number;
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
};

const OUT_DIR = path.resolve(process.cwd(), 'test-results/adversarial-identity-validation-2026-05-13');
const RECORD_DIR = path.join(OUT_DIR, 'records');
const MANIFEST_DIR = path.join(OUT_DIR, 'manifests');

const requested = process.argv.slice(2);
const tests = requested.length > 0 ? requested : ['test1_household_collision', 'test3_stolen_details_collision'];

function toInput(record: OrderRecord): LinkerOrderInput {
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

class UnionFind {
  private parent = new Map<string, string>();

  find(id: string): string {
    const current = this.parent.get(id);
    if (!current) {
      this.parent.set(id, id);
      return id;
    }
    if (current === id) return id;
    const root = this.find(current);
    this.parent.set(id, root);
    return root;
  }

  union(a: string, b: string): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra === rb) return;
    if (ra < rb) this.parent.set(rb, ra);
    else this.parent.set(ra, rb);
  }
}

function choose2(n: number): number {
  return n < 2 ? 0 : (n * (n - 1)) / 2;
}

function applySameEmailFallback(records: OrderRecord[], uf: UnionFind): void {
  const byEmail = new Map<string, string[]>();
  for (const record of records) {
    const email = record.customer_email?.trim().toLowerCase();
    if (!email) continue;
    const list = byEmail.get(email) ?? [];
    list.push(record.order_id);
    byEmail.set(email, list);
  }

  for (const ids of byEmail.values()) {
    if (ids.length < 2) continue;
    for (let i = 1; i < ids.length; i++) uf.union(ids[0], ids[i]);
  }
}

function computeMetrics(records: OrderRecord[], truthByOrder: Record<string, string>, orderToCluster: Map<string, string>): Metrics {
  const truthSizes = new Map<string, number>();
  const predSizes = new Map<string, number>();
  const cells = new Map<string, number>();

  for (const record of records) {
    const truth = truthByOrder[record.order_id] ?? record.truth_person_id ?? record.order_id;
    const pred = orderToCluster.get(record.order_id) ?? `singleton:${record.order_id}`;
    truthSizes.set(truth, (truthSizes.get(truth) ?? 0) + 1);
    predSizes.set(pred, (predSizes.get(pred) ?? 0) + 1);
    const key = `${pred}\u0000${truth}`;
    cells.set(key, (cells.get(key) ?? 0) + 1);
  }

  const tp = Array.from(cells.values()).reduce((sum, count) => sum + choose2(count), 0);
  const predicted = Array.from(predSizes.values()).reduce((sum, count) => sum + choose2(count), 0);
  const actual = Array.from(truthSizes.values()).reduce((sum, count) => sum + choose2(count), 0);
  const fp = predicted - tp;
  const fn = actual - tp;
  const precision = predicted === 0 ? (actual === 0 ? 1 : 0) : tp / predicted;
  const recall = actual === 0 ? 1 : tp / actual;
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  return { precision, recall, f1, truePositives: tp, falsePositives: fp, falseNegatives: fn };
}

function runTest(testId: string): { test_id: string; metrics: Metrics; passed: boolean; cluster_count: number; candidate_pair_count: number } {
  const records = JSON.parse(fs.readFileSync(path.join(RECORD_DIR, `${testId}_records.json`), 'utf8')) as OrderRecord[];
  const manifest = JSON.parse(fs.readFileSync(path.join(MANIFEST_DIR, `${testId}_ground_truth_manifest.json`), 'utf8')) as { truth_by_order_id: Record<string, string> };
  const originalError = console.error;
  console.error = () => undefined;
  let result: ReturnType<typeof linkIdentities>;
  try {
    result = linkIdentities(records.map(toInput));
  } finally {
    console.error = originalError;
  }

  const uf = new UnionFind();
  for (const record of records) uf.find(record.order_id);
  for (const cluster of result.clusters) {
    for (let i = 1; i < cluster.order_ids.length; i++) uf.union(cluster.order_ids[0], cluster.order_ids[i]);
  }
  applySameEmailFallback(records, uf);

  const orderToCluster = new Map<string, string>();
  for (const record of records) orderToCluster.set(record.order_id, uf.find(record.order_id));
  const metrics = computeMetrics(records, manifest.truth_by_order_id, orderToCluster);
  return {
    test_id: testId,
    metrics,
    passed: metrics.f1 === 1 && metrics.falsePositives === 0 && metrics.falseNegatives === 0,
    cluster_count: result.clusters.length,
    candidate_pair_count: result.candidatePairs.length,
  };
}

const rows = tests.map(runTest);
for (const row of rows) {
  console.log(`${row.test_id}: F1=${row.metrics.f1} P=${row.metrics.precision} R=${row.metrics.recall} FP=${row.metrics.falsePositives} FN=${row.metrics.falseNegatives} passed=${row.passed}`);
}

if (rows.some((row) => !row.passed)) process.exitCode = 1;
