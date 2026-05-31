/* ────────────────────────────────────────────────────────────────────────────
 * Core of the CSV scoring pipeline. The parallel pipeline (transactions +
 * intelligence writes) and per-batch progress reporting were tuned on
 * 2026-05-03.
 *
 * TWO SCORING PATHS
 * -----------------
 * Path 1 — scoreBatch (lib/engine/fastScore.ts):
 *   Produces the primary per-order risk scores and confidence grades used
 *   in audit_transactions. Uses its own internal evidence-gated thresholds
 *   (75/50/25) which differ from CONFIDENCE_THRESHOLDS in weights.ts because
 *   they encode multi-condition evidence rules, not simple score cuts.
 *
 * Path 2 — scoreIdentityFromSignals (lib/scorer.ts):
 *   Converts the linker's signals_matched set into identity_confidence_grade.
 *   Uses GRADE_THRESHOLDS (85/60/35) internal to scorer.ts, calibrated for
 *   this specific use case.
 *
 * Both paths use the same normalisation functions from lib/identity/normalise.ts
 * (single source of truth). The threshold values differ by design — they encode
 * different evidence models. Do not merge the threshold constants without
 * explicit algorithmic analysis.
 * ──────────────────────────────────────────────────────────────────────── */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../supabase/types';
import { TABLES } from '../supabase/tables';
import type { ParsedCsvRow, FraudTransactionInsert, ProcessCsvJobIngestion } from './types';
import { shopifyAuditError } from '@/lib/shopify/auditLog';
import { buildFastContext } from '../engine/fastContext';
import { scoreBatch } from '../engine/fastScore';
import { mergeHistoryByCluster } from '../engine/identityHistory';
import { CONFIDENCE_THRESHOLDS } from '../engine/weights';
import { buildIdentityClusterMapFromLinkerResult } from '../engine/identityClusterBuilder';
import { linkIdentities, type LinkedCluster, type LinkerOrderInput } from '../linker';
import { scoreAllClusters, scoreIdentityFromSignals, type ScoredCluster, type ScorerOrder } from '../scorer';
import { assessDataQuality, type DataQualityReport, type PipelineWarningCounters } from '../csv/dataQuality';
import type { NormalisedOrder, ScoredOrder } from '../engine/types';
import { buildCe3SignalHashes } from '../identity/ce3SignalHashes';
import { normaliseRow } from '../csv/normalise';
import { cleanRow } from '../csv/clean';
import type { CsvRow } from '../csv/schema';
import { csvRowSchema } from '../csv/schema';
import {
  normaliseEmail,
  normaliseIP,
  normaliseAddress,
  normaliseCard,
} from '../identity/normalise';
import {
  incrementJobProgress,
  logBatchError,
} from './job';
import { processProfilesForBatch } from '../analysis/entityResolution';
import { withRetry, isUpstreamDown } from '../engine/dbSemaphore';
import { getRowMatchedSignals } from './signals';
import {
  expandSuspiciousClusters,
  type RowBehaviourFlags,
} from './clusterExpansion';
import { scoreClusterIdentity, type IdentityMatchResult } from '../identity/matchScorer';
import { computeContextInsights } from '../identity/contextInsights';
import { classifyIdentityReview } from '../identity/reviewClassifier';
import { persistGlobalIdentityGraph } from '../identity/globalIdentityStore';
import { env } from '../utils/env';

const BATCH_SIZE = 1000;  // 1k rows per upsert keeps payloads reasonable while halving round-trips
const DEFAULT_CONCURRENCY = 5;

function splitIntoBatches<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
}

async function mapWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>
): Promise<void> {
  let next = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      await worker(items[index], index);
    }
  });
  await Promise.all(workers);
}

function isTransientTransportError(err: unknown): boolean {
  const msg = String((err as any)?.message ?? err ?? '').toLowerCase();
  return (
    msg.includes('fetch failed') ||
    msg.includes('econnreset') ||
    msg.includes('etimedout') ||
    msg.includes('connection reset') ||
    msg.includes('connection terminated')
  );
}

async function withTransportRetry<T>(
  fn: () => Promise<T>,
  attempts = 3,
  baseDelayMs = 300
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isTransientTransportError(err) || i === attempts - 1) break;
      const jitter = Math.random() * 120;
      const delay = baseDelayMs * 2 ** i + jitter;
      await new Promise<void>((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastErr;
}

type MatchStatus = 'none' | 'candidate' | 'probable' | 'definite';

type CheckpointEnd = (stage: string, started: number, meta?: Record<string, unknown>) => void;
type CheckpointLog = (
  stage: string,
  event: 'start' | 'end' | 'retry' | 'error',
  meta?: Record<string, unknown>
) => void;

function pureGradeToLegacyGrade(
  grade: IdentityMatchResult['identity_match_grade'] | 'none' | null | undefined
): PersistedIdentityResult['grade'] {
  if (grade === 'confirmed') return 'definite';
  if (grade === 'probable') return 'probable';
  if (grade === 'candidate') return 'possible';
  return null;
}

function pureGradeToMatchStatus(
  grade: IdentityMatchResult['identity_match_grade'] | 'none' | null | undefined
): MatchStatus {
  if (grade === 'confirmed') return 'definite';
  if (grade === 'probable') return 'probable';
  if (grade === 'candidate') return 'candidate';
  return 'none';
}

function recommendedActionForPureGrade(
  grade: PersistedIdentityResult['grade']
): string | null {
  if (grade === 'definite') return 'Treat as the same customer identity.';
  if (grade === 'probable') return 'Review as a likely same-customer match.';
  if (grade === 'possible') return 'Review supporting identity evidence before action.';
  return null;
}

type PersistedIdentityResult = {
  grade: 'weak' | 'possible' | 'probable' | 'definite' | null;
  matchStatus: MatchStatus;
  identityScore: number | null;
  signalsMatched: string[];
  behaviouralFlags: string[];
  recommendedAction: string | null;
  ce3Eligible: boolean;
  ce3QualifyingTransactions: string[];
  /** Only populated for definite (match_status='definite'). */
  clusterId: string | null;
  /** Set for candidate + probable + definite rows. Lets the UI group "possible"
   *  matches by cluster even when the engine hasn't confirmed them. */
  candidateClusterId: string | null;
  /** Set ONLY for definite rows (score ≥ 75). */
  confirmedIdentityId: string | null;
  // ── New pure-identity fields (product contract) ────────────────────────
  /** Row-level identity result from the pure matchScorer. */
  identityMatchResult: IdentityMatchResult | null;
  /** Context flags (refund/dispute) — merchant decision support only. */
  contextFlags: unknown[];
  /** Plain-English context summary. */
  contextSummary: string | null;
};

function sanitizeIdentityResult(result: PersistedIdentityResult): PersistedIdentityResult {
  const identityGrade = result.identityMatchResult?.identity_match_grade ?? 'none';
  if (result.matchStatus !== 'none' && identityGrade !== 'none') {
    return result;
  }
  return {
    ...result,
    grade: null,
    matchStatus: 'none',
    identityScore: null,
    signalsMatched: [],
    recommendedAction: null,
    clusterId: null,
    candidateClusterId: null,
    confirmedIdentityId: null,
  };
}

function hasPipelineWarnings(warnings: PipelineWarningCounters): boolean {
  return Object.values(warnings).some((value) => value > 0);
}

async function mergePipelineWarnings(
  serviceClient: SupabaseClient<Database>,
  jobId: string,
  warnings: PipelineWarningCounters,
  jobLog: (msg: string) => void
): Promise<void> {
  if (!hasPipelineWarnings(warnings)) return;

  const { data, error } = await serviceClient
    .from(TABLES.PROCESSING_JOBS)
    .select('data_quality')
    .eq('id', jobId)
    .single();

  if (error) {
    jobLog(`Failed to read data quality report for pipeline warnings: ${error.message}`);
    return;
  }

  const current = ((data as unknown as { data_quality?: DataQualityReport | null })?.data_quality ?? {}) as Partial<DataQualityReport>;
  const existing = current.pipelineWarnings ?? {
    fastContextReadRetries: 0,
    fastContextReadFailures: 0,
    entityResolutionErrors: 0,
    coOccurrenceUpstreamDown: 0,
    transactionUpsertFailedRows: 0,
  };

  const next: Partial<DataQualityReport> = {
    ...current,
    pipelineWarnings: {
      fastContextReadRetries: (existing.fastContextReadRetries ?? 0) + warnings.fastContextReadRetries,
      fastContextReadFailures: (existing.fastContextReadFailures ?? 0) + warnings.fastContextReadFailures,
      entityResolutionErrors: (existing.entityResolutionErrors ?? 0) + warnings.entityResolutionErrors,
      coOccurrenceUpstreamDown: (existing.coOccurrenceUpstreamDown ?? 0) + warnings.coOccurrenceUpstreamDown,
      transactionUpsertFailedRows: (existing.transactionUpsertFailedRows ?? 0) + warnings.transactionUpsertFailedRows,
    },
  };

  const { error: updateError } = await serviceClient
    .from(TABLES.PROCESSING_JOBS)
    .update({ data_quality: next } as any)
    .eq('id', jobId);

  if (updateError) {
    jobLog(`Failed to store pipeline warnings: ${updateError.message}`);
  } else {
    jobLog(`Pipeline warnings stored: ${JSON.stringify(next.pipelineWarnings)}`);
  }
}

function rawIds(order: NormalisedOrder) {
  return order as NormalisedOrder & {
    _rawEmail?: string | null;
    _rawPhone?: string | null;
    _rawPostcode?: string | null;
    _rawIP?: string | null;
    _rawAddress?: string | null;
    _rawBillingAddress?: string | null;
    _rawCardLast4?: string | null;
    _rawCardBin?: string | null;
    _rawCardFingerprint?: string | null;
    _rawDeviceId?: string | null;
    _rawAccountId?: string | null;
  };
}

function buildLinkerInput(orders: NormalisedOrder[]): LinkerOrderInput[] {
  return orders.map((order) => {
    const ids = rawIds(order);
    const nameNorm = (order as NormalisedOrder & { customerNameNorm?: string | null }).customerNameNorm ?? null;
    return {
      order_id: order.orderId,
      email: ids._rawEmail || null,
      phone: ids._rawPhone || null,
      address: ids._rawAddress || null,
      billing_address: ids._rawBillingAddress || null,
      postcode: ids._rawPostcode || null,
      ip: ids._rawIP || null,
      card_last4: ids._rawCardLast4 || null,
      card_bin: ids._rawCardBin || null,
      card_fingerprint: ids._rawCardFingerprint || null,
      device_fingerprint: ids._rawDeviceId || null,
      account_id: ids._rawAccountId || null,
      name: nameNorm,
    };
  });
}

function rowToScorerOrder(row: CsvRow): ScorerOrder {
  const toBoolean = (value: unknown): boolean | null => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1 ? true : value === 0 ? false : null;
    if (typeof value === 'string') {
      const v = value.trim().toLowerCase();
      if (v === 'true' || v === '1' || v === 'yes' || v === 'y') return true;
      if (v === 'false' || v === '0' || v === 'no' || v === 'n') return false;
    }
    return null;
  };

  const orderDateRaw = row.order_date ?? (row as CsvRow & { created_at?: string | null }).created_at ?? null;
  const parsedOrderDate = orderDateRaw ? new Date(orderDateRaw) : null;
  const orderDate = parsedOrderDate && !Number.isNaN(parsedOrderDate.getTime())
    ? parsedOrderDate.toISOString()
    : row.order_date;

  return {
    order_id: row.order_id,
    order_date: orderDate,
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
    refund_requested: toBoolean(row.refund_requested),
    chargeback_filed: toBoolean((row as CsvRow & { chargeback_filed?: unknown }).chargeback_filed ?? row.chargeback_dispute),
  };
}

