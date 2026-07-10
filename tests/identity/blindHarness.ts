import fs from 'node:fs';
import path from 'node:path';
import { File } from 'node:buffer';
import Papa from 'papaparse';
import { generateBlindFixtures } from '../../scripts/test-data/generateBlindMerchantCSVs';
import { streamParseCsv } from '../../lib/processing/streamParser';
import { cleanRow } from '../../lib/csv/clean';
import { csvRowSchema, type CsvRow } from '../../lib/csv/schema';
import { normaliseRow } from '../../lib/csv/normalise';
import { normaliseAddress } from '../../lib/identity/normalise';
import { linkIdentities, type LinkerOrderInput, type LinkedCluster } from '../../lib/linker';
import { expandSuspiciousClusters, type RowBehaviourFlags } from '../../lib/processing/clusterExpansion';
import { scoreAllClusters, scoreIdentityFromSignals, type ScorerOrder } from '../../lib/scorer';
import { computeAuditSummary } from '../../lib/analysis/auditSummary';

process.env.IDENTITY_SALT = process.env.IDENTITY_SALT || 'blind-csv-test-salt';

export const generatedDir = path.resolve(process.cwd(), 'tests/fixtures/generated');
export const reportDir = path.resolve(process.cwd(), 'test-results/csv-blind');

export interface AnswerRow {
  order_id: string;
  _expected_cluster_label: string;
  _expected_confidence: string;
  _expected_should_flag: 'true' | 'false';
  _expected_reason: string;
  _scenario: string;
  _ground_truth_person_id: string;
}

export interface ActualIdentityRow {
  order_id: string;
  cluster_id: string | null;
  identity_score: number | null;
  identity_confidence_grade: string | null;
  signals_matched: string[];
  /** Cluster behavioural score (0–40); 0 = no suspicious behaviour. */
  behavioural_score: number;
  /** Product review flag: strong identity match AND suspicious behaviour. */
  review_worthy: boolean;
}

export interface HarnessResult {
  dataset: string;
  fileName: string;
  parse: Awaited<ReturnType<typeof streamParseCsv>>;
  validRows: CsvRow[];
  invalidRows: Array<{ row: number; errors: string[] }>;
  actualRows: ActualIdentityRow[];
  actualByOrderId: Map<string, ActualIdentityRow>;
  answerRows: AnswerRow[];
  answerByOrderId: Map<string, AnswerRow>;
  summary: ReturnType<typeof computeAuditSummary>;
  expectedSummary: any;
  diagnostics: {
    totalRows: number;
    rowsFetched: number;
    expectedFlagged: number;
    actualFlagged: number;
    falsePositiveIds: string[];
    falseNegativeIds: string[];
    seededRecall: number;
    reviewRate: number;
    distinctAddresses: number;
    largestCluster: number;
    nullScoreWithCluster: string[];
    topSignalCombos: Array<{ signals: string; count: number }>;
    scenarioOutcomes: Record<string, { total: number; expected: number; actual: number; falsePositives: number; falseNegatives: number }>;
  };
}

export function ensureBlindFixtures(): void {
  generateBlindFixtures();
  fs.mkdirSync(reportDir, { recursive: true });
}

export async function parseMerchantCsv(fileName: string, columnMap?: Record<string, string>): Promise<Awaited<ReturnType<typeof streamParseCsv>>> {
  const filePath = path.join(generatedDir, fileName);
  const buffer = fs.readFileSync(filePath);
  const file = new File([buffer], fileName, { type: 'text/csv' }) as unknown as globalThis.File;
  return streamParseCsv(file, columnMap);
}

export function readAnswerKey(dataset: string): AnswerRow[] {
  const answerPath = path.join(generatedDir, `${dataset}_ANSWER_KEY.csv`);
  const parsed = Papa.parse<AnswerRow>(fs.readFileSync(answerPath, 'utf8'), { header: true, skipEmptyLines: true });
  return parsed.data;
}

export function readExpectedSummary(dataset: string): any {
  return JSON.parse(fs.readFileSync(path.join(generatedDir, `${dataset}_EXPECTED_SUMMARY.json`), 'utf8'));
}

