import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../supabase/types';
import { cleanRow } from '../csv/clean';
import { csvRowSchema } from '../csv/schema';
import type { NormalisedOrder } from '../engine/types';
import { normaliseRows } from '../csv/normalise';
import {
  addressTokenOverlap,
  deterministicClusterId,
  linkIdentities,
  normaliseAddressFull,
  normaliseCard,
  normaliseEmail,
  normaliseName,
  normalisePhone,
  normalisePostcode,
  type LinkedCluster,
  type LinkerOrderInput,
  type LinkerSignal,
} from '../linker';
import { expandSuspiciousClusters } from './clusterExpansion';
import { getRowMatchedSignals } from './signals';
import { scoreClusterIdentity, type IdentityMatchResult } from '../identity/matchScorer';
import { downloadChunkRows } from './chunkedDispatch';
import { withReadRetry } from '../engine/dbSemaphore';

type ServiceClient = SupabaseClient<Database>;

type ExistingAuditRow = {
  id: string;
  job_id: string;
  order_id: string;
  identity_confidence_grade: string | null;
  match_status: string | null;
  cluster_id: string | null;
  candidate_cluster_id: string | null;
  identity_match_grade: string | null;
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
    _rawCardFingerprint?: string | null;
    _rawDeviceId?: string | null;
    _rawAccountId?: string | null;
  };
}

function buildLinkerInput(orders: NormalisedOrder[]): LinkerOrderInput[] {
  return orders.map((order) => {
    const ids = rawIds(order);
    return {
      order_id: order.orderId,
      email: ids._rawEmail || null,
      phone: ids._rawPhone || null,
      address: ids._rawAddress || null,
      shipping_address: ids._rawAddress || null,
      postcode: ids._rawPostcode || null,
      ip: ids._rawIP || null,
      card_last4: ids._rawCardLast4 || null,
      card_bin: ids._rawCardBin || null,
      card_fingerprint: ids._rawCardFingerprint || null,
      device_fingerprint: ids._rawDeviceId || null,
      account_id: ids._rawAccountId || null,
      name: (order as NormalisedOrder & { customerNameNorm?: string | null }).customerNameNorm ?? null,
    };
  });
}

function toLegacyGrade(
  grade: IdentityMatchResult['identity_match_grade']
): 'possible' | 'probable' | 'definite' | null {
  if (grade === 'confirmed') return 'definite';
  if (grade === 'probable') return 'probable';
  if (grade === 'candidate') return 'possible';
  return null;
}

function toMatchStatus(
  grade: IdentityMatchResult['identity_match_grade']
): 'none' | 'candidate' | 'probable' | 'definite' {
  if (grade === 'confirmed') return 'definite';
  if (grade === 'probable') return 'probable';
  if (grade === 'candidate') return 'candidate';
  return 'none';
}

type ConsolidationCluster = LinkedCluster & { order_ids: string[] };

type ClusterIdentitySummary = {
  phones: Set<string>;
  devices: Set<string>;
  accounts: Set<string>;
  emails: Set<string>;
  cardFingerprints: Set<string>;
  cardPartials: Set<string>;
  postcodes: Set<string>;
  addresses: Set<string>;
  names: Set<string>;
};

function emptyClusterSummary(): ClusterIdentitySummary {
  return {
    phones: new Set(),
    devices: new Set(),
    accounts: new Set(),
    emails: new Set(),
    cardFingerprints: new Set(),
    cardPartials: new Set(),
    postcodes: new Set(),
    addresses: new Set(),
    names: new Set(),
  };
}

function addIfValue(target: Set<string>, value: string | null | undefined): void {
  if (value) target.add(value);
}

function cardSummaryKey(row: LinkerOrderInput): { fingerprint: string | null; partial: string | null } {
  const key = normaliseCard(row.card_last4 ?? null, row.card_bin ?? null, row.card_fingerprint ?? null);
  if (!key) return { fingerprint: null, partial: null };
  return key.startsWith('fp:') ? { fingerprint: key, partial: null } : { fingerprint: null, partial: key };
}