function buildClusterIdentityResults(
  clusters: LinkedCluster[],
  clusterScores: ScoredCluster[],
  linkerInputs: LinkerOrderInput[],
  ordersById?: Map<string, ScorerOrder>,
): Map<string, PersistedIdentityResult> {
  const scoresByCluster = new Map(clusterScores.map((score) => [score.cluster_id, score]));
  const inputByOrderId = new Map(linkerInputs.map((r) => [r.order_id, r]));
  const result = new Map<string, PersistedIdentityResult>();

  for (const cluster of clusters) {
    const clusterScore = scoresByCluster.get(cluster.cluster_id);

    // Pre-build cluster input array
    const clusterInputs = cluster.order_ids
      .map((id) => inputByOrderId.get(id))
      .filter((r): r is LinkerOrderInput => r !== undefined);

    // Pure identity scoring — product contract: no refund/dispute signals
    const pureIdentityResult = scoreClusterIdentity(clusterInputs);

    // Context insights — merchant decision support only
    const clusterOrders = ordersById
      ? cluster.order_ids
          .map((id) => ordersById.get(id))
          .filter((o): o is ScorerOrder => o !== undefined)
      : [];
    const contextResult = clusterOrders.length >= 2
      ? computeContextInsights(cluster, clusterOrders)
      : null;

    const ce3OrderIds = Array.from(
      new Set(
        (contextResult?.ce3_qualifying_transactions ?? clusterScore?.ce3_qualifying_transactions ?? []).flatMap((pair) => [
          pair.disputed_order_id,
          pair.prior_order_id,
        ])
      )
    );

    for (const orderId of cluster.order_ids) {
      const thisInput = inputByOrderId.get(orderId);
      const rowSignals = thisInput
        ? getRowMatchedSignals(thisInput, clusterInputs)
        : (cluster.signals_matched as string[]);

      const rowPureResult = pureIdentityResult.byOrderId.get(orderId) ?? null;
      const pureGrade = rowPureResult?.identity_match_grade ?? 'none';
      const reviewDecision = thisInput
        ? classifyIdentityReview(thisInput, clusterInputs, rowPureResult)
        : { reviewWorthy: false, reason: 'missing_row_input' };

      const resolvedPureGrade = reviewDecision.reviewWorthy ? pureGrade : 'none';
      const grade = pureGradeToLegacyGrade(resolvedPureGrade);
      const matchStatus = pureGradeToMatchStatus(resolvedPureGrade);
      const identityScore = grade ? (rowPureResult?.identity_match_score ?? null) : null;
      const recommendedAction = recommendedActionForPureGrade(grade);
      const isConfirmed = matchStatus === 'definite';
      const isProbable = matchStatus === 'probable';
      const isCandidate = matchStatus === 'candidate';

      const persisted = {
        grade,
        matchStatus,
        identityScore: reviewDecision.reviewWorthy ? identityScore : null,
        signalsMatched: reviewDecision.reviewWorthy ? rowSignals : [],
        behaviouralFlags: (clusterScore?.behavioural_flags ?? []).map((flag) => flag.flag),
        recommendedAction: reviewDecision.reviewWorthy ? recommendedAction : null,
        ce3Eligible: contextResult?.ce3_eligible ?? clusterScore?.ce3_eligible ?? false,
        ce3QualifyingTransactions: ce3OrderIds,
        clusterId: reviewDecision.reviewWorthy && isConfirmed ? cluster.cluster_id : null,
        candidateClusterId: reviewDecision.reviewWorthy && (isCandidate || isProbable || isConfirmed) ? cluster.cluster_id : null,
        confirmedIdentityId: reviewDecision.reviewWorthy && isConfirmed ? cluster.cluster_id : null,
        identityMatchResult: rowPureResult,
        contextFlags: contextResult?.context_flags ?? [],
        contextSummary: contextResult?.context_summary ?? null,
      } satisfies PersistedIdentityResult;

      result.set(orderId, sanitizeIdentityResult(persisted));
    }
  }

  return result;
}

// IMPORTANT: this takes the *cleaned/aliased* CsvRow (validPairs[i].parsed),
// NOT the raw streamParser row. The raw row keeps the CSV's original header
// names (e.g. `email`, `Customer Email`) — only the parsed row guarantees
// canonical fields like `customer_email`, `ip_address`, `card_last4`.
export function isRefundClaimedForPersistence(row: Pick<CsvRow, 'refund_status' | 'refund_requested'>): boolean {
  const bool = (value: unknown): boolean => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    if (typeof value === 'string') {
      const v = value.trim().toLowerCase();
      return v === 'true' || v === '1' || v === 'yes' || v === 'y';
    }
    return false;
  };

  return (
    row.refund_status === 'full' ||
    row.refund_status === 'partial' ||
    row.refund_status === 'refunded' ||
    bool(row.refund_requested)
  );
}