function toScorerOrder(row: CsvRow): ScorerOrder {
  const asBool = (v: unknown): boolean | null => {
    const s = String(v ?? '').trim().toLowerCase();
    if (['true', '1', 'yes', 'y'].includes(s)) return true;
    if (['false', '0', 'no', 'n'].includes(s)) return false;
    return null;
  };
  return {
    order_id: row.order_id,
    order_date: new Date(row.order_date).toISOString(),
    order_total: parseFloat(row.order_total ?? '0'),
    currency: row.currency,
    customer_email: row.customer_email,
    customer_name: row.customer_name ?? null,
    shipping_address: row.shipping_address ?? null,
    billing_address: row.billing_address ?? null,
    customer_phone: row.customer_phone ?? null,
    ip_address: row.ip_address ?? null,
    card_last4: row.card_last4 ?? null,
    card_bin: row.card_bin ?? null,
    device_id: row.device_id ?? null,
    browser_fingerprint: row.browser_fingerprint ?? null,
    cookie_id: row.cookie_id ?? null,
    account_id: row.account_id ?? null,
    payment_method: row.payment_method ?? null,
    refund_status: (row.refund_status as ScorerOrder['refund_status']) ?? null,
    refund_reason: row.refund_reason ?? null,
    refund_date: row.refund_date ?? null,
    refund_amount: row.refund_amount ? parseFloat(row.refund_amount) : null,
    refund_requested: asBool(row.refund_requested),
    chargeback_filed: asBool((row as any).chargeback_filed ?? (row as any).chargeback_dispute),
  };
}

function toLinkerInput(row: CsvRow): LinkerOrderInput {
  return {
    order_id: row.order_id,
    email: row.customer_email || null,
    phone: row.customer_phone || null,
    address: row.shipping_address || null,
    postcode: (row as any).shipping_postcode || (row as any).postcode || null,
    ip: row.ip_address || null,
    card_last4: row.card_last4 || null,
    card_bin: row.card_bin || null,
    device_fingerprint: row.device_id || null,
    account_id: row.account_id || null,
  };
}

function toBoolFlag(v: unknown): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') {
    const lv = v.trim().toLowerCase();
    return lv === 'true' || lv === '1' || lv === 'yes' || lv === 'y';
  }
  return false;
}

/**
 * Reproduce the production clustering pipeline (worker.ts): run
 * expandSuspiciousClusters after the core linker and merge the results.
 *   - promotedClusters: new identity-only clusters (Phase 1) are added.
 *   - additionalClusterAssignments: rows expanded into existing clusters
 *     (Phase 2) are appended, but only if not already in a seed cluster.
 * Expansion is identity-only by product contract (behaviour is not consulted),
 * so the behaviour map below is built only to satisfy the signature.
 */
function applyClusterExpansion(
  linkerResult: ReturnType<typeof linkIdentities>,
  linkerInputs: LinkerOrderInput[],
  validRows: CsvRow[],
): LinkedCluster[] {
  const behaviourMap = new Map<string, RowBehaviourFlags>();
  const nameMap = new Map<string, string>();
  for (const row of validRows) {
    behaviourMap.set(row.order_id, {
      order_id: row.order_id,
      refund_requested: toBoolFlag((row as Record<string, unknown>).refund_requested),
      chargeback_filed: toBoolFlag(
        (row as Record<string, unknown>).chargeback_filed ?? (row as Record<string, unknown>).chargeback_dispute,
      ),
      order_total: parseFloat(String((row as Record<string, unknown>).order_total ?? '0')) || 0,
    });
    nameMap.set(row.order_id, (row as Record<string, unknown>).customer_name as string ?? '');
  }

  const expansion = expandSuspiciousClusters(
    linkerResult.clusters,
    linkerResult.candidatePairs,
    linkerInputs,
    behaviourMap,
    nameMap,
  );

  const byId = new Map<string, LinkedCluster>(
    linkerResult.clusters.map((c) => [c.cluster_id, { ...c, order_ids: [...c.order_ids] }]),
  );
  const alreadyClustered = new Set<string>();
  for (const c of linkerResult.clusters) for (const id of c.order_ids) alreadyClustered.add(id);

  for (const [orderId, clusterId] of expansion.additionalClusterAssignments) {
    if (alreadyClustered.has(orderId)) continue;
    const cluster = byId.get(clusterId);
    if (cluster && !cluster.order_ids.includes(orderId)) {
      cluster.order_ids.push(orderId);
      alreadyClustered.add(orderId);
    }
  }
  for (const promoted of expansion.promotedClusters) {
    if (!byId.has(promoted.cluster_id)) {
      byId.set(promoted.cluster_id, { ...promoted, order_ids: [...promoted.order_ids] });
    }
  }
  return Array.from(byId.values());
}