function clusterSummary(rows: LinkerOrderInput[]): ClusterIdentitySummary {
  const summary = emptyClusterSummary();
  for (const row of rows) {
    addIfValue(summary.phones, normalisePhone(row.phone));
    addIfValue(summary.devices, row.device_fingerprint?.trim() || null);
    addIfValue(summary.accounts, row.account_id?.trim() || null);
    addIfValue(summary.emails, normaliseEmail(row.email));
    const card = cardSummaryKey(row);
    addIfValue(summary.cardFingerprints, card.fingerprint);
    addIfValue(summary.cardPartials, card.partial);
    addIfValue(summary.postcodes, row.postcode ? normalisePostcode(row.postcode) : null);
    addIfValue(summary.addresses, normaliseAddressFull(row.shipping_address ?? row.address ?? null));
    addIfValue(summary.names, normaliseName(row.name));
  }
  return summary;
}

function intersects(a: Set<string>, b: Set<string>): boolean {
  for (const value of a) if (b.has(value)) return true;
  return false;
}

function hasAddressNearOverlap(a: Set<string>, b: Set<string>): boolean {
  for (const left of a) {
    for (const right of b) {
      if (left === right || addressTokenOverlap(left, right) >= 0.6) return true;
    }
  }
  return false;
}

function surnameAndInitial(name: string): { surname: string; initial: string } | null {
  const tokens = name.split(/\s+/).filter(Boolean);
  if (tokens.length < 2) return null;
  const surname = tokens[tokens.length - 1];
  const initial = tokens[0][0] ?? '';
  return surname && initial ? { surname, initial } : null;
}

function hasNameVariantOverlap(a: Set<string>, b: Set<string>): boolean {
  for (const left of a) {
    for (const right of b) {
      if (left === right) return true;
      const ll = surnameAndInitial(left);
      const rr = surnameAndInitial(right);
      if (ll && rr && ll.surname === rr.surname && ll.initial === rr.initial) return true;
    }
  }
  return false;
}

function shouldMergeClusterSummaries(a: ClusterIdentitySummary, b: ClusterIdentitySummary): boolean {
  // Exact hard anchors are strong enough to bridge chunk-local seed clusters.
  if (intersects(a.phones, b.phones)) return true;
  if (intersects(a.devices, b.devices)) return true;
  if (intersects(a.accounts, b.accounts)) return true;
  if (intersects(a.cardFingerprints, b.cardFingerprints)) return true;

  const sharesPostcode = intersects(a.postcodes, b.postcodes);
  const sharesNameVariant = hasNameVariantOverlap(a.names, b.names);
  const sharesAddress = hasAddressNearOverlap(a.addresses, b.addresses);

  // Medium anchors need corroboration so common addresses/emails do not merge
  // unrelated household or marketplace traffic.
  if (intersects(a.emails, b.emails) && (sharesPostcode || sharesNameVariant || sharesAddress)) return true;
  if (intersects(a.cardPartials, b.cardPartials) && sharesPostcode && (sharesNameVariant || sharesAddress)) return true;
  if (sharesPostcode && sharesAddress && sharesNameVariant) return true;

  return false;
}

export function consolidateClusterAssignments(
  clusters: ConsolidationCluster[],
  inputByOrderId: Map<string, LinkerOrderInput>,
): ConsolidationCluster[] {
  if (clusters.length < 2) return clusters;

  const parent = new Map<string, string>();
  const find = (id: string): string => {
    if (!parent.has(id)) parent.set(id, id);
    let current = parent.get(id)!;
    while (current !== parent.get(current)!) {
      const next = parent.get(current)!;
      parent.set(current, parent.get(next)!);
      current = parent.get(current)!;
    }
    return current;
  };
  const union = (a: string, b: string) => {
    const aa = find(a);
    const bb = find(b);
    if (aa === bb) return;
    if (aa < bb) parent.set(bb, aa);
    else parent.set(aa, bb);
  };

  const summaries = new Map<string, ClusterIdentitySummary>();
  for (const cluster of clusters) {
    parent.set(cluster.cluster_id, cluster.cluster_id);
    const rows = cluster.order_ids
      .map((orderId) => inputByOrderId.get(orderId))
      .filter((row): row is LinkerOrderInput => Boolean(row));
    summaries.set(cluster.cluster_id, clusterSummary(rows));
  }

  for (let i = 0; i < clusters.length; i++) {
    for (let j = i + 1; j < clusters.length; j++) {
      const left = summaries.get(clusters[i].cluster_id);
      const right = summaries.get(clusters[j].cluster_id);
      if (left && right && shouldMergeClusterSummaries(left, right)) {
        union(clusters[i].cluster_id, clusters[j].cluster_id);
      }
    }
  }

  const grouped = new Map<string, ConsolidationCluster[]>();
  for (const cluster of clusters) {
    const root = find(cluster.cluster_id);
    if (!grouped.has(root)) grouped.set(root, []);
    grouped.get(root)!.push(cluster);
  }

  return Array.from(grouped.values()).map((group) => {
    const orderIds = Array.from(new Set(group.flatMap((cluster) => cluster.order_ids))).sort();
    const signals = new Set<LinkerSignal>();
    const evidence = new Set<string>();
    let maxScore = 0;
    for (const cluster of group) {
      maxScore = Math.max(maxScore, cluster.confidence_score);
      for (const signal of cluster.signals_matched) signals.add(signal);
      for (const item of cluster.evidence_summary) evidence.add(item);
    }
    return {
      cluster_id: deterministicClusterId(orderIds),
      order_ids: orderIds,
      confidence_score: maxScore,
      signals_matched: Array.from(signals).sort(),
      evidence_summary: Array.from(evidence).sort(),
    };
  });
}