function rowToFraudTransaction(
  row: CsvRow,
  scored: {
    totalScore: number;
    flagged: boolean;
    signals: { name: string; fired: boolean }[];
    order: Pick<
      NormalisedOrder,
      'emailHash' | 'addressHash' | 'phoneHash' | 'ipHash' | 'deviceIdHash' | 'accountIdHash'
    >;
  },
  identity: PersistedIdentityResult | undefined,
  jobId: string,
  source: FraudTransactionInsert['source'] = 'csv',
  shopDomain: string | null = null,
  /** Set only when cross-job dedup is active (flag on + migration applied). */
  merchantId?: string
): FraudTransactionInsert {
  const flags = scored.signals.filter((s) => s.fired).map((s) => s.name);
  const imr = identity?.identityMatchResult;
  const refundClaimed = isRefundClaimedForPersistence(row);

  const parsedOrderDate = row.order_date ? new Date(row.order_date) : null;
  const orderDateIso =
    parsedOrderDate && !Number.isNaN(parsedOrderDate.getTime())
      ? parsedOrderDate.toISOString()
      : null;

  return {
    job_id: jobId,
    // Only emitted when AUDIT_TX_MERCHANT_DEDUP is on (column exists post-migration).
    ...(merchantId ? { merchant_id: merchantId } : {}),
    order_id: row.order_id,
    order_date: orderDateIso,
    customer_email: row.customer_email ?? '',
    customer_name: row.customer_name ?? '',
    shipping_address: row.shipping_address ?? '',
    billing_address: row.billing_address,
    order_value: parseFloat(row.order_total ?? '0'),
    payment_method: row.payment_method,
    card_last4: row.card_last4,
    device_ip: row.ip_address,
    account_created_at: null,
    previous_order_count: null,
    delivery_status: row.order_status ?? 'completed',
    refund_claimed: refundClaimed,
    refund_reason: row.refund_reason,
    chargeback_filed: null,
    // Repurposed: identity-only match score (NOT a fraud/risk score). The
    // surfaced source of truth is identity_confidence_grade below.
    match_score: imr?.identity_match_score ?? identity?.identityScore ?? 0,
    fraud_flags: flags,
    identity_confidence_grade: identity?.grade ?? null,
    identity_score: identity?.identityScore ?? null,
    signals_matched: identity?.signalsMatched ?? [],
    behavioural_flags: identity?.behaviouralFlags ?? [],
    // Review-worthy = real identity match (definite/probable/possible) AND
    // suspicious behaviour (a behavioural flag fired — cluster-level, so ring
    // members without their own refund still inherit it). A high-confidence
    // identity match with no suspicious behaviour (loyal repeat customer) is
    // NOT review-worthy. Drives buildReviewableFilter()/the review queue.
    review_worthy:
      (identity?.grade === 'definite' ||
        identity?.grade === 'probable' ||
        identity?.grade === 'possible') &&
      (identity?.behaviouralFlags?.length ?? 0) > 0,
    ce3_eligible: identity?.ce3Eligible ?? false,
    ce3_qualifying_transactions: identity?.ce3QualifyingTransactions ?? [],
    cluster_id: identity?.clusterId ?? null,
    match_status: identity?.matchStatus ?? 'none',
    candidate_cluster_id: identity?.candidateClusterId ?? null,
    confirmed_identity_id: identity?.confirmedIdentityId ?? null,
    false_positive_reported: false,
    source,
    shop_domain: shopDomain,
    // ── New pure-identity contract fields ───────────────────────────────────────
    identity_match_score: imr?.identity_match_score ?? null,
    identity_match_grade: imr?.identity_match_grade ?? null,
    identity_evidence: imr?.identity_evidence ?? [],
    matched_datapoints: imr?.matched_datapoints ?? [],
    changed_datapoints: imr?.changed_datapoints ?? [],
    evidence_summary: imr?.evidence_summary ?? null,
    // ── Context fields (merchant decision support only) ────────────────────
    context_flags: identity?.contextFlags ?? [],
    context_summary: identity?.contextSummary ?? null,
    ce3_signal_hashes: buildCe3SignalHashes(scored.order),
  };
}

/**
 * Optional chunked-execution metadata.
 *
 * When the chunked dispatcher (`/api/process-csv-chunk`) calls this function,
 * it passes which slice of the upload these `rows` represent. We use this to:
 *   - skip data-quality assessment except on the first chunk
 *   - scope the post-pipeline `audit_transactions` lookup to the chunk's
 *     order_ids only (otherwise chunk N would scan all N×CHUNK_SIZE rows)
 */
export interface ChunkInfo {
  index: number;        // 0-based chunk index
  totalChunks: number;  // how many chunks make up the full upload
  isFirst: boolean;
  isLast: boolean;
}

