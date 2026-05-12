/* ────────────────────────────────────────────────────────────────────────────
 * 🔒 LOCKED FILE — DO NOT MODIFY WITHOUT EXPLICIT USER PERMISSION 🔒
 *
 * Core of the CSV scoring pipeline. The parallel pipeline (transactions +
 * intelligence writes) and per-batch progress reporting were tuned on
 * 2026-05-03. Any change requires explicit user sign-off — see workspace
 * memory rule "Locked CSV upload pipeline".
 * ──────────────────────────────────────────────────────────────────────── */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../supabase/types';
import type { ParsedCsvRow, FraudTransactionInsert } from './types';
import { buildFastContext } from '../engine/fastContext';
import { scoreBatch } from '../engine/fastScore';
import { buildIdentityClusterMapFromLinkerResult } from '../engine/identityClusterBuilder';
import { linkIdentities, type LinkedCluster, type LinkerOrderInput } from '../linker';
import { scoreAllClusters, scoreIdentityFromSignals, type ScoredCluster, type ScorerOrder } from '../scorer';
import { assessDataQuality } from '../csv/dataQuality';
import type { NormalisedOrder, ScoredOrder } from '../engine/types';
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

const BATCH_SIZE = 500;  // 500 rows per upsert — halves round-trips vs the old 200
const DEFAULT_CONCURRENCY = 5;

function splitIntoBatches<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
}

type MatchStatus = 'none' | 'candidate' | 'probable' | 'definite';

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

function rawIds(order: NormalisedOrder) {
  return order as NormalisedOrder & {
    _rawEmail?: string | null;
    _rawPhone?: string | null;
    _rawPostcode?: string | null;
    _rawIP?: string | null;
    _rawAddress?: string | null;
    _rawCardLast4?: string | null;
    _rawCardBin?: string | null;
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
      postcode: ids._rawPostcode || null,
      ip: ids._rawIP || null,
      card_last4: ids._rawCardLast4 || null,
      card_bin: ids._rawCardBin || null,
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
      const grade = pureGradeToLegacyGrade(pureGrade);
      const matchStatus = pureGradeToMatchStatus(pureGrade);
      const identityScore = grade ? (rowPureResult?.identity_match_score ?? null) : null;
      const recommendedAction = recommendedActionForPureGrade(grade);
      const isConfirmed = matchStatus === 'definite';
      const isProbable  = matchStatus === 'probable';
      const isCandidate = matchStatus === 'candidate';

      result.set(orderId, {
        grade,
        matchStatus,
        identityScore,
        signalsMatched: rowSignals,
        behaviouralFlags: (clusterScore?.behavioural_flags ?? []).map((flag) => flag.flag),
        recommendedAction,
        ce3Eligible: contextResult?.ce3_eligible ?? clusterScore?.ce3_eligible ?? false,
        ce3QualifyingTransactions: ce3OrderIds,
        clusterId: isConfirmed ? cluster.cluster_id : null,
        candidateClusterId: (isCandidate || isProbable || isConfirmed) ? cluster.cluster_id : null,
        confirmedIdentityId: isConfirmed ? cluster.cluster_id : null,
        identityMatchResult: rowPureResult,
        contextFlags: contextResult?.context_flags ?? [],
        contextSummary: contextResult?.context_summary ?? null,
      });
    }
  }

  return result;
}