async function fetchExistingAuditRows(
  serviceClient: ServiceClient,
  jobId: string,
): Promise<ExistingAuditRow[]> {
  const rows: ExistingAuditRow[] = [];
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    const read = await withReadRetry(async () => {
      const { data, error } = await serviceClient
        .from('audit_transactions')
        .select('id, job_id, order_id, identity_confidence_grade, match_status, cluster_id, candidate_cluster_id, identity_match_grade')
        .eq('job_id', jobId)
        .range(from, from + pageSize - 1);
      if (error) throw error;
      return (data ?? []) as ExistingAuditRow[];
    }, 5, 750);

    if (read.failed || !read.value) {
      throw new Error(
        `fetchExistingAuditRows page ${from}-${from + pageSize - 1} failed after ${read.retries} retries: ${String((read.lastError as Error)?.message ?? read.lastError)}`
      );
    }
    const page = read.value;
    rows.push(...page);
    if (page.length < pageSize) break;
  }

  return rows;
}

async function downloadChunkRowsWithRetry(
  serviceClient: ServiceClient,
  jobId: string,
  index: number,
): Promise<Record<string, string | undefined>[]> {
  const read = await withReadRetry(
    () => downloadChunkRows(serviceClient, jobId, index),
    5,
    1000,
  );

  if (read.failed || !read.value) {
    throw new Error(
      `downloadChunkRows ${index} failed after ${read.retries} retries: ${String((read.lastError as Error)?.message ?? read.lastError)}`
    );
  }

  return read.value;
}

function isRetryableWriteError(err: unknown): boolean {
  if (!err) return false;
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    msg.includes('statement timeout') ||
    msg.includes('canceling statement') ||
    msg.includes('fetch failed') ||
    msg.includes('connection') ||
    msg.includes('timeout')
  );
}

async function upsertAuditTransactionsAdaptive(
  serviceClient: ServiceClient,
  rows: any[],
): Promise<void> {
  if (rows.length === 0) return;

  const flush = async (chunk: any[]): Promise<void> => {
    const { error } = await (serviceClient as any)
      .from('audit_transactions')
      .upsert(chunk, { onConflict: 'id', ignoreDuplicates: false });
    if (!error) return;

    if (chunk.length <= 50 || !isRetryableWriteError(error)) throw error;

    const mid = Math.floor(chunk.length / 2);
    await flush(chunk.slice(0, mid));
    await flush(chunk.slice(mid));
  };

  const initialBatchSize = 250;
  for (let i = 0; i < rows.length; i += initialBatchSize) {
    await flush(rows.slice(i, i + initialBatchSize));
  }
}

/**
 * Rebuild the pure identity graph across every uploaded chunk after the final
 * chunk has written its transaction rows. This fixes chunk-boundary splits
 * without adding merchant outcome fields to identity matching.
 */