function identityByOrder(clusters: LinkedCluster[], ordersById: Map<string, ScorerOrder>): Map<string, ActualIdentityRow> {
  const clusterScores = scoreAllClusters(clusters, ordersById);
  const scoresByCluster = new Map(clusterScores.map((score) => [score.cluster_id, score]));
  const out = new Map<string, ActualIdentityRow>();

  for (const cluster of clusters) {
    const scored = scoresByCluster.get(cluster.cluster_id);
    const fallback = scoreIdentityFromSignals(cluster.signals_matched);
    const grade = scored?.confidence_grade?.toLowerCase() ?? fallback.identity_confidence_grade;
    const identityScore = scored?.review_priority_score ?? (fallback.identity_confidence_grade ? fallback.identity_score : null);
    const behaviouralScore = scored?.behavioural_score ?? 0;
    // Review-worthy mirrors the product flag: strong identity match AND
    // suspicious behaviour. The fallback path has no behavioural data → not
    // review-worthy.
    const reviewWorthy = scored?.review_worthy ?? false;
    for (const orderId of cluster.order_ids) {
      out.set(orderId, {
        order_id: orderId,
        cluster_id: cluster.cluster_id,
        identity_score: identityScore,
        identity_confidence_grade: grade,
        signals_matched: cluster.signals_matched,
        behavioural_score: behaviouralScore,
        review_worthy: reviewWorthy,
      });
    }
  }
  return out;
}