// IMPORTANT: this takes the *cleaned/aliased* CsvRow (validPairs[i].parsed),
// NOT the raw streamParser row. The raw row keeps the CSV's original header
// names (e.g. `email`, `Customer Email`) — only the parsed row guarantees
// canonical fields like `customer_email`, `ip_address`, `card_last4`.
function rowToFraudTransaction(
  row: CsvRow,
  scored: { totalScore: number; riskTier: 'low' | 'medium' | 'high' | 'critical'; flagged: boolean; signals: { name: string; fired: boolean }[] },
  identity: PersistedIdentityResult | undefined,
  jobId: string
): FraudTransactionInsert {
  const flags = scored.signals.filter((s) => s.fired).map((s) => s.name);
  const imr = identity?.identityMatchResult;

  return {
    job_id: jobId,
    order_id: row.order_id,
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
    refund_claimed: row.refund_status === 'full' || row.refund_status === 'partial' || row.refund_status === 'refunded',
    refund_reason: row.refund_reason,
    chargeback_filed: null,
    match_score: scored.totalScore,
    fraud_flags: flags,
    risk_level: scored.riskTier,
    identity_confidence_grade: identity?.grade ?? null,
    identity_score: identity?.identityScore ?? null,
    signals_matched: identity?.signalsMatched ?? [],
    behavioural_flags: identity?.behaviouralFlags ?? [],
    recommended_action: identity?.recommendedAction ?? null,
    ce3_eligible: identity?.ce3Eligible ?? false,
    ce3_qualifying_transactions: identity?.ce3QualifyingTransactions ?? [],
    cluster_id: identity?.clusterId ?? null,
    match_status: identity?.matchStatus ?? 'none',
    candidate_cluster_id: identity?.candidateClusterId ?? null,
    confirmed_identity_id: identity?.confirmedIdentityId ?? null,
    false_positive_reported: false,
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
  chunkInfo?: ChunkInfo
): Promise<ScoredOrder[]> {
  const jobLog = (msg: string) => console.log(`[job ${jobId}] ${new Date().toISOString()} ${msg}`);
  const overallStart = Date.now();
  // -----------------------------------------------------------------------
  // 1. Validate & clean all rows up front (fast, synchronous)
  // -----------------------------------------------------------------------
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

  // -----------------------------------------------------------------------
  // 2. Normalise all valid rows (fast, synchronous)
  // -----------------------------------------------------------------------
  const normOrders: NormalisedOrder[] = validPairs.map((p) => normaliseRow(p.parsed));

  // -----------------------------------------------------------------------
  // 2b. Assess data quality and persist to the job record (non-blocking).
  //     Only on the first chunk — the data shape is fixed at upload time so
  //     re-assessing per chunk is wasted work.
  // -----------------------------------------------------------------------
  if (!chunkInfo || chunkInfo.isFirst) {
    const dataQuality = assessDataQuality(normOrders);
    void serviceClient
      .from('processing_jobs')
      .update({ data_quality: dataQuality } as any)
      .eq('id', jobId)
      .then(() => jobLog('Data quality report stored'));
  }

  // -----------------------------------------------------------------------
  // 3. Build scoring context (Supabase I/O) overlapped with the identity
  //    linker (pure CPU). buildFastContext fires all Supabase queries into
  //    the event loop immediately, then yields on each await. While those
  //    round-trips are in-flight we run the synchronous linker — saving the
  //    full buildFastContext wall-clock time (~15–60s per chunk).
  // -----------------------------------------------------------------------
  const contextPromise = buildFastContext(normOrders, serviceClient, merchantId);

  // Run the identity linker synchronously while Supabase I/O is in-flight.
  // linkerInputs + linkIdentities are pure CPU — no awaits, no I/O.
  const linkerInputs = buildLinkerInput(normOrders);
  const linkerResult = linkIdentities(linkerInputs);

  // Now collect the context (may already be resolved if linker was slower).
  const context = await contextPromise;
  jobLog(`buildFastContext completed in ${Date.now() - overallStart}ms — orders=${normOrders.length}`);

  // Build the cluster map and order/cluster scores from the single linker run.
  const identityClusterMap = buildIdentityClusterMapFromLinkerResult(normOrders, linkerResult);
  const ordersById = new Map(validPairs.map((pair) => [pair.parsed.order_id, rowToScorerOrder(pair.parsed)]))
  const clusterScores = scoreAllClusters(linkerResult.clusters, ordersById);

  // -----------------------------------------------------------------------
  // 4. Score all rows synchronously (O(n) thanks to precomputed context)
  // -----------------------------------------------------------------------
  const scored = scoreBatch(normOrders, context, identityClusterMap);
  const identityResultsByOrder = buildClusterIdentityResults(linkerResult.clusters, clusterScores, linkerInputs, ordersById);

  // -----------------------------------------------------------------------
  // 3c. Second-stage graph expansion — cautious, false-positive-safe.
  //     Runs AFTER the core linker so it can only ADD rows to existing or
  //     promoted clusters; it never lowers the main linker thresholds.
  // -----------------------------------------------------------------------
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

  const expansion = expandSuspiciousClusters(
    linkerResult.clusters,
    linkerResult.candidatePairs,
    linkerInputs,
    behaviourMap,
    nameMap,
  );

  // Log any debug reports so they're visible in job logs
  if (expansion.debugReports.length > 0) {
    jobLog(`[expansion] ${expansion.promotedClusters.length} promoted clusters, ` +
      `${expansion.additionalClusterAssignments.size} expanded rows`);
    for (const report of expansion.debugReports) {
      jobLog(`[expansion] ${report.missed_order_id} → cluster ${report.nearest_cluster_id}: ` +
        `${report.recommended_fix ?? 'no fix'}`);
    }
  }

  // Pre-build O(1) lookup maps used in the expansion merge below.
  // Without these, every .find()/.filter() inside the loop is O(n) against
  // linkerInputs (50k entries) and linkerResult.clusters, making the merge
  // O(n × expanded-rows) in the worst case.
  const clusterById = new Map(linkerResult.clusters.map((c) => [c.cluster_id, c]));
  const clusterMemberSet = new Map(
    linkerResult.clusters.map((c) => [c.cluster_id, new Set(c.order_ids)])
  );
  const linkerInputById = new Map(linkerInputs.map((r) => [r.order_id, r]));

  // Merge expansion results: only update rows that aren't already in a cluster
  if (expansion.additionalClusterAssignments.size > 0 || expansion.promotedClusters.length > 0) {
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

    // Compute per-row identity results for newly included rows
    const expansionResults = buildClusterIdentityResults(
      allExpansionClusters,
      clusterScores, // existing scores — promoted clusters get fallback grades
      linkerInputs,
      ordersById,
    );

    // Apply expansion results only to rows that aren't already identity-scored
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
        }
      }
    }

    // Apply promoted cluster results
    for (const [orderId, result] of Array.from(expansionResults.entries())) {
      if (!identityResultsByOrder.has(orderId)) {
        identityResultsByOrder.set(orderId, result);
      }
    }
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
    rowToFraudTransaction(validPairs[i].parsed, s, identityResultsByOrder.get(s.order.orderId), jobId)
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
        upsertBatchNoProgress(batch, jobId, serviceClient)
          .then(async () => {
            processedCount += batch.length;
            pendingProgressRows += batch.length;
            rowsSinceLastFlush += batch.length;
            completed++;
            jobLog(`transactions upsert progress: batches ${completed}/${totalBatches}, processed ${processedCount}/${allInserts.length}`);
            if (rowsSinceLastFlush >= PROGRESS_INTERVAL) {
              rowsSinceLastFlush = 0;
              await flushProgress();
            }
          })
          .catch(async (err: Error) => {
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
  };

  // Run core upserts first, then in parallel: entity resolution + intelligence writes.
  // Entity resolution needs audit_transactions to exist (for txIdMap) so it starts
  // after upsertAllBatches, but runs concurrently with the fraud/co-occ/cluster writers.
  jobLog('Starting parallel pipeline: transactions + intelligence writes');
  await upsertAllBatches();

  const entityResolutionTask = merchantId
    ? (async () => {
        try {
          // Scope the lookup to THIS chunk's order_ids — otherwise chunk N scans
          // rows from chunks 0..N-1, ballooning the payload as upload progresses.
          const chunkOrderIds = scored.map((s) => s.order.orderId);
          const txIdMap = new Map<string, string>();
          // Parallel TX lookup — all chunks fire concurrently instead of sequentially.
          // Simple indexed reads (job_id + order_id) with no write-conflict risk.
          const TX_LOOKUP_CHUNK = 500;
          const txChunks: string[][] = [];
          for (let i = 0; i < chunkOrderIds.length; i += TX_LOOKUP_CHUNK) {
            txChunks.push(chunkOrderIds.slice(i, i + TX_LOOKUP_CHUNK));
          }
          const txResults = await Promise.all(
            txChunks.map((slice) =>
              serviceClient
                .from('audit_transactions')
                .select('id, order_id')
                .eq('job_id', jobId)
                .in('order_id', slice)
            )
          );
          for (const { data: txRows } of txResults) {
            if (txRows) {
              for (const row of txRows) txIdMap.set(row.order_id, row.id);
            }
          }

          const profileResult = await processProfilesForBatch(
        scored,
        merchantId,
        jobId,
        txIdMap,
        serviceClient,
        new Map(
          Array.from(identityResultsByOrder.entries()).map(([orderId, identity]) => [
            orderId,
            {
              grade: identity.grade,
              signals: identity.signalsMatched,
              clusterId: identity.clusterId,
              matchStatus: identity.matchStatus,
            },
          ])
        )
      );

          console.log(
            `[worker] Entity resolution: ${profileResult.profilesCreated} created, ${profileResult.profilesUpdated} updated, ${profileResult.errors.length} errors`
          );
          // Auto-refresh last_seen_risk on watchlist entries for customers in batch
          try {
            const riskOrder = { low: 0, medium: 1, high: 2, critical: 3 } as const;
            type RiskTier = 'low' | 'medium' | 'high' | 'critical';
            const emailRiskMap = new Map<string, RiskTier>();
            for (const s of scored) {
              const hash = (s as any).emailHash as string | undefined;
              if (!hash) continue;
              const prev = emailRiskMap.get(hash);
              if (!prev || riskOrder[s.riskTier] > riskOrder[prev]) {
                emailRiskMap.set(hash, s.riskTier);
              }
            }
            if (emailRiskMap.size > 0) {
              const { data: watchlistRows } = await serviceClient
                .from('watchlist_entries' as any)
                .select('id, email_hash')
                .eq('merchant_id', merchantId)
                .in('email_hash', Array.from(emailRiskMap.keys()));
              if (watchlistRows && watchlistRows.length > 0) {
                const now = new Date().toISOString();
                const watchlistUpdates = (watchlistRows as unknown as { id: string; email_hash: string }[]).map(
                  (row) => ({
                    id: row.id,
                    last_seen_risk: emailRiskMap.get(row.email_hash),
                    last_seen_at: now,
                  })
                );
                await serviceClient
                  .from('watchlist_entries' as any)
                  .upsert(watchlistUpdates, { onConflict: 'id', ignoreDuplicates: false });
                console.log(`[worker] Refreshed last_seen_risk for ${watchlistRows.length} watchlist entries (bulk)`);
              }
            }
          } catch (watchlistErr) {
            console.error('[worker] Watchlist refresh failed (non-fatal):', watchlistErr);
          }
        } catch (err) {
          console.error('[worker] processProfilesForBatch failed:', err);
        }
      })()
    : Promise.resolve();

  const parallelResults = await Promise.allSettled([
    entityResolutionTask,
    writeFraudEntities(scored, serviceClient, context).catch((err) =>
      console.error('[worker] writeFraudEntities failed:', err)
    ),
    writeCoOccurrences(scored, serviceClient, context).catch((err) =>
      console.error('[worker] writeCoOccurrences failed:', err)
    ),
    writeIdentityClusters(identityClusterMap, serviceClient).catch((err) =>
      console.error('[worker] writeIdentityClusters failed:', err)
    ),
  ]);
  jobLog('Parallel pipeline complete');
  for (const r of parallelResults) {
    if (r.status === 'rejected') jobLog(`parallel task failed: ${String((r as PromiseRejectedResult).reason)}`);
  }

  // Flush any remaining rows that didn't hit the PROGRESS_INTERVAL threshold.
  jobLog(`About to flush final progress: processed=${processedCount} failed=${failedCount}`);
  await flushProgress();
  jobLog('Job progress flushed');

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

    bump('email', email, {
      ...baseContribution,
      refund_timestamps: refundTs,
      fastest_claim_days: isRefund ? daysToClaim : null,
    });
    bump('ip', ip, baseContribution);
    bump('address', address, baseContribution);
    bump('card_last4', card, baseContribution);
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
  let rpcError: { code: string; message: string } | null = null;
  let rpcSucceeded = false;
  for (let i = 0; i < payload.length; i += RPC_CHUNK) {
    const chunk = payload.slice(i, i + RPC_CHUNK);
    try {
      await withRetry(async () => {
        const { error } = await serviceClient.rpc('bulk_upsert_fraud_entities' as any, { p_entities: chunk });
        if (error) throw error;
      });
    } catch (err: any) {
      rpcError = err;
      break;
    }
  }
  if (!rpcError) {
    console.log(`[worker] ${new Date().toISOString()} bulk_upsert_fraud_entities: ${payload.length} entities (RPC)`);
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

  // Chunk into 500 per upsert to stay within PostgREST limits
  const CHUNK = 500;
  for (let i = 0; i < directRows.length; i += CHUNK) {
    const chunk = directRows.slice(i, i + CHUNK);
    const { error: upsertError } = await (serviceClient as any)
      .from('fraud_entities')
      .upsert(chunk as any, { onConflict: 'entity_type,entity_value', ignoreDuplicates: false });
    if (upsertError) {
      if (isUpstreamDown(upsertError)) {
        console.warn(`[worker] ${new Date().toISOString()} fraud_entities direct upsert: upstream down at chunk ${i}, aborting fallback`);
        return;
      }
      console.error(`[worker] ${new Date().toISOString()} fraud_entities direct upsert failed (chunk ${i}): ${upsertError.message}`);
    }
  }
  console.log(`[worker] ${new Date().toISOString()} writeFraudEntities: ${directRows.length} entities (direct upsert fallback)`);
}

async function writeCoOccurrences(
  scored: ScoredOrder[],
  serviceClient: SupabaseClient<Database>,
  context?: import('../engine/fastContext').FastScoringContext
): Promise<void> {
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

  if (pairCounts.size === 0) return;

  const payload = Array.from(pairCounts.values()).map((p) => ({
    a_type:      p.entity_a_type,
    a_value:     p.entity_a_value,
    b_type:      p.entity_b_type,
    b_value:     p.entity_b_value,
    count_delta: p.count,
  }));

  // --- Fast path: chunked bulk_upsert_co_occurrences RPC calls with backoff ---
  const RPC_CHUNK = 2000;
  let coRpcError: { code: string; message: string } | null = null;
  let coRpcSucceeded = false;
  for (let i = 0; i < payload.length; i += RPC_CHUNK) {
    const chunk = payload.slice(i, i + RPC_CHUNK);
    try {
      await withRetry(async () => {
        const { error } = await serviceClient.rpc('bulk_upsert_co_occurrences' as any, { p_pairs: chunk });
        if (error) throw error;
      });
    } catch (err: any) {
      coRpcError = err;
      break;
    }
  }
  if (!coRpcError) {
    console.log(`[worker] ${new Date().toISOString()} bulk_upsert_co_occurrences: ${payload.length} pairs (RPC)`);
    coRpcSucceeded = true;
  }

  if (coRpcSucceeded) return;

  // Upstream down (Supabase 521 / schema cache). Skip the fallback loop — it
  // would do 100+ sequential failing 500-row upserts against a broken endpoint.
  // co_occurrences is best-effort intelligence.
  if (isUpstreamDown(coRpcError)) {
    console.warn(`[worker] ${new Date().toISOString()} writeCoOccurrences skipped: upstream unavailable (${(coRpcError as any)?.message ?? 'unknown'})`);
    return;
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

  const CHUNK = 500;
  for (let i = 0; i < directRows.length; i += CHUNK) {
    const chunk = directRows.slice(i, i + CHUNK);
    const { error: upsertError } = await (serviceClient as any)
      .from('fraud_entity_co_occurrences')
      .upsert(chunk as any, {
        onConflict: 'entity_a_type,entity_a_value,entity_b_type,entity_b_value',
        ignoreDuplicates: false,
      });
    if (upsertError) {
      if (isUpstreamDown(upsertError)) {
        console.warn(`[worker] ${new Date().toISOString()} co_occurrences direct upsert: upstream down at chunk ${i}, aborting fallback`);
        return;
      }
      console.error(`[worker] ${new Date().toISOString()} co_occurrences direct upsert failed (chunk ${i}): ${upsertError.message}`);
    }
  }
  console.log(`[worker] ${new Date().toISOString()} writeCoOccurrences: ${directRows.length} pairs (direct upsert fallback)`);
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
    let entityValue = cluster.entityValue;
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
  serviceClient: SupabaseClient<Database>
): Promise<void> {
  const isRetryableCoreUpsertError = (message: string): boolean => {
    const msg = message.toLowerCase();
    return (
      msg.includes('fetch failed') ||
      msg.includes('econnreset') ||
      msg.includes('etimedout') ||
      msg.includes('connection terminated') ||
      msg.includes('connection reset') ||
      msg.includes('429') ||
      msg.includes('too many requests') ||
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
      .from('audit_transactions')
      .upsert(inserts as any, { onConflict: 'job_id,order_id' });

    if (!error) return;

    lastMessage = error.message ?? 'unknown error';
    const retryable = isRetryableCoreUpsertError(lastMessage);
    if (!retryable || attempt === MAX_ATTEMPTS) {
      const suffix = retryable ? ` after ${attempt} attempts` : '';
      await logBatchError(
        serviceClient,
        jobId,
        inserts.map((r) => r.order_id),
        `Supabase upsert failed${suffix}: ${lastMessage}`
      );
      throw new Error(`Supabase upsert failed${suffix}: ${lastMessage}`);
    }

    // Core write hardening: brief exponential backoff for transient network/API
    // failures so one blip doesn't zero-out an entire upload.
    const jitter = Math.random() * 150;
    const delayMs = 250 * 2 ** (attempt - 1) + jitter;
    await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
  }
}