export async function restitchAuditIdentityFromChunks(
  serviceClient: ServiceClient,
  jobId: string,
  totalChunks: number,
): Promise<{ updated: number; linkedRows: number }> {
  const validRows: any[] = [];
  for (let i = 0; i < totalChunks; i++) {
    const chunkRows = await downloadChunkRowsWithRetry(serviceClient, jobId, i);
    for (const row of chunkRows) {
      const parsed = csvRowSchema.safeParse(cleanRow(row));
      if (parsed.success) validRows.push(parsed.data);
    }
  }

  if (validRows.length === 0) return { updated: 0, linkedRows: 0 };

  const normalised = normaliseRows(validRows);
  const linkerInputs = buildLinkerInput(normalised);
  const inputByOrderId = new Map(linkerInputs.map((input) => [input.order_id, input]));

  const linkerResult = linkIdentities(linkerInputs);
  const nameMap = new Map<string, string>(validRows.map((row) => [row.order_id, row.customer_name ?? '']));
  const expansion = expandSuspiciousClusters(
    linkerResult.clusters,
    linkerResult.candidatePairs,
    linkerInputs,
    new Map(),
    nameMap,
  );

  // Build a single, canonical cluster assignment per order_id so no row can
  // be updated by multiple clusters in this restitch pass.
  const baseOrderToCluster = new Map<string, string>();
  for (const cluster of linkerResult.clusters) {
    for (const orderId of cluster.order_ids) {
      if (!baseOrderToCluster.has(orderId)) baseOrderToCluster.set(orderId, cluster.cluster_id);
    }
  }

  // Promoted clusters override base assignment for their members.
  for (const cluster of expansion.promotedClusters) {
    for (const orderId of cluster.order_ids) baseOrderToCluster.set(orderId, cluster.cluster_id);
  }

  // Explicit expansion assignments are strongest and should win.
  for (const [orderId, clusterId] of expansion.additionalClusterAssignments) {
    baseOrderToCluster.set(orderId, clusterId);
  }

  const clusterMembers = new Map<string, Set<string>>();
  for (const [orderId, clusterId] of baseOrderToCluster.entries()) {
    if (!clusterMembers.has(clusterId)) clusterMembers.set(clusterId, new Set());
    clusterMembers.get(clusterId)!.add(orderId);
  }

  const preConsolidationClusters: ConsolidationCluster[] = [];
  for (const cluster of [...linkerResult.clusters, ...expansion.promotedClusters]) {
    const ids = clusterMembers.get(cluster.cluster_id);
    if (!ids || ids.size < 2) continue;
    preConsolidationClusters.push({ ...cluster, order_ids: [...ids].sort() });
  }

  const consolidatedClusters = consolidateClusterAssignments(preConsolidationClusters, inputByOrderId);
  const clusterById = new Map<string, LinkedCluster>();
  for (const cluster of consolidatedClusters) {
    clusterById.set(cluster.cluster_id, cluster);
  }

  const existingRows = await fetchExistingAuditRows(serviceClient, jobId);
  const existingByOrderId = new Map(existingRows.map((row) => [row.order_id, row]));

  const updates: any[] = [];
  for (const cluster of clusterById.values()) {
    const clusterRows = cluster.order_ids
      .map((orderId) => inputByOrderId.get(orderId))
      .filter((row): row is LinkerOrderInput => Boolean(row));
    if (clusterRows.length < 2) continue;

    const scored = scoreClusterIdentity(clusterRows);
    for (const orderId of cluster.order_ids) {
      const existing = existingByOrderId.get(orderId);
      const thisInput = inputByOrderId.get(orderId);
      const identity = scored.byOrderId.get(orderId);
      if (!existing || !thisInput || !identity) continue;

      const grade = toLegacyGrade(identity.identity_match_grade);
      const matchStatus = toMatchStatus(identity.identity_match_grade);
      if (!grade || matchStatus === 'none') continue;

      const nextClusterId = matchStatus === 'definite' ? cluster.cluster_id : null;
      if (
        existing.identity_confidence_grade === grade &&
        existing.match_status === matchStatus &&
        existing.cluster_id === nextClusterId &&
        existing.candidate_cluster_id === cluster.cluster_id &&
        existing.identity_match_grade === identity.identity_match_grade
      ) {
        continue;
      }

      updates.push({
        id: existing.id,
        job_id: existing.job_id,
        order_id: existing.order_id,
        identity_confidence_grade: grade,
        identity_score: identity.identity_match_score,
        signals_matched: getRowMatchedSignals(thisInput, clusterRows),
        cluster_id: nextClusterId,
        match_status: matchStatus,
        candidate_cluster_id: cluster.cluster_id,
        confirmed_identity_id: matchStatus === 'definite' ? cluster.cluster_id : null,
        identity_match_score: identity.identity_match_score,
        identity_match_grade: identity.identity_match_grade,
        identity_evidence: identity.identity_evidence,
        matched_datapoints: identity.matched_datapoints,
        changed_datapoints: identity.changed_datapoints,
        evidence_summary: identity.evidence_summary,
      });
    }
  }

  await upsertAuditTransactionsAdaptive(serviceClient, updates);

  return { updated: updates.length, linkedRows: existingRows.length };
}