export async function runBlindDataset(dataset: string, fileName = `${dataset}.csv`): Promise<HarnessResult> {
  ensureBlindFixtures();
  const parse = await parseMerchantCsv(fileName);
  const validRows: CsvRow[] = [];
  const invalidRows: HarnessResult['invalidRows'] = [];

  parse.rows.forEach((raw, idx) => {
    const cleaned = cleanRow(raw as Record<string, unknown>);
    const parsed = csvRowSchema.safeParse(cleaned);
    if (parsed.success) validRows.push(parsed.data);
    else invalidRows.push({ row: idx + 2, errors: parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`) });
  });

  const normalised = validRows.map(normaliseRow);
  // normaliseRow is deliberately called because the worker uses it; the linker
  // and scorer below consume raw canonical fields like the worker's public modules.
  void normalised;

  const linkerInputs = validRows.map(toLinkerInput);
  const linkerResult = linkIdentities(linkerInputs);
  const ordersById = new Map(validRows.map((row) => [row.order_id, toScorerOrder(row)]));
  // Mirror the calibration harness flow: after the
  // core linker, run candidate-group promotion + identity-signal expansion, then
  // score the MERGED cluster set. Without this the harness under-clusters
  // (e.g. phone-bridge fraud, linked only via a single strong signal, never
  // forms a seed cluster) and under-reports recall relative to production.
  const mergedClusters = applyClusterExpansion(linkerResult, linkerInputs, validRows);
  const clustered = identityByOrder(mergedClusters, ordersById);
  const actualRows = validRows.map((row) => clustered.get(row.order_id) ?? {
    order_id: row.order_id,
    cluster_id: null,
    identity_score: null,
    identity_confidence_grade: null,
    signals_matched: [],
    behavioural_score: 0,
    review_worthy: false,
  });
  const actualByOrderId = new Map(actualRows.map((row) => [row.order_id, row]));

  const answerRows = readAnswerKey(dataset);
  const answerByOrderId = new Map(answerRows.map((row) => [row.order_id, row]));
  const expectedSummary = readExpectedSummary(dataset);
  const summary = computeAuditSummary(actualRows.map((row) => ({
    identity_confidence_grade: row.identity_confidence_grade,
    order_value: ordersById.get(row.order_id)?.order_total ?? 0,
    cluster_id: row.cluster_id,
  })));

  // "Flagged" = surfaced to the merchant for review. This mirrors the product
  // definition: a strong identity match (probable/definite) AND suspicious
  // behaviour (behavioural_score > 0). A high-confidence identity match with no
  // suspicious behaviour (loyal repeat customer) is NOT review-worthy.
  const expectedFlagged = answerRows.filter((row) => row._expected_should_flag === 'true');
  const actualFlagged = actualRows.filter((row) => row.review_worthy);
  const falsePositiveIds = actualFlagged
    .filter((row) => answerByOrderId.get(row.order_id)?._expected_should_flag !== 'true')
    .map((row) => row.order_id);
  const falseNegativeIds = expectedFlagged
    .filter((row) => !actualByOrderId.get(row.order_id)?.review_worthy)
    .map((row) => row.order_id);
  const distinctAddresses = new Set(validRows.map((row) => normaliseAddress((row as any).shipping_address)).filter(Boolean)).size;
  const clusterSizes = new Map<string, number>();
  for (const row of actualRows) {
    if (row.cluster_id) clusterSizes.set(row.cluster_id, (clusterSizes.get(row.cluster_id) ?? 0) + 1);
  }
  const signalCombos = new Map<string, number>();
  for (const row of actualRows) {
    if (row.signals_matched.length > 0) {
      const key = row.signals_matched.toSorted().join(',');
      signalCombos.set(key, (signalCombos.get(key) ?? 0) + 1);
    }
  }
  const scenarioOutcomes: HarnessResult['diagnostics']['scenarioOutcomes'] = {};
  for (const answer of answerRows) {
    const scenario = answer._scenario || 'unknown';
    const actual = actualByOrderId.get(answer.order_id);
    const bucket = scenarioOutcomes[scenario] ?? { total: 0, expected: 0, actual: 0, falsePositives: 0, falseNegatives: 0 };
    bucket.total++;
    const expected = answer._expected_should_flag === 'true';
    const flagged = actual?.review_worthy ?? false;
    if (expected) bucket.expected++;
    if (flagged) bucket.actual++;
    if (!expected && flagged) bucket.falsePositives++;
    if (expected && !flagged) bucket.falseNegatives++;
    scenarioOutcomes[scenario] = bucket;
  }

  const diagnostics = {
    totalRows: expectedSummary.totalRows,
    rowsFetched: actualRows.length,
    expectedFlagged: expectedFlagged.length,
    actualFlagged: actualFlagged.length,
    falsePositiveIds,
    falseNegativeIds,
    seededRecall: expectedFlagged.length === 0 ? 1 : (expectedFlagged.length - falseNegativeIds.length) / expectedFlagged.length,
    reviewRate: actualRows.length === 0 ? 0 : actualFlagged.length / actualRows.length,
    distinctAddresses,
    largestCluster: Math.max(0, ...Array.from(clusterSizes.values())),
    nullScoreWithCluster: actualRows.filter((row) => row.cluster_id && row.signals_matched.length > 0 && (row.identity_score == null || row.identity_confidence_grade == null)).map((row) => row.order_id),
    topSignalCombos: Array.from(signalCombos.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([signals, count]) => ({ signals, count })),
    scenarioOutcomes,
  };

  const result = { dataset, fileName, parse, validRows, invalidRows, actualRows, actualByOrderId, answerRows, answerByOrderId, summary, expectedSummary, diagnostics };
  fs.writeFileSync(path.join(reportDir, `${dataset}.actual.json`), `${JSON.stringify({
    dataset,
    fileName,
    summary,
    diagnostics,
    parse: {
      valid: parse.valid,
      rowCount: parse.rowCount,
      missingRequired: parse.missingRequired,
      unmappedHeaders: parse.unmappedHeaders,
      headers: parse.headers,
    },
    invalidRows: invalidRows.slice(0, 25),
  }, null, 2)}\n`);
  return result;
}

export function expectMerchantReadiness(result: HarnessResult): void {
  expect(result.parse.valid).toBe(true);
  expect(result.invalidRows).toEqual([]);
  expect(result.diagnostics.rowsFetched).toBe(result.expectedSummary.totalRows);
  expect(result.diagnostics.rowsFetched).toBeGreaterThan(1000);
  expect(result.diagnostics.distinctAddresses).toBeGreaterThanOrEqual(result.expectedSummary.acceptance.minDistinctNormalizedAddresses);
  expect(result.diagnostics.largestCluster).toBeLessThanOrEqual(result.expectedSummary.acceptance.maxLargestCluster);
  expect(result.diagnostics.nullScoreWithCluster).toEqual([]);
  expect(result.diagnostics.reviewRate).toBeLessThanOrEqual(result.expectedSummary.acceptance.maxReviewRate);
  expect(result.diagnostics.seededRecall).toBeGreaterThanOrEqual(result.expectedSummary.acceptance.minSeededRecall);
}