export async function processCsvJob(
  rows: Record<string, string | undefined>[],
  jobId: string,
  serviceClient: SupabaseClient<Database>,
  concurrency = DEFAULT_CONCURRENCY,
  merchantId?: string,
  chunkInfo?: ChunkInfo,
  ingestion?: ProcessCsvJobIngestion
): Promise<ScoredOrder[]> {
  const ingestionSource = ingestion?.source ?? 'csv';
  const shopDomain = ingestion?.shopDomain ?? null;
  // Cross-job dedup (#21): only after the merchant_id migration is applied AND
  // the flag is set. Requires a resolved merchant_id; never applies to Shopify
  // (which keeps its own shop_domain,order_id arbiter index).
  const merchantDedup =
    env.AUDIT_TX_MERCHANT_DEDUP === 'true' &&
    ingestionSource !== 'shopify' &&
    !!merchantId;
  const upsertOnConflict =
    ingestionSource === 'shopify' && shopDomain
      ? 'shop_domain,order_id'
      : merchantDedup
        ? 'merchant_id,order_id,source'
        : 'job_id,order_id';
  const dedupMerchantId = merchantDedup ? merchantId : undefined;
  const jobLog = (msg: string) => console.log(`[job ${jobId}] ${new Date().toISOString()} ${msg}`);
  const checkpoint = (
    stage: string,
    event: 'start' | 'end' | 'retry' | 'error',
    meta: Record<string, unknown> = {}
  ) => {
    const ts = new Date();
    const time = ts.toISOString().split('T')[1]?.replace('Z', '') ?? ts.toISOString();
    const kv = Object.entries(meta)
      .map(([k, v]) => `${k}=${String(v)}`)
      .join(' | ');
    jobLog(`[CHECKPOINT] ${stage} | ${event}=${time}${kv ? ` | ${kv}` : ''}`);
  };
  const checkpointStart = (stage: string, meta: Record<string, unknown> = {}) => {
    const started = Date.now();
    checkpoint(stage, 'start', meta);
    return started;
  };
  const checkpointEnd = (stage: string, started: number, meta: Record<string, unknown> = {}) => {
    checkpoint(stage, 'end', { durationMs: Date.now() - started, ...meta });
  };
  const overallStart = Date.now();
  const pipelineWarnings: PipelineWarningCounters = {
    fastContextReadRetries: 0,
    fastContextReadFailures: 0,
    entityResolutionErrors: 0,
    coOccurrenceUpstreamDown: 0,
    transactionUpsertFailedRows: 0,
  };
  // -----------------------------------------------------------------------
  // 1. Validate & clean all rows up front (fast, synchronous)
  // -----------------------------------------------------------------------
  const validateStart = checkpointStart('validate_clean_rows', { inputRows: rows.length });
  const validPairs: { raw: ParsedCsvRow; parsed: CsvRow }[] = [];
  const invalidRows: ParsedCsvRow[] = [];

  for (const raw of rows) {
    const cleaned = cleanRow(raw as Record<string, unknown>);
    const parsed = csvRowSchema.safeParse(cleaned);
    if (parsed.success) {
      validPairs.push({ raw: raw as ParsedCsvRow, parsed: parsed.data });
    } else {
      invalidRows.push(raw as ParsedCsvRow);
    }
  }
  checkpointEnd(validateStart ? 'validate_clean_rows' : 'validate_clean_rows', validateStart, {
    validRows: validPairs.length,
    invalidRows: invalidRows.length,
  });

  // -----------------------------------------------------------------------
  // 2. Normalise all valid rows (fast, synchronous)
  // -----------------------------------------------------------------------
  const normaliseStart = checkpointStart('normalise_rows', { validRows: validPairs.length });
  const normOrders: NormalisedOrder[] = validPairs.map((p) => normaliseRow(p.parsed));
  checkpointEnd('normalise_rows', normaliseStart, { normOrders: normOrders.length });

  // -----------------------------------------------------------------------
  // 2b. Assess data quality and persist to the job record (non-blocking).
  //     Only on the first chunk — the data shape is fixed at upload time so
  //     re-assessing per chunk is wasted work.
  // -----------------------------------------------------------------------
  if (!chunkInfo || chunkInfo.isFirst) {
    const dqStart = checkpointStart('data_quality_update', { rows: normOrders.length });
    const dataQuality = assessDataQuality(normOrders);
    const { error: dataQualityError } = await serviceClient
      .from(TABLES.PROCESSING_JOBS)
      .update({ data_quality: dataQuality } as any)
      .eq('id', jobId);
    if (dataQualityError) {
      checkpoint('data_quality_update', 'error', { message: dataQualityError.message });
      jobLog(`Failed to store data quality report: ${dataQualityError.message}`);
    } else {
      jobLog('Data quality report stored');
    }
    checkpointEnd('data_quality_update', dqStart, { ok: !dataQualityError });
  }

  // -----------------------------------------------------------------------
  // 3. Build scoring context (Supabase I/O) overlapped with the identity
  //    linker (pure CPU). buildFastContext fires all Supabase queries into
  //    the event loop immediately, then yields on each await. While those
  //    round-trips are in-flight we run the synchronous linker — saving the
  //    full buildFastContext wall-clock time (~15–60s per chunk).
  // -----------------------------------------------------------------------
  const contextStart = checkpointStart('build_fast_context', { rows: normOrders.length });
  const contextPromise = buildFastContext(normOrders, serviceClient, merchantId);

  // Run the identity linker synchronously while Supabase I/O is in-flight.
  // linkerInputs + linkIdentities are pure CPU — no awaits, no I/O.
  const linkerStart = checkpointStart('identity_linking_pass', { rows: normOrders.length });
  const linkerInputs = buildLinkerInput(normOrders);
  const linkerResult = linkIdentities(linkerInputs);
  checkpointEnd('identity_linking_pass', linkerStart, {
    clusters: linkerResult.clusters.length,
    candidatePairs: linkerResult.candidatePairs.length,
  });

  // Now collect the context (may already be resolved if linker was slower).
  const context = await contextPromise;
  checkpointEnd('build_fast_context', contextStart, {
    readRetries: context.readHealth?.fastContextReadRetries ?? 0,
    readFailures: context.readHealth?.fastContextReadFailures ?? 0,
  });
  pipelineWarnings.fastContextReadRetries += context.readHealth?.fastContextReadRetries ?? 0;
  pipelineWarnings.fastContextReadFailures += context.readHealth?.fastContextReadFailures ?? 0;
  jobLog(`buildFastContext completed in ${Date.now() - overallStart}ms — orders=${normOrders.length}`);

  // Merge customerOrderHistory across identity clusters so behavioural signals
  // (velocity, refundRate, refundPattern, etc.) see the full ring history rather
  // than per-email fragments created by email-rotating fraud rings.
  const mergeStart = Date.now();
  const merged = mergeHistoryByCluster(normOrders, linkerResult, CONFIDENCE_THRESHOLDS.PROBABLE);
  for (const [eh, hist] of merged.byEmailHash) context.customerOrderHistory.set(eh, hist);
  jobLog(`identity history merge completed in ${Date.now() - mergeStart}ms`);

  // Build the cluster map and order/cluster scores from the single linker run.
  const identityClusterMap = buildIdentityClusterMapFromLinkerResult(normOrders, linkerResult);
  const ordersById = new Map(validPairs.map((pair) => [pair.parsed.order_id, rowToScorerOrder(pair.parsed)]))
  const clusterScores = scoreAllClusters(linkerResult.clusters, ordersById);

  // -----------------------------------------------------------------------
  // 4. Score all rows synchronously (O(n) thanks to precomputed context)
  // -----------------------------------------------------------------------
  const scoringStart = checkpointStart('scoring_pass', { rows: normOrders.length });
  const scored = scoreBatch(normOrders, context, identityClusterMap);
  checkpointEnd('scoring_pass', scoringStart, { scoredRows: scored.length });
  const identityResultsByOrder = buildClusterIdentityResults(linkerResult.clusters, clusterScores, linkerInputs, ordersById);
  checkpoint('identity_cluster_finalisation', 'end', {
    identityResultsByOrder: identityResultsByOrder.size,
    linkerClusters: linkerResult.clusters.length,
  });

  // -----------------------------------------------------------------------
  // 3c. Second-stage graph expansion — cautious, false-positive-safe.
  //     Runs AFTER the core linker so it can only ADD rows to existing or
  //     promoted clusters; it never lowers the main linker thresholds.
  // -----------------------------------------------------------------------
  const expansionPrepStart = checkpointStart('expansion_prep_maps', { rows: validPairs.length });
  const behaviourMap = new Map<string, RowBehaviourFlags>();
  for (const pair of validPairs) {
    const r = pair.parsed;
    const toBoolean = (v: unknown): boolean => {
      if (typeof v === 'boolean') return v;
      if (typeof v === 'string') {
        const lv = v.trim().toLowerCase();
        return lv === 'true' || lv === '1' || lv === 'yes' || lv === 'y';
      }
      return false;
    };
    behaviourMap.set(r.order_id, {
      order_id: r.order_id,
      refund_requested: toBoolean(r.refund_requested ?? r.refund_status),
      chargeback_filed: toBoolean((r as CsvRow & { chargeback_filed?: unknown }).chargeback_filed ?? r.chargeback_dispute),
      order_total: parseFloat(r.order_total ?? '0'),
    });
  }
  const nameMap = new Map<string, string>(
    validPairs.map((p) => [p.parsed.order_id, p.parsed.customer_name ?? ''])
  );
  checkpointEnd('expansion_prep_maps', expansionPrepStart, {
    behaviourMap: behaviourMap.size,
    nameMap: nameMap.size,
  });

  const expansionRunStart = checkpointStart('expansion_run', {
    baseClusters: linkerResult.clusters.length,
    candidatePairs: linkerResult.candidatePairs.length,
  });
  const expansion = expandSuspiciousClusters(
    linkerResult.clusters,
    linkerResult.candidatePairs,
    linkerInputs,
    behaviourMap,
    nameMap,
  );
  checkpointEnd('expansion_run', expansionRunStart, {
    promotedClusters: expansion.promotedClusters.length,
    additionalAssignments: expansion.additionalClusterAssignments.size,
    debugReports: expansion.debugReports.length,
  });

  // Log any debug reports so they're visible in job logs
  if (expansion.debugReports.length > 0) {
    jobLog(`[expansion] ${expansion.promotedClusters.length} promoted clusters, ` +
      `${expansion.additionalClusterAssignments.size} expanded rows`);
    const reportsToLog = expansion.debugReports.slice(0, 25);
    for (const report of reportsToLog) {
      jobLog(`[expansion] ${report.missed_order_id} → cluster ${report.nearest_cluster_id}: ` +
        `${report.recommended_fix ?? 'no fix'}`);
    }
    if (expansion.debugReports.length > reportsToLog.length) {
      jobLog(`[expansion] ${expansion.debugReports.length - reportsToLog.length} additional debug reports omitted from logs`);
    }
  }

  // Pre-build O(1) lookup maps used in the expansion merge below.
  // Without these, every .find()/.filter() inside the loop is O(n) against
  // linkerInputs (50k entries) and linkerResult.clusters, making the merge
  // O(n × expanded-rows) in the worst case.
  const mergePrepStart = checkpointStart('identity_merge_prep', {
    linkerClusters: linkerResult.clusters.length,
    linkerInputs: linkerInputs.length,
  });
  const clusterById = new Map(linkerResult.clusters.map((c) => [c.cluster_id, c]));
  const clusterMemberSet = new Map(
    linkerResult.clusters.map((c) => [c.cluster_id, new Set(c.order_ids)])
  );
  const linkerInputById = new Map(linkerInputs.map((r) => [r.order_id, r]));
  checkpointEnd('identity_merge_prep', mergePrepStart, {
    clusterById: clusterById.size,
    clusterMemberSet: clusterMemberSet.size,
    linkerInputById: linkerInputById.size,
  });

  // Merge expansion results: only update rows that aren't already in a cluster
  if (expansion.additionalClusterAssignments.size > 0 || expansion.promotedClusters.length > 0) {
    const mergeStart = checkpointStart('identity_merge_apply', {
      existingIdentityResults: identityResultsByOrder.size,
      promotedClusters: expansion.promotedClusters.length,
      additionalAssignments: expansion.additionalClusterAssignments.size,
    });
    // Build cluster info for promoted clusters (no scorer grade available — use
    // signal-weight fallback, same logic as buildClusterIdentityResults phase 2).
    const seenExpansionClusterIds = new Set<string>();
    const allExpansionClusters = [
      ...expansion.promotedClusters,
      // For expanded rows in existing clusters, synthesise minimal LinkedCluster
      // objects so buildClusterIdentityResults can process them.
      // Use clusterById O(1) instead of .find() O(n) per entry.
      ...Array.from(
        new Set([...expansion.additionalClusterAssignments.values()])
      ).flatMap((clusterId) => {
        const existing = clusterById.get(clusterId);
        return existing ? [existing] : [];
      }),
    ].filter((c) => {
      if (seenExpansionClusterIds.has(c.cluster_id)) return false;
      seenExpansionClusterIds.add(c.cluster_id);
      return true;
    });
    checkpoint('identity_merge_apply', 'start', {
      allExpansionClusters: allExpansionClusters.length,
    });

    // Compute per-row identity results for newly included rows
    const expansionResultStart = checkpointStart('identity_merge_build_results', {
      allExpansionClusters: allExpansionClusters.length,
    });
    const expansionResults = buildClusterIdentityResults(
      allExpansionClusters,
      clusterScores, // existing scores — promoted clusters get fallback grades
      linkerInputs,
      ordersById,
    );
    checkpointEnd('identity_merge_build_results', expansionResultStart, {
      expansionResults: expansionResults.size,
    });

    // Apply expansion results only to rows that aren't already identity-scored
    const applyAdditionalStart = checkpointStart('identity_merge_apply_additional_assignments', {
      additionalAssignments: expansion.additionalClusterAssignments.size,
    });
    for (const [orderId, clusterId] of Array.from(expansion.additionalClusterAssignments.entries())) {
      if (!identityResultsByOrder.has(orderId)) {
        // O(1) map lookup instead of O(n) Array.from(...).find()
        const memberIds = clusterMemberSet.get(clusterId);
        const existingClusterResult = expansionResults.get(orderId) ??
          // Inherit from an existing cluster member that already has a result
          (memberIds
            ? Array.from(memberIds).map((id) => identityResultsByOrder.get(id)).find(Boolean)
            : undefined);

        if (existingClusterResult) {
          // Use the existing cluster's grade/score; recompute per-row signals.
          // O(1) map lookups instead of .find() + .filter() on 50k-entry array.
          const thisInput = linkerInputById.get(orderId);
          const existingCluster = clusterById.get(clusterId);
          const clusterInputs = existingCluster
            ? existingCluster.order_ids.map((id) => linkerInputById.get(id)).filter((r): r is LinkerOrderInput => r !== undefined)
            : [];
          const rowSignals = thisInput ? getRowMatchedSignals(thisInput, [...clusterInputs, thisInput]) : [];
          identityResultsByOrder.set(orderId, {
            ...existingClusterResult,
            signalsMatched: rowSignals,
            clusterId: existingClusterResult.clusterId ?? null,
            candidateClusterId: existingClusterResult.candidateClusterId ?? clusterId,
          });
          const current = identityResultsByOrder.get(orderId);
          if (current) identityResultsByOrder.set(orderId, sanitizeIdentityResult(current));
        }
      }
    }
    checkpointEnd('identity_merge_apply_additional_assignments', applyAdditionalStart, {
      identityResultsByOrder: identityResultsByOrder.size,
    });

    // Apply promoted cluster results
    const applyPromotedStart = checkpointStart('identity_merge_apply_promoted', {
      expansionResults: expansionResults.size,
    });
    for (const [orderId, result] of Array.from(expansionResults.entries())) {
      if (!identityResultsByOrder.has(orderId)) {
        identityResultsByOrder.set(orderId, sanitizeIdentityResult(result));
      }
    }
    checkpointEnd('identity_merge_apply_promoted', applyPromotedStart, {
      identityResultsByOrder: identityResultsByOrder.size,
    });
    checkpointEnd('identity_merge_apply', mergeStart, {
      finalIdentityResults: identityResultsByOrder.size,
    });
  }

  jobLog(`scoreBatch completed in ${Date.now() - overallStart}ms`);

  // §1.2 — Flush cross-merchant access audit log entries (fire-and-forget, non-fatal).
  // Each entry records the queried hashes, k-anon gate result, and merchant count
  // for privacy audit purposes. Never blocks the main pipeline.
  if (merchantId && context.pendingAuditLogs.length > 0) {
    const auditRows = context.pendingAuditLogs.map((log) => ({
      merchant_id:            merchantId,
      query_type:             'cross_merchant',
      k_anonymity_satisfied:  log.k_anon_satisfied,
      result_returned:        log.k_anon_satisfied,
      queried_hashes:         log.queried_hashes,
      matched_merchant_count: log.matched_merchant_count,
    }));
    const AUDIT_CHUNK = 500;
    for (let i = 0; i < auditRows.length; i += AUDIT_CHUNK) {
      void serviceClient
        .from('access_audit_log' as any)
        .insert(auditRows.slice(i, i + AUDIT_CHUNK))
        .then(({ error }) => {
          if (error) console.error('[worker] access_audit_log insert failed (non-fatal):', error.message);
        });
    }
    jobLog(`Queued ${auditRows.length} access_audit_log entries`);
  }

  // -----------------------------------------------------------------------
  // 5 + 6 + 7. Build transaction inserts and kick off EVERYTHING in parallel:
  //   • audit_transactions upserts  (core — must succeed)
  //   • writeFraudEntities          (intelligence enrichment — non-fatal)
  //   • writeCoOccurrences          (intelligence enrichment — non-fatal)
  //   • writeIdentityClusters       (intelligence enrichment — non-fatal)
  //
  // Running intelligence writes in parallel with the main DB upserts cuts
  // wall-clock time roughly in half vs the previous sequential approach.
  // -----------------------------------------------------------------------
  const allInserts: FraudTransactionInsert[] = scored.map((s, i) =>
    rowToFraudTransaction(
      validPairs[i].parsed,
      s,
      identityResultsByOrder.get(s.order.orderId),
      jobId,
      ingestionSource,
      shopDomain,
      dedupMerchantId
    )
  );

  const dbBatches = splitIntoBatches(allInserts, BATCH_SIZE);
  let processedCount = 0;
  let failedCount    = 0;
  const errors: string[] = [];

  // Core transaction upserts — report progress every PROGRESS_INTERVAL rows
  // so the UI bar moves smoothly rather than jumping straight to done.
  const PROGRESS_INTERVAL = 1000;
  let pendingProgressRows = 0; // rows accumulated since last DB progress write
  let pendingProgressFailed = 0;

  const flushProgress = async () => {
    if (pendingProgressRows === 0 && pendingProgressFailed === 0) return;
    const rows = pendingProgressRows;
    const failed = pendingProgressFailed;
    pendingProgressRows = 0;
    pendingProgressFailed = 0;
    await incrementJobProgress(serviceClient, jobId, rows, failed);
  };

  const upsertAllBatches = async () => {
    const stageStart = checkpointStart('transaction_upserts', {
      rows: allInserts.length,
      batches: dbBatches.length,
      batchSize: BATCH_SIZE,
    });
    let active    = 0;
    let completed = 0;
    let rowsSinceLastFlush = 0;
    const batchQueue = [...dbBatches];
    const totalBatches = batchQueue.length;

    await new Promise<void>((resolve) => {
      function startNext() {
        if (batchQueue.length === 0) {
          if (active === 0) resolve();
          return;
        }
        const batch = batchQueue.shift()!;
        active++;
        upsertBatchNoProgress(batch, jobId, serviceClient, upsertOnConflict)
          .then(async (failedRows) => {
            const failedInBatch = Math.max(0, Math.min(batch.length, failedRows));
            const succeededRows = batch.length - failedInBatch;
            processedCount += succeededRows;
            failedCount += failedInBatch;
            pendingProgressRows += succeededRows;
            pendingProgressFailed += failedInBatch;
            rowsSinceLastFlush += batch.length;
            completed++;
            jobLog(`transactions upsert progress: batches ${completed}/${totalBatches}, processed ${processedCount}/${allInserts.length}`);
            if (failedInBatch > 0 && errors.length <= 3) {
              jobLog(
                `audit_transactions partial batch failure: ${failedInBatch}/${batch.length} rows failed after retries` +
                  (upsertOnConflict === 'shop_domain,order_id'
                    ? ` (onConflict=${upsertOnConflict}; see [shopify.audit] audit_transactions.upsert_failed)`
                    : '')
              );
            }
            if (rowsSinceLastFlush >= PROGRESS_INTERVAL) {
              rowsSinceLastFlush = 0;
              await flushProgress();
            }
          })
          .catch(async (err: Error) => {
            checkpoint('transaction_upserts', 'error', { message: err.message, batchRows: batch.length });
            failedCount += batch.length;
            pendingProgressFailed += batch.length;
            rowsSinceLastFlush += batch.length;
            errors.push(err.message);
            if (errors.length <= 3) {
              jobLog(`audit_transactions upsert failed for batch of ${batch.length}: ${err.message}`);
            }
            if (rowsSinceLastFlush >= PROGRESS_INTERVAL) {
              rowsSinceLastFlush = 0;
              await flushProgress();
            }
          })
          .finally(() => {
            active--;
            startNext();
          });
        if (active < concurrency) startNext();
      }
      startNext();
    });
    checkpointEnd('transaction_upserts', stageStart, { processed: processedCount, failed: failedCount });
  };

  // Critical path: write merchant-facing transaction rows first. Background
  // intelligence writes are launched only after progress has been flushed.
  jobLog('Starting critical transaction pipeline');
  await upsertAllBatches();
  pipelineWarnings.transactionUpsertFailedRows += failedCount;

  // Flush rows immediately after critical writes. From this point the chunk is
  // complete from the merchant-facing progress perspective.
  jobLog(`About to flush final progress: processed=${processedCount} failed=${failedCount}`);
  const progressStart = checkpointStart('increment_job_progress_flush', {
    pendingRows: pendingProgressRows,
    pendingFailed: pendingProgressFailed,
  });
  await flushProgress();
  checkpointEnd('increment_job_progress_flush', progressStart);
  jobLog('Job progress flushed');

  await mergePipelineWarnings(serviceClient, jobId, pipelineWarnings, jobLog);

  const backgroundWrites = startBackgroundIntelligenceWrites({
    scored,
    serviceClient,
    context,
    merchantId,
    jobId,
    chunkIndex: chunkInfo?.index ?? 0,
    identityResultsByOrder,
    identityClusterMap,
    checkpoint,
    checkpointStart,
    checkpointEnd,
    jobLog,
  });
  if (env.SYNC_BACKGROUND_WRITES === '1') {
    await backgroundWrites;
  }

  jobLog(`processCsvJob finished: processed=${processedCount} failed=${failedCount} duration=${Date.now() - overallStart}ms`);

  // -----------------------------------------------------------------------
  // 9. Log invalid rows as errors on the job record
  // -----------------------------------------------------------------------
  if (invalidRows.length > 0) {
    await logBatchError(
      serviceClient,
      jobId,
      invalidRows.map((r) => r.order_id),
      `Schema validation failed for ${invalidRows.length} row(s)`
    );
    await incrementJobProgress(serviceClient, jobId, 0, invalidRows.length);
  }

  return scored;
}

function startBackgroundIntelligenceWrites(args: {
  scored: ScoredOrder[];
  serviceClient: SupabaseClient<Database>;
  context: import('../engine/fastContext').FastScoringContext;
  merchantId?: string;
  jobId: string;
  chunkIndex: number;
  identityResultsByOrder: Map<string, { grade: any; signalsMatched: string[]; clusterId: string | null; matchStatus: any }>;
  identityClusterMap: Record<string, { clusterId: string; entityType: string; entityValue: string; confidence: number; matchReasons: string[]; firstSeen: string; lastSeen: string } | null>;
  checkpoint: CheckpointLog;
  checkpointStart: (stage: string, meta?: Record<string, unknown>) => number;
  checkpointEnd: CheckpointEnd;
  jobLog: (msg: string) => void;
}): Promise<void> {
  const {
    scored,
    serviceClient,
    context,
    merchantId,
    jobId,
    chunkIndex,
    identityResultsByOrder,
    identityClusterMap,
    checkpoint,
    checkpointStart,
    checkpointEnd,
  jobLog,
  } = args;

  return (async () => {
    const bgStart = checkpointStart('background_intelligence_writes', {
      rows: scored.length,
      chunkIndex,
    });
    let backgroundJobId: string | null = null;

    try {
      const { data, error } = await (serviceClient as any)
        .from('background_intelligence_jobs')
        .insert({
          job_id: jobId,
          chunk_index: chunkIndex,
          status: 'pending',
          started_at: new Date().toISOString(),
        })
        .select('id')
        .single();
      if (error) console.error('[worker] background_intelligence_jobs insert failed:', error.message);
      else backgroundJobId = data.id;
    } catch (err) {
      console.error('[worker] background_intelligence_jobs insert threw:', err);
    }

    const markBackground = async (status: 'completed' | 'failed', errorMessage?: string) => {
      if (!backgroundJobId) return;
      const { error } = await (serviceClient as any)
        .from('background_intelligence_jobs')
        .update({
          status,
          completed_at: new Date().toISOString(),
          error: errorMessage ?? null,
        })
        .eq('id', backgroundJobId);
      if (error) console.error('[worker] background_intelligence_jobs update failed:', error.message);
    };

    try {
      const entityResolutionTask = merchantId
        ? (async () => {
            try {
              const erLookupStart = checkpointStart('entity_resolution_bulk_lookups', { rows: scored.length });
              const chunkOrderIds = scored.map((s) => s.order.orderId);
              const txIdMap = new Map<string, string>();
              const TX_LOOKUP_CHUNK = 500;
              const txChunks: string[][] = [];
              for (let i = 0; i < chunkOrderIds.length; i += TX_LOOKUP_CHUNK) {
                txChunks.push(chunkOrderIds.slice(i, i + TX_LOOKUP_CHUNK));
              }
              const txResults = await Promise.all(
                txChunks.map((slice) =>
                  withTransportRetry(() =>
                    withRetry(async () => {
                      const { data, error } = await serviceClient
                        .from(TABLES.AUDIT_TRANSACTIONS)
                        .select('id, order_id')
                        .eq('job_id', jobId)
                        .in('order_id', slice);
                      if (error) throw error;
                      return data ?? [];
                    })
                  )
                )
              );
              for (const txRows of txResults) {
                for (const row of txRows) txIdMap.set(row.order_id, row.id);
              }
              checkpointEnd('entity_resolution_bulk_lookups', erLookupStart, {
                txIdsResolved: txIdMap.size,
                txLookupChunks: txChunks.length,
              });

              const erWriteStart = checkpointStart('entity_resolution_bulk_writes', { rows: scored.length });
              const identitySummaryByOrder = new Map(
                Array.from(identityResultsByOrder.entries()).map(([orderId, identity]) => [
                  orderId,
                  {
                    grade: identity.grade,
                    signals: identity.signalsMatched,
                    clusterId: identity.clusterId,
                    matchStatus: identity.matchStatus,
                  },
                ])
              );
              const profileResult = await processProfilesForBatch(
                scored,
                merchantId,
                jobId,
                txIdMap,
                serviceClient,
                identitySummaryByOrder
              );
              const graphResult = env.SKIP_OPTIONAL_BACKGROUND_WRITES === '1'
                ? {
                    attributesUpserted: 0,
                    appearancesInserted: 0,
                    crossMerchantAttributes: 0,
                    errors: [] as string[],
                  }
                : await persistGlobalIdentityGraph({
                    scored,
                    merchantId,
                    auditId: jobId,
                    transactionIdMap: txIdMap,
                    serviceClient,
                    identityByOrder: identitySummaryByOrder,
                  });
              console.log(
                `[worker] Entity resolution: ${profileResult.profilesCreated} created, ${profileResult.profilesUpdated} updated, ${profileResult.errors.length} errors`
              );
              console.log(
                `[worker] Global identity graph: ${graphResult.attributesUpserted} attributes, ` +
                `${graphResult.appearancesInserted} appearances, ${graphResult.crossMerchantAttributes} cross-merchant, ` +
                `${graphResult.errors.length} errors`
              );
              if (profileResult.errors.length > 0) {
                console.error('[worker] entity resolution sample errors:', profileResult.errors.slice(0, 3));
              }
              if (graphResult.errors.length > 0) {
                console.error('[worker] global identity graph sample errors:', graphResult.errors.slice(0, 3));
                throw new Error(`Global identity graph completed with ${graphResult.errors.length} error(s)`);
              }
              checkpointEnd('entity_resolution_bulk_writes', erWriteStart, {
                profilesCreated: profileResult.profilesCreated,
                profilesUpdated: profileResult.profilesUpdated,
                profileErrors: profileResult.errors.length,
                globalIdentityAttributes: graphResult.attributesUpserted,
                globalIdentityAppearances: graphResult.appearancesInserted,
                globalIdentityCrossMerchant: graphResult.crossMerchantAttributes,
              });
            } catch (err) {
              checkpoint('entity_resolution_bulk_writes', 'error', {
                message: String((err as Error)?.message ?? err),
              });
              console.error('[worker] processProfilesForBatch failed:', err);
              throw err;
            }
          })()
        : Promise.resolve();

      const optionalEnrichmentTasks = env.SKIP_OPTIONAL_BACKGROUND_WRITES === '1'
        ? []
        : [
        (async () => {
          const feStart = checkpointStart('fraud_entities_writes', { rows: scored.length });
          try {
            await writeFraudEntities(scored, serviceClient, context);
            checkpointEnd('fraud_entities_writes', feStart);
          } catch (err) {
            checkpoint('fraud_entities_writes', 'error', { message: String((err as Error)?.message ?? err) });
            console.error('[worker] writeFraudEntities failed:', err);
          }
        })(),
        (async () => {
          const coStart = checkpointStart('co_occurrence_writes', { rows: scored.length });
          try {
            const result = await writeCoOccurrences(scored, serviceClient, context);
            checkpointEnd('co_occurrence_writes', coStart, { upstreamDown: result.upstreamDown });
          } catch (err) {
            checkpoint('co_occurrence_writes', 'error', { message: String((err as Error)?.message ?? err) });
            console.error('[worker] writeCoOccurrences failed:', err);
          }
        })(),
        writeIdentityClusters(identityClusterMap, serviceClient).catch((err) =>
          console.error('[worker] writeIdentityClusters failed:', err)
        ),
      ];

      const backgroundResults = await Promise.allSettled([
        entityResolutionTask,
        ...optionalEnrichmentTasks,
      ]);
      const failedBackgroundTasks = backgroundResults.filter((result) => result.status === 'rejected');
      if (failedBackgroundTasks.length > 0) {
        throw new Error(`${failedBackgroundTasks.length} background intelligence task(s) failed`);
      }

      await markBackground('completed');
      checkpointEnd('background_intelligence_writes', bgStart, { status: 'completed' });
      jobLog(`Background intelligence writes complete for chunk ${chunkIndex}`);
    } catch (err) {
      const message = String((err as Error)?.message ?? err);
      await markBackground('failed', message);
      checkpoint('background_intelligence_writes', 'error', { message });
      console.error('[worker] background intelligence writes failed:', err);
    }
  })();
}

// ---------------------------------------------------------------------------
// Aggregation helper: collapse a batch's worth of per-row entity contributions
// into one record per (entity_type, entity_value) so the RPC is called the
// minimum number of times. CRITICAL: every value is normalised through the
// canonical normalisers so reads in fastContext.ts hit the same key.
// ---------------------------------------------------------------------------
type EntityAccumulator = {
  entity_type: 'email' | 'ip' | 'address' | 'card_last4';
  entity_value: string;
  total_orders_delta: number;
  total_refund_claims_delta: number;
  total_chargebacks_delta: number;
  flagged_count_delta: number;
  matchScores: number[];
  refund_timestamps: string[];
  fastest_claim_days: number | null;
  refund_in_this_batch: boolean;
  job_id: string | null;
};

function accumulateEntities(scored: ScoredOrder[]): Map<string, EntityAccumulator> {
  const acc = new Map<string, EntityAccumulator>();

  const bump = (
    entity_type: EntityAccumulator['entity_type'],
    entity_value: string,
    contribution: Partial<EntityAccumulator>
  ) => {
    if (!entity_value) return;
    const key = `${entity_type}:${entity_value}`;
    let entry = acc.get(key);
    if (!entry) {
      entry = {
        entity_type,
        entity_value,
        total_orders_delta: 0,
        total_refund_claims_delta: 0,
        total_chargebacks_delta: 0,
        flagged_count_delta: 0,
        matchScores: [],
        refund_timestamps: [],
        fastest_claim_days: null,
        refund_in_this_batch: false,
        job_id: null,
      };
      acc.set(key, entry);
    }
    if (contribution.total_orders_delta) entry.total_orders_delta += contribution.total_orders_delta;
    if (contribution.total_refund_claims_delta) entry.total_refund_claims_delta += contribution.total_refund_claims_delta;
    if (contribution.flagged_count_delta) entry.flagged_count_delta += contribution.flagged_count_delta;
    if (contribution.matchScores) entry.matchScores.push(...contribution.matchScores);
    if (contribution.refund_timestamps) entry.refund_timestamps.push(...contribution.refund_timestamps);
    if (contribution.refund_in_this_batch) entry.refund_in_this_batch = true;
    if (contribution.fastest_claim_days !== undefined && contribution.fastest_claim_days !== null) {
      if (entry.fastest_claim_days === null || contribution.fastest_claim_days < entry.fastest_claim_days) {
        entry.fastest_claim_days = contribution.fastest_claim_days;
      }
    }
  };

  for (const s of scored) {
    const order = s.order as NormalisedOrder & {
      _rawEmail?: string;
      _rawIP?: string | null;
      _rawAddress?: string | null;
      _rawCardLast4?: string | null;
    };

    const email = normaliseEmail(order._rawEmail);
    const ip = normaliseIP(order._rawIP);
    const address = normaliseAddress(order._rawAddress);
    const card = normaliseCard(order._rawCardLast4);

    const isRefund =
      order.refundStatus === 'full' ||
      order.refundStatus === 'partial' ||
      order.orderStatus === 'refunded';
    const isFlagged = s.flagged ? 1 : 0;

    let daysToClaim: number | null = null;
    if (order.refundDate && order.orderDate) {
      daysToClaim = (order.refundDate.getTime() - order.orderDate.getTime()) / (1000 * 60 * 60 * 24);
    }

    const refundTs: string[] = [];
    if (isRefund && order.refundDate) refundTs.push(order.refundDate.toISOString());

    const baseContribution = {
      total_orders_delta: 1,
      total_refund_claims_delta: isRefund ? 1 : 0,
      flagged_count_delta: isFlagged,
      matchScores: [s.totalScore],
      refund_in_this_batch: isRefund,
    };

    if (email) {
      bump('email', email, {
        ...baseContribution,
        refund_timestamps: refundTs,
        fastest_claim_days: isRefund ? daysToClaim : null,
      });
    }
    if (ip) bump('ip', ip, baseContribution);
    if (address) bump('address', address, baseContribution);
    if (card) bump('card_last4', card, baseContribution);
  }

  return acc;
}

async function writeFraudEntities(
  scored: ScoredOrder[],
  serviceClient: SupabaseClient<Database>,
  context?: import('../engine/fastContext').FastScoringContext
): Promise<void> {
  const accumulator = accumulateEntities(scored);
  if (accumulator.size === 0) return;

  const payload = Array.from(accumulator.values()).map((t) => ({
    entity_type:         t.entity_type,
    entity_value:        t.entity_value,
    orders_delta:        t.total_orders_delta,
    refund_claims_delta: t.total_refund_claims_delta,
    chargebacks_delta:   t.total_chargebacks_delta,
    flagged_delta:       t.flagged_count_delta,
    score_avg:           t.matchScores.length > 0
                           ? t.matchScores.reduce((a, b) => a + b, 0) / t.matchScores.length
                           : 0,
    refund_timestamps:   t.refund_timestamps,
    fastest_claim_days:  t.fastest_claim_days,
    refund_this_batch:   t.refund_in_this_batch,
  }));

  // --- Fast path: chunked bulk_upsert_fraud_entities RPC calls with backoff ---
  const RPC_CHUNK = 2000;
  const RPC_CONCURRENCY = 4;
  let rpcError: { code: string; message: string } | null = null;
  let rpcSucceeded = false;
  const rpcChunks = splitIntoBatches(payload, RPC_CHUNK);
  try {
    await mapWithConcurrency(rpcChunks, RPC_CONCURRENCY, async (chunk) => {
      await withTransportRetry(() =>
        withRetry(async () => {
          const { error } = await serviceClient.rpc('bulk_upsert_fraud_entities' as any, { p_entities: chunk });
          if (error) throw error;
        })
      );
    });
  } catch (err: any) {
    rpcError = err;
  }
  if (!rpcError) {
    console.log(`[worker] ${new Date().toISOString()} bulk_upsert_fraud_entities: ${payload.length} entities in ${rpcChunks.length} RPC chunk(s)`);
    rpcSucceeded = true;
  }

  if (rpcSucceeded) return;

  // Upstream is down (Supabase 521 / schema-cache thrash). Falling back to a
  // chunked direct upsert just hammers the same broken endpoint with 100+
  // sequential failing requests. Skip — fraud_entities is best-effort.
  if (isUpstreamDown(rpcError)) {
    console.warn(`[worker] ${new Date().toISOString()} writeFraudEntities skipped: upstream unavailable (${(rpcError as any)?.message ?? 'unknown'})`);
    return;
  }

  if (rpcError && rpcError.code !== 'PGRST202' && rpcError.code !== '42883') {
    console.error(`[worker] ${new Date().toISOString()} bulk_upsert_fraud_entities RPC failed: ${rpcError.message}`);
  }

  // Build final rows for direct upsert
  const now = new Date().toISOString();
  const directRows = payload.map((t) => {
    let existing: import('../engine/fastContext').FraudEntity | undefined;
    if (context) {
      const maps: Record<string, Map<string, import('../engine/fastContext').FraudEntity>> = {
        email:      context.historicalEmailMap,
        ip:         context.historicalIPMap,
        address:    context.historicalAddressMap,
        card_last4: context.historicalCardMap,
      };
      existing = maps[t.entity_type]?.get(t.entity_value);
    }

    const prevOrders    = existing?.total_orders ?? 0;
    const prevRefunds   = existing?.total_refund_claims ?? 0;
    const prevChargebacks = existing?.total_chargebacks ?? 0;
    const prevFlagged   = existing?.flagged_count ?? 0;
    const prevScoreAvg  = existing?.match_score_avg ?? 0;
    const prevFastest   = existing?.fastest_claim_days ?? null;
    const prevRefundTs  = existing?.refund_timestamps ?? [];

    const newOrders = prevOrders + t.orders_delta;
    const newScoreAvg = newOrders > 0
      ? (prevScoreAvg * prevOrders + t.score_avg * t.orders_delta) / newOrders
      : t.score_avg;

    const combinedTs = [
      ...(Array.isArray(prevRefundTs) ? prevRefundTs : []),
      ...t.refund_timestamps,
    ];

    const newFastest =
      prevFastest !== null && t.fastest_claim_days !== null
        ? Math.min(prevFastest, t.fastest_claim_days)
        : prevFastest ?? t.fastest_claim_days;

    return {
      entity_type:                 t.entity_type,
      entity_value:                t.entity_value,
      total_orders:                newOrders,
      total_refund_claims:         prevRefunds + t.refund_claims_delta,
      total_chargebacks:           prevChargebacks + t.chargebacks_delta,
      flagged_count:               prevFlagged + t.flagged_delta,
      match_score_avg:              newScoreAvg,
      refund_timestamps:           combinedTs,
      fastest_claim_days:          newFastest,
      first_seen:                  existing?.first_seen ?? now,
      last_seen:                   now,
    };
  });

  // Chunk into 1k per upsert and run a few chunks concurrently to stay within
  // PostgREST limits without serialising the entire fallback path.
  const CHUNK = 1000;
  const chunks = splitIntoBatches(directRows, CHUNK);
  await mapWithConcurrency(chunks, 4, async (chunk, index) => {
    const { error: upsertError } = await (serviceClient as any)
      .from('fraud_entities')
      .upsert(chunk as any, { onConflict: 'entity_type,entity_value', ignoreDuplicates: false });
    if (upsertError) {
      if (isUpstreamDown(upsertError)) {
        console.warn(`[worker] ${new Date().toISOString()} fraud_entities direct upsert: upstream down at chunk ${index}, aborting fallback`);
        return;
      }
      console.error(`[worker] ${new Date().toISOString()} fraud_entities direct upsert failed (chunk ${index}): ${upsertError.message}`);
    }
  });
  console.log(`[worker] ${new Date().toISOString()} writeFraudEntities: ${directRows.length} entities (direct upsert fallback)`);
}

async function writeCoOccurrences(
  scored: ScoredOrder[],
  serviceClient: SupabaseClient<Database>,
  context?: import('../engine/fastContext').FastScoringContext
): Promise<{ upstreamDown: boolean }> {
  // Build deterministic, deduplicated co-occurrence pairs across the batch.
  // The pair key sorts (a,b) alphabetically by `${type}:${value}` so the
  // same pair always collapses to one row regardless of insertion order.
  const pairCounts = new Map<string, {
    entity_a_type: string;
    entity_a_value: string;
    entity_b_type: string;
    entity_b_value: string;
    count: number;
  }>();

  for (const s of scored) {
    const order = s.order as NormalisedOrder & {
      _rawEmail?: string;
      _rawIP?: string | null;
      _rawAddress?: string | null;
      _rawCardLast4?: string | null;
    };

    const entities: Array<{ type: string; value: string }> = [];
    const email = normaliseEmail(order._rawEmail);
    const ip = normaliseIP(order._rawIP);
    const address = normaliseAddress(order._rawAddress);
    const card = normaliseCard(order._rawCardLast4);
    if (email) entities.push({ type: 'email', value: email });
    if (ip) entities.push({ type: 'ip', value: ip });
    if (address) entities.push({ type: 'address', value: address });
    if (card) entities.push({ type: 'card_last4', value: card });

    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        const a = `${entities[i].type}:${entities[i].value}`;
        const b = `${entities[j].type}:${entities[j].value}`;
        const [first, second] =
          a < b
            ? [entities[i], entities[j]]
            : [entities[j], entities[i]];
        const key = `${first.type}:${first.value}|${second.type}:${second.value}`;
        const existing = pairCounts.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          pairCounts.set(key, {
            entity_a_type: first.type,
            entity_a_value: first.value,
            entity_b_type: second.type,
            entity_b_value: second.value,
            count: 1,
          });
        }
      }
    }
  }

  if (pairCounts.size === 0) return { upstreamDown: false };

  const payload = Array.from(pairCounts.values()).map((p) => ({
    a_type:      p.entity_a_type,
    a_value:     p.entity_a_value,
    b_type:      p.entity_b_type,
    b_value:     p.entity_b_value,
    count_delta: p.count,
  }));

  // --- Fast path: chunked bulk_upsert_co_occurrences RPC calls with backoff ---
  const RPC_CHUNK = 2000;
  const RPC_CONCURRENCY = 4;
  let coRpcError: { code: string; message: string } | null = null;
  let coRpcSucceeded = false;
  const coRpcChunks = splitIntoBatches(payload, RPC_CHUNK);
  try {
    await mapWithConcurrency(coRpcChunks, RPC_CONCURRENCY, async (chunk) => {
      await withTransportRetry(() =>
        withRetry(async () => {
          const { error } = await serviceClient.rpc('bulk_upsert_co_occurrences' as any, { p_pairs: chunk });
          if (error) throw error;
        })
      );
    });
  } catch (err: any) {
    coRpcError = err;
  }
  if (!coRpcError) {
    console.log(`[worker] ${new Date().toISOString()} bulk_upsert_co_occurrences: ${payload.length} pairs in ${coRpcChunks.length} RPC chunk(s)`);
    coRpcSucceeded = true;
  }

  if (coRpcSucceeded) return { upstreamDown: false };

  // Upstream down (Supabase 521 / schema cache). Skip the fallback loop — it
  // would do 100+ sequential failing 500-row upserts against a broken endpoint.
  // co_occurrences is best-effort intelligence.
  if (isUpstreamDown(coRpcError)) {
    console.warn(`[worker] ${new Date().toISOString()} writeCoOccurrences skipped: upstream unavailable (${(coRpcError as any)?.message ?? 'unknown'})`);
    return { upstreamDown: true };
  }

  if (coRpcError && coRpcError.code !== 'PGRST202' && coRpcError.code !== '42883') {
    console.error(`[worker] ${new Date().toISOString()} bulk_upsert_co_occurrences RPC failed: ${coRpcError.message}`);
  }

  // Fallback: compute final counts using historicalCoOccurrenceMap and direct upsert.
  const now = new Date().toISOString();
  const directRows = payload.map((p) => {
    const keyAB = `${p.a_type}:${p.a_value}|${p.b_type}:${p.b_value}`;
    const keyBA = `${p.b_type}:${p.b_value}|${p.a_type}:${p.a_value}`;
    const existingList = context?.historicalCoOccurrenceMap?.get(keyAB) ??
                         context?.historicalCoOccurrenceMap?.get(keyBA) ?? [];
    const existing = existingList.find(
      (c) =>
        (c.entity_a_type === p.a_type && c.entity_a_value === p.a_value &&
         c.entity_b_type === p.b_type && c.entity_b_value === p.b_value) ||
        (c.entity_a_type === p.b_type && c.entity_a_value === p.b_value &&
         c.entity_b_type === p.a_type && c.entity_b_value === p.a_value)
    );
    return {
      entity_a_type:         p.a_type,
      entity_a_value:        p.a_value,
      entity_b_type:         p.b_type,
      entity_b_value:        p.b_value,
      co_occurrence_count:   (existing?.co_occurrence_count ?? 0) + p.count_delta,
      first_seen:            existing?.first_seen ?? now,
      last_seen:             now,
    };
  });

  const CHUNK = 1000;
  const chunks = splitIntoBatches(directRows, CHUNK);
  await mapWithConcurrency(chunks, 4, async (chunk, index) => {
    const { error: upsertError } = await (serviceClient as any)
      .from('fraud_entity_co_occurrences')
      .upsert(chunk as any, {
        onConflict: 'entity_a_type,entity_a_value,entity_b_type,entity_b_value',
        ignoreDuplicates: false,
      });
    if (upsertError) {
      if (isUpstreamDown(upsertError)) {
        console.warn(`[worker] ${new Date().toISOString()} co_occurrences direct upsert: upstream down at chunk ${index}, aborting fallback`);
        return;
      }
      console.error(`[worker] ${new Date().toISOString()} co_occurrences direct upsert failed (chunk ${index}): ${upsertError.message}`);
    }
  });
  console.log(`[worker] ${new Date().toISOString()} writeCoOccurrences: ${directRows.length} pairs (direct upsert fallback)`);
  return { upstreamDown: false };
}

async function writeIdentityClusters(
  clusterMap: Record<string, { clusterId: string; entityType: string; entityValue: string; confidence: number; matchReasons: string[]; firstSeen: string; lastSeen: string } | null>,
  serviceClient: SupabaseClient<Database>
): Promise<void> {
  const inserts: Array<{
    cluster_id: string;
    entity_type: string;
    entity_value: string;
    confidence: number;
    match_reasons: string[];
  }> = [];

  for (const cluster of Object.values(clusterMap)) {
    if (!cluster) continue;
    // Re-normalise the entity value defensively so cluster keys match
    // the same normalisation used for fraud_entities lookups.
    let entityValue: string | null = cluster.entityValue;
    switch (cluster.entityType) {
      case 'email':     entityValue = normaliseEmail(entityValue); break;
      case 'ip':        entityValue = normaliseIP(entityValue); break;
      case 'address':   entityValue = normaliseAddress(entityValue); break;
      case 'card_last4':entityValue = normaliseCard(entityValue); break;
    }
    if (!entityValue) continue;
    inserts.push({
      cluster_id: cluster.clusterId,
      entity_type: cluster.entityType,
      entity_value: entityValue,
      confidence: cluster.confidence,
      match_reasons: cluster.matchReasons,
    });
  }

  if (inserts.length === 0) return;

  // Dedupe by (cluster_id, entity_type, entity_value) to respect the unique
  // constraint and avoid sending the DB redundant work.
  const seen = new Set<string>();
  const deduped = inserts.filter((row) => {
    const k = `${row.cluster_id}|${row.entity_type}|${row.entity_value}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  const { error } = await (serviceClient as any)
    .from('fraud_identity_clusters')
    .upsert(deduped as any, {
      onConflict: 'cluster_id,entity_type,entity_value',
      ignoreDuplicates: false,
    });

  if (error) {
    console.error(`[worker] fraud_identity_clusters upsert failed: ${error.message}`);
  }
}

// upsertBatchNoProgress — used by the new parallel pipeline.
// Progress counts are accumulated in the caller and written once at the end
// via a single incrementJobProgress call, avoiding the flood of RPC errors
// that occurred when increment_job_progress was missing from the schema.
async function upsertBatchNoProgress(
  inserts: FraudTransactionInsert[],
  jobId: string,
  serviceClient: SupabaseClient<Database>,
  onConflict = 'job_id,order_id'
): Promise<number> {
  const isRetryableCoreUpsertError = (message: string): boolean => {
    const msg = message.toLowerCase();
    return (
      msg.includes('fetch failed') ||
      msg.includes('econnreset') ||
      msg.includes('etimedout') ||
      msg.includes('connection terminated') ||
      msg.includes('connection reset') ||
      msg.includes('statement timeout') ||
      msg.includes('canceling statement due to statement timeout') ||
      msg.includes('57014') ||
      msg.includes('429') ||
      msg.includes('too many requests') ||
      msg.includes('520') ||
      msg.includes('cloudflare') ||
      msg.includes('web server is returning an unknown error') ||
      msg.includes('502') ||
      msg.includes('503') ||
      msg.includes('504') ||
      msg.includes('gateway timeout') ||
      msg.includes('temporarily unavailable')
    );
  };

  const MAX_ATTEMPTS = 4;
  let lastMessage = 'unknown error';

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const { error } = await serviceClient
      .from(TABLES.AUDIT_TRANSACTIONS)
      .upsert(inserts as any, { onConflict });

    if (!error) return 0;

    lastMessage = error.message ?? 'unknown error';
    if (onConflict === 'shop_domain,order_id') {
      shopifyAuditError('audit_transactions.upsert_failed', error, {
        onConflict,
        batchSize: inserts.length,
        postgresCode: error.code ?? null,
        details: error.details ?? null,
        hint: error.hint ?? null,
        sampleOrderIds: inserts
          .slice(0, 5)
          .map((r) => r.order_id)
          .join(','),
      });
    }
    const retryable = isRetryableCoreUpsertError(lastMessage);
    if (!retryable || attempt === MAX_ATTEMPTS) {
      // If a large write keeps timing out, salvage progress by recursively
      // splitting into smaller batches before declaring hard failure.
      if (retryable && inserts.length > 100) {
        const mid = Math.floor(inserts.length / 2);
        const left = inserts.slice(0, mid);
        const right = inserts.slice(mid);
        const [leftFailed, rightFailed] = await Promise.all([
          upsertBatchNoProgress(left, jobId, serviceClient, onConflict),
          upsertBatchNoProgress(right, jobId, serviceClient, onConflict),
        ]);
        return leftFailed + rightFailed;
      }
      const suffix = retryable ? ` after ${attempt} attempts` : '';
      await logBatchError(
        serviceClient,
        jobId,
        inserts.map((r) => r.order_id),
        `Supabase upsert failed${suffix}: ${lastMessage}`
      );
      return inserts.length;
    }

    // Core write hardening: brief exponential backoff for transient network/API
    // failures so one blip doesn't zero-out an entire upload.
    const jitter = Math.random() * 150;
    const delayMs = 250 * 2 ** (attempt - 1) + jitter;
    await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
  }

  return inserts.length;
}
