/* ────────────────────────────────────────────────────────────────────────────
 * Hot path of the CSV scoring pipeline. The cross-merchant profile fetch and
 * column projections here were carefully tuned on 2026-05-03 to take the
 * 2k-row run from ~120s back down to <15s. Reverting to `select *` or to the
 * old `limit(10000)` cross-merchant fetch will reintroduce the perf cliff.
 *
 * 2026-05-06: Added a concurrency semaphore (MAX_CONCURRENT_FETCHES=20) to
 * cap the number of simultaneous Supabase requests. A 25k-row upload was
 * generating ~875 concurrent requests in a single Promise.all, saturating
 * the Postgres connection pool and causing upstream timeouts.
 * ──────────────────────────────────────────────────────────────────────── */

import type { NormalisedOrder } from './types';
import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '../supabase/tables';
import { withReadRetry } from './dbSemaphore';
import { env } from '../utils/env';
import { hashIdentifier } from '../identity/hash';
import {
  normaliseEmail,
  normaliseIP,
  normaliseAddress,
  normaliseCard,
  normalisePhone,
} from '../identity/normalise';
import {
  canonicalizeEdgePair,
  type V1IdentifierType,
} from '../identity/identifierGraph';

// ── Concurrency limiter ────────────────────────────────────────────────────
// Cap simultaneous Supabase requests to avoid saturating the Postgres
// connection pool. A 25k-row upload produces ~875 chunks across all fetch
// functions; without a semaphore these all fire in one Promise.all causing
// upstream timeouts even when Supabase itself is healthy.
const MAX_CONCURRENT_FETCHES = 8;

function makeSemaphore(limit: number) {
  let active = 0;
  const queue: Array<() => void> = [];
  return async function <T>(fn: () => Promise<T>): Promise<T> {
    if (active >= limit) {
      await new Promise<void>((resolve) => queue.push(resolve));
    }
    active++;
    try {
      return await fn();
    } finally {
      active--;
      queue.shift()?.();
    }
  };
}

const fetchSemaphore = makeSemaphore(MAX_CONCURRENT_FETCHES);

export interface FraudEntity {
  id: string;
  entity_type: string;
  entity_value: string;
  first_seen: string;
  last_seen: string;
  total_orders: number;
  total_refund_claims: number;
  total_chargebacks: number;
  total_merchants: number;
  match_score_avg: number;
  flagged_count: number;
  refund_timestamps?: string[];
  refund_intervals_avg_days?: number;
  refund_acceleration_score?: number;
  fastest_claim_days?: number;
}

/** A customer_profiles row subset used by the cross-merchant signal. */
export interface CrossMerchantProfile {
  id: string;
  emails: string[];
  ips: string[];
  addresses: string[];
  card_last4s: string[];
  phones: string[];
  email_hashes?: string[];
  ip_hashes?: string[];
  address_hashes?: string[];
  card_hashes?: string[];
  total_orders: number;
  total_refund_claims: number;
  total_merchants_seen_at: number;
  merchant_ids: string[];
}

/** Collected during scoreBatch and flushed to access_audit_log after scoring. */
export interface PendingAuditLog {
  requesting_merchant_id: string;
  queried_hashes: string[];
  k_anon_satisfied: boolean;
  matched_merchant_count: number;
}

export interface CoOccurrence {
  id: string;
  entity_a_type: string;
  entity_a_value: string;
  entity_b_type: string;
  entity_b_value: string;
  co_occurrence_count: number;
  first_seen: string;
  last_seen: string;
}

/** Row shape from identifier_co_occurrence_edges (Step 5 dual-read). */
export type IdentifierCoOccurrenceEdgeRow = {
  id: string;
  left_identifier_type: string;
  left_identifier_hash: string;
  right_identifier_type: string;
  right_identifier_hash: string;
  seen_count: number;
  first_seen_at: string;
  last_seen_at: string;
};

const LEGACY_TO_V1_ENTITY_TYPE: Partial<Record<string, V1IdentifierType>> = {
  email: 'normalized_email_hash',
  address: 'full_normalized_shipping_address_hash',
};

const V1_TO_LEGACY_ENTITY_TYPE: Partial<Record<V1IdentifierType, string>> = {
  normalized_email_hash: 'email',
  full_normalized_shipping_address_hash: 'address',
  full_normalized_billing_address_hash: 'address',
  phone_e164_hash: 'phone',
};

/** Canonical dedup key for v1-mappable legacy co-occurrence rows. null = legacy-only (ip/card). */
export function legacyCoOccurrenceDedupKey(row: CoOccurrence): string | null {
  const leftV1 = LEGACY_TO_V1_ENTITY_TYPE[row.entity_a_type];
  const rightV1 = LEGACY_TO_V1_ENTITY_TYPE[row.entity_b_type];
  if (!leftV1 || !rightV1) return null;
  return identifierEdgeDedupKey(
    leftV1,
    hashIdentifier(row.entity_a_value),
    rightV1,
    hashIdentifier(row.entity_b_value)
  );
}

/** Canonical dedup key for identifier_co_occurrence_edges rows. */
export function identifierEdgeDedupKey(
  leftType: string,
  leftHash: string,
  rightType: string,
  rightHash: string
): string {
  const { left, right } = canonicalizeEdgePair(
    { type: leftType as V1IdentifierType, hash: leftHash },
    { type: rightType as V1IdentifierType, hash: rightHash }
  );
  return `${left.type}:${left.hash}|${right.type}:${right.hash}`;
}

/** Reverse map batch hashes to legacy plaintext values for source-agnostic CoOccurrence output. */
export function buildHashToLegacyLookup(orders: NormalisedOrder[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const order of orders) {
    const raw = order as NormalisedOrder & {
      _rawEmail?: string;
      _rawAddress?: string;
      _rawBillingAddress?: string;
      _rawPhone?: string;
    };
    if (order.emailHash && raw._rawEmail) {
      const norm = normaliseEmail(raw._rawEmail);
      if (norm) map.set(`normalized_email_hash:${order.emailHash}`, norm);
    }
    if (order.addressHash && raw._rawAddress) {
      const norm = normaliseAddress(raw._rawAddress);
      if (norm) map.set(`full_normalized_shipping_address_hash:${order.addressHash}`, norm);
    }
    if (order.billingAddressHash && raw._rawBillingAddress) {
      const norm = normaliseAddress(raw._rawBillingAddress);
      if (norm) map.set(`full_normalized_billing_address_hash:${order.billingAddressHash}`, norm);
    }
    if (order.phoneHash && raw._rawPhone) {
      const norm = normalisePhone(raw._rawPhone);
      if (norm) map.set(`phone_e164_hash:${order.phoneHash}`, norm);
    }
  }
  return map;
}

function legacyEntityValueFromV1(
  v1Type: string,
  hash: string,
  hashToLegacy: Map<string, string>
): string {
  return hashToLegacy.get(`${v1Type}:${hash}`) ?? hash;
}

/** Map a new-table edge row to legacy CoOccurrence shape (source-agnostic output). */
export function identifierEdgeToCoOccurrence(
  row: IdentifierCoOccurrenceEdgeRow,
  hashToLegacy: Map<string, string>
): CoOccurrence {
  const entityAType =
    V1_TO_LEGACY_ENTITY_TYPE[row.left_identifier_type as V1IdentifierType] ??
    row.left_identifier_type;
  const entityBType =
    V1_TO_LEGACY_ENTITY_TYPE[row.right_identifier_type as V1IdentifierType] ??
    row.right_identifier_type;
  return {
    id: row.id,
    entity_a_type: entityAType,
    entity_a_value: legacyEntityValueFromV1(
      row.left_identifier_type,
      row.left_identifier_hash,
      hashToLegacy
    ),
    entity_b_type: entityBType,
    entity_b_value: legacyEntityValueFromV1(
      row.right_identifier_type,
      row.right_identifier_hash,
      hashToLegacy
    ),
    co_occurrence_count: row.seen_count,
    first_seen: row.first_seen_at,
    last_seen: row.last_seen_at,
  };
}

/**
 * Merge legacy + new co-occurrence sources (parallel dual-read, pre-backfill).
 * New-table rows are authoritative when both sources share a v1 dedup key.
 * ip/card legacy pairs pass through without dedup (no v1 mapping).
 */
export function mergeCoOccurrenceSources(
  legacyRows: CoOccurrence[],
  newRows: IdentifierCoOccurrenceEdgeRow[],
  hashToLegacy: Map<string, string>
): CoOccurrence[] {
  const byKey = new Map<string, CoOccurrence>();
  for (const row of newRows) {
    const key = identifierEdgeDedupKey(
      row.left_identifier_type,
      row.left_identifier_hash,
      row.right_identifier_type,
      row.right_identifier_hash
    );
    byKey.set(key, identifierEdgeToCoOccurrence(row, hashToLegacy));
  }

  const merged: CoOccurrence[] = Array.from(byKey.values());
  const legacyOnlyIds = new Set<string>();

  for (const legacy of legacyRows) {
    const key = legacyCoOccurrenceDedupKey(legacy);
    if (key === null) {
      if (!legacyOnlyIds.has(legacy.id)) {
        legacyOnlyIds.add(legacy.id);
        merged.push(legacy);
      }
      continue;
    }
    if (!byKey.has(key)) {
      byKey.set(key, legacy);
      merged.push(legacy);
    }
  }

  return merged;
}

function extractLegacyPlaintextValues(orders: NormalisedOrder[]): {
  emails: string[];
  ips: string[];
  addresses: string[];
  cards: string[];
} {
  const emails = new Set<string>();
  const ips = new Set<string>();
  const addresses = new Set<string>();
  const cards = new Set<string>();

  for (const order of orders) {
    const raw = order as NormalisedOrder & {
      _rawEmail?: string;
      _rawIP?: string | null;
      _rawAddress?: string | null;
      _rawCardLast4?: string | null;
    };
    const email = raw._rawEmail ? normaliseEmail(raw._rawEmail) : null;
    if (email) emails.add(email);
    const ip = raw._rawIP ? normaliseIP(raw._rawIP) : null;
    if (ip) ips.add(ip);
    const address = raw._rawAddress ? normaliseAddress(raw._rawAddress) : null;
    if (address) addresses.add(address);
    const card = raw._rawCardLast4 ? normaliseCard(raw._rawCardLast4) : null;
    if (card) cards.add(card);
  }

  return {
    emails: Array.from(emails),
    ips: Array.from(ips),
    addresses: Array.from(addresses),
    cards: Array.from(cards),
  };
}

function indexCoOccurrencesByEntity(rows: CoOccurrence[]): Map<string, CoOccurrence[]> {
  const map = new Map<string, CoOccurrence[]>();
  const seenIds = new Set<string>();
  for (const co of rows) {
    if (seenIds.has(co.id)) continue;
    seenIds.add(co.id);
    const keyA = `${co.entity_a_type}:${co.entity_a_value}`;
    const keyB = `${co.entity_b_type}:${co.entity_b_value}`;
    if (!map.has(keyA)) map.set(keyA, []);
    if (!map.has(keyB)) map.set(keyB, []);
    map.get(keyA)!.push(co);
    map.get(keyB)!.push(co);
  }
  return map;
}

export interface FastScoringContext {
  allOrders: NormalisedOrder[];
  customerOrderHistory: Map<string, NormalisedOrder[]>;
  populationRefundStats: { mean: number; stddev: number };
  addressEmailMap: Map<string, Set<string>>;
  emailRawEmailsMap: Map<string, string[]>;
  customerMaxVelocity: Map<string, number>;
  customerValueStats: Map<string, { mean: number; stddev: number }>;
  customerPaymentMethods: Map<string, Set<string>>;
  // Historical intelligence from Supabase
  historicalEmailMap: Map<string, FraudEntity>;
  historicalIPMap: Map<string, FraudEntity>;
  historicalAddressMap: Map<string, FraudEntity>;
  historicalCardMap: Map<string, FraudEntity>;
  historicalCoOccurrenceMap: Map<string, CoOccurrence[]>;
  // Adaptive weight adjustments learned from merchant feedback (Phase 6).
  // Keyed by signal name, value is in [-1, 1]; applied multiplicatively as
  // (1 + adj) and clamped to [0, 2] in scoreBatch.
  signalWeightAdjustments: Record<string, number>;
  // §1.2 — Cross-merchant signal data fetched from customer_profiles.
  // Populated only when merchantId is supplied to buildFastContext.
  requestingMerchantId?: string;
  crossMerchantProfiles?: CrossMerchantProfile[];
  // Audit log rows accumulated during scoreBatch; flushed by worker after scoring.
  pendingAuditLogs: PendingAuditLog[];
  // Network-health counters. Surfaced in the run's data_quality_report so the
  // user can tell when a job ran with partial history (silent fetch failures
  // historically masked this — see ASOS 50k forensic audit, F2/F3/F4).
  readHealth: {
    fastContextReadRetries: number;
    fastContextReadFailures: number;
  };
}

/**
 * Fetch customer_profiles whose identifier arrays overlap with the batch's
 * identifiers, deduped by id. Used by buildFastContext for cross-merchant
 * scoring. Replaces the old `limit(10000)` global pull.
 *
 * customer_profiles.{emails,ips,addresses,card_last4s} are stored as JSONB,
 * NOT as native arrays — so the PG `&&` operator (Supabase `.overlaps()`)
 * does not apply. We use chunked OR-of-contains (`@>`) queries instead.
 * Each query asks "does this row's jsonb array contain ANY of these N
 * values?" which PostgREST expresses as `or=(col.cs.[v1],col.cs.[v2],…)`.
 */
async function fetchCrossMerchantProfiles(
  supabase: SupabaseClient,
  emails: string[],
  ips: string[],
  addresses: string[],
  cards: string[]
): Promise<CrossMerchantProfile[]> {
  if (env.SKIP_CROSS_MERCHANT_CONTEXT === '1') {
    return [];
  }

  const rpc = await supabase.rpc('search_cross_merchant_profiles' as any, {
    p_emails: [],
    p_ips: [],
    p_addresses: [],
    p_cards: [],
    p_email_hashes: emails,
    p_ip_hashes: ips,
    p_address_hashes: addresses,
    p_card_hashes: cards,
    p_min_merchants: 3,
    p_limit: 10000,
  });

  if (!rpc.error && Array.isArray(rpc.data)) {
    return rpc.data as unknown as CrossMerchantProfile[];
  }

  if (rpc.error) {
    console.warn(`[fastContext] RPC search_cross_merchant_profiles failed, falling back: ${rpc.error.message}`);
  }

  const COLS =
    'id,emails,ips,addresses,card_last4s,phones,total_orders,total_refund_claims,total_merchants_seen_at,merchant_ids';
  const CHUNK = 100; // # of OR clauses per query — keeps URL well under limits

  const fetchOne = async (col: string, values: string[]) => {
    if (values.length === 0) return [] as CrossMerchantProfile[];
    const chunks: string[][] = [];
    for (let i = 0; i < values.length; i += CHUNK) chunks.push(values.slice(i, i + CHUNK));
    const out = await Promise.all(
      chunks.map((chunk) =>
        fetchSemaphore(async () => {
          const orExpr = chunk.map((v) => `${col}.cs.${JSON.stringify([v])}`).join(',');
          const { data, error } = await supabase
            .from(TABLES.CUSTOMER_PROFILES)
            .select(COLS)
            .gte('total_merchants_seen_at', 3)
            .or(orExpr);
          if (error) {
            console.error(`[fastContext] cross-merchant or(${col}) failed: ${error.message}`);
            return [] as CrossMerchantProfile[];
          }
          return (data as unknown as CrossMerchantProfile[]) ?? [];
        })
      )
    );
    return out.flat();
  };

  const [byEmail, byIp, byAddr, byCard] = await Promise.all([
    fetchOne('emails',      emails),
    fetchOne('ips',         ips),
    fetchOne('addresses',   addresses),
    fetchOne('card_last4s', cards),
  ]);

  // Dedupe by id — a profile may match on multiple identifier types.
  const byId = new Map<string, CrossMerchantProfile>();
  for (const p of [...byEmail, ...byIp, ...byAddr, ...byCard]) {
    if (!byId.has(p.id)) byId.set(p.id, p);
  }
  return Array.from(byId.values());
}

function computePopulationRefundStats(orders: NormalisedOrder[]): { mean: number; stddev: number } {
  const byCustomer = new Map<string, NormalisedOrder[]>();
  for (const o of orders) {
    const arr = byCustomer.get(o.emailHash) ?? [];
    arr.push(o);
    byCustomer.set(o.emailHash, arr);
  }

  const rates: number[] = [];
  for (const customerOrders of Array.from(byCustomer.values())) {
    if (customerOrders.length < 3) continue;
    const refunded = customerOrders.filter(
      (o: NormalisedOrder) => o.refundStatus === 'full' || o.refundStatus === 'partial' || o.orderStatus === 'refunded'
    ).length;
    rates.push(refunded / customerOrders.length);
  }

  if (rates.length === 0) return { mean: 0.1, stddev: 0.1 };

  const mean = rates.reduce((a, b) => a + b, 0) / rates.length;
  const variance = rates.reduce((a, r) => a + Math.pow(r - mean, 2), 0) / rates.length;
  return { mean, stddev: Math.sqrt(variance) || 0.01 };
}

function computeCustomerMaxVelocity(customerOrders: NormalisedOrder[]): number {
  const WINDOW_MS = 24 * 60 * 60 * 1000;
  if (customerOrders.length < 3) return 0;

  const sorted = customerOrders.toSorted((a, b) => a.orderDate.getTime() - b.orderDate.getTime());

  let maxWindow = 0;
  let i = 0;
  let j = 0;
  while (i < sorted.length) {
    while (j < sorted.length && sorted[j].orderDate.getTime() - sorted[i].orderDate.getTime() <= WINDOW_MS) {
      j++;
    }
    maxWindow = Math.max(maxWindow, j - i);
    i++;
  }

  return maxWindow;
}

function computeCustomerValueStats(customerOrders: NormalisedOrder[]): { mean: number; stddev: number } {
  const values = customerOrders.map((o) => o.orderTotal);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, v) => a + Math.pow(v - mean, 2), 0) / values.length;
  const stddev = Math.sqrt(variance) || 1;
  return { mean, stddev };
}

export async function buildFastContext(
  orders: NormalisedOrder[],
  supabase: SupabaseClient,
  merchantId?: string
): Promise<FastScoringContext> {
  // Counters shared by every fetch closure below. fetchEntityBatch /
  // fetchCoBatch bump these on retry + permanent failure; worker.ts pipes them
  // into processing_jobs.data_quality_report.
  const readHealth = {
    fastContextReadRetries: 0,
    fastContextReadFailures: 0,
  };

  const customerOrderHistory = new Map<string, NormalisedOrder[]>();
  const addressEmailMap = new Map<string, Set<string>>();
  const emailRawEmailsMapBuild = new Map<string, Set<string>>();
  const customerMaxVelocity = new Map<string, number>();
  const customerValueStats = new Map<string, { mean: number; stddev: number }>();
  const customerPaymentMethods = new Map<string, Set<string>>();

  for (const order of orders) {
    // customerOrderHistory
    const arr = customerOrderHistory.get(order.emailHash) ?? [];
    arr.push(order);
    customerOrderHistory.set(order.emailHash, arr);

    // addressEmailMap
    if (order.addressHash) {
      const set = addressEmailMap.get(order.addressHash) ?? new Set<string>();
      set.add(order.emailHash);
      addressEmailMap.set(order.addressHash, set);
    }

    // emailRawEmailsMap
    const rawEmail = (order as NormalisedOrder & { _rawEmail?: string })._rawEmail;
    if (rawEmail) {
      const set = emailRawEmailsMapBuild.get(order.emailHash) ?? new Set<string>();
      set.add(rawEmail);
      emailRawEmailsMapBuild.set(order.emailHash, set);
    }
  }

  const emailRawEmailsMap = new Map<string, string[]>();
  for (const [emailHash, rawSet] of emailRawEmailsMapBuild) {
    emailRawEmailsMap.set(emailHash, [...rawSet]);
  }

  for (const [emailHash, customerOrders] of Array.from(customerOrderHistory.entries())) {
    customerMaxVelocity.set(emailHash, computeCustomerMaxVelocity(customerOrders));
    customerValueStats.set(emailHash, computeCustomerValueStats(customerOrders));

    const methods = new Set<string>();
    for (const o of customerOrders) {
      if (o.paymentMethod) methods.add(o.paymentMethod.toLowerCase());
    }
    customerPaymentMethods.set(emailHash, methods);
  }

  const populationRefundStats = computePopulationRefundStats(orders);

  // -----------------------------------------------------------------------
  // Historical enrichment from Supabase (bulk queries)
  //
  // Every value below MUST go through the canonical normaliser; the
  // write-side in worker.ts uses the same functions so the read/write
  // contract is symmetric.
  // -----------------------------------------------------------------------
  const allEmails = Array.from(new Set(orders.flatMap((o) => o.emailHash ? [o.emailHash] : [])));
  const allIPs = Array.from(new Set(orders.map((o) => o.ipHash).filter((v): v is string => Boolean(v))));
  const allAddresses = Array.from(new Set(
    orders.map((o) => o.addressHash).filter((v): v is string => Boolean(v))
  ));
  const allBillingAddresses = Array.from(new Set(
    orders.map((o) => o.billingAddressHash).filter((v): v is string => Boolean(v))
  ));
  const allPhoneHashes = Array.from(new Set(
    orders.map((o) => o.phoneHash).filter((v): v is string => Boolean(v))
  ));
  const allCards = Array.from(new Set(
    orders.map((o) => o.cardLast4).filter((v): v is string => Boolean(v))
  ));
  const legacyPlaintext = extractLegacyPlaintextValues(orders);
  const hashToLegacy = buildHashToLegacyLookup(orders);

  // -----------------------------------------------------------------------
  // Chunked IN() queries.
  //
  // PostgREST/Supabase passes .in() filters in the URL query string; for a
  // 5000-row upload this overflows the ~8KB URL limit and silently returns
  // zero rows. Chunking to 200 keeps each URL well under the limit.
  // -----------------------------------------------------------------------
  const IN_CHUNK = 500;

  // Chunks fire in parallel — no sequential for-loop, so 2000 unique emails at
  // IN_CHUNK=200 costs 1 wall-clock round-trip instead of 10 sequential ones.
  //
  // Column projection is critical: `select *` returned full rows including the
  // unbounded `refund_timestamps[]` array, which can hold thousands of ISO
  // strings per entity and dominated wire transfer time. We only project what
  // downstream scoring + writeFraudEntities actually consume.
  const FRAUD_ENTITY_COLS =
    'id,entity_type,entity_value,first_seen,last_seen,total_orders,' +
    'total_refund_claims,total_chargebacks,total_merchants,match_score_avg,' +
    'flagged_count,refund_timestamps,refund_intervals_avg_days,' +
    'refund_acceleration_score,fastest_claim_days';
  async function fetchEntityBatch(entityType: string, values: string[]): Promise<FraudEntity[]> {
    if (values.length === 0) return [];
    const chunks: string[][] = [];
    for (let i = 0; i < values.length; i += IN_CHUNK) chunks.push(values.slice(i, i + IN_CHUNK));
    const results = await Promise.all(
      chunks.map((chunk) =>
        fetchSemaphore(async () => {
          const r = await withReadRetry(async () => {
            const { data, error } = await supabase
              .from('fraud_entities')
              .select(FRAUD_ENTITY_COLS)
              .eq('entity_type', entityType)
              .in('entity_value', chunk);
            if (error) throw new Error(error.message);
            return (data as unknown as FraudEntity[]) ?? [];
          });
          readHealth.fastContextReadRetries += r.retries;
          if (r.failed) {
            readHealth.fastContextReadFailures++;
            console.error(`[fastContext] fraud_entities ${entityType} fetch failed (after retries): ${String((r.lastError as Error)?.message ?? r.lastError)}`);
            return [] as FraudEntity[];
          }
          return r.value ?? [];
        })
      )
    );
    return results.flat();
  }

  // Only columns downstream scoring actually reads from co-occurrence rows.
  // select('*') was returning every column including any future large fields;
  // projecting to exactly what's needed cuts wire transfer size significantly.
  const CO_OCC_COLS =
    'id,entity_a_type,entity_a_value,entity_b_type,entity_b_value,' +
    'co_occurrence_count,first_seen,last_seen';

  // Parallelize co-occurrence chunk fetches in the same way.
  async function fetchCoBatch(side: 'a' | 'b', entityType: string, values: string[]): Promise<CoOccurrence[]> {
    if (values.length === 0) return [];
    const typeCol  = side === 'a' ? 'entity_a_type'  : 'entity_b_type';
    const valueCol = side === 'a' ? 'entity_a_value' : 'entity_b_value';
    const chunks: string[][] = [];
    for (let i = 0; i < values.length; i += IN_CHUNK) chunks.push(values.slice(i, i + IN_CHUNK));
    const results = await Promise.all(
      chunks.map((chunk) =>
        fetchSemaphore(async () => {
          const r = await withReadRetry(async () => {
            const { data, error } = await supabase
              .from('fraud_entity_co_occurrences')
              .select(CO_OCC_COLS)
              .eq(typeCol, entityType)
              .in(valueCol, chunk);
            if (error) throw new Error(error.message);
            return (data as unknown as CoOccurrence[]) ?? [];
          });
          readHealth.fastContextReadRetries += r.retries;
          if (r.failed) {
            readHealth.fastContextReadFailures++;
            console.error(`[fastContext] co_occurrences ${entityType}/${side} fetch failed (after retries): ${String((r.lastError as Error)?.message ?? r.lastError)}`);
            return [] as CoOccurrence[];
          }
          return r.value ?? [];
        })
      )
    );
    return results.flat();
  }

  const IDENTIFIER_EDGE_COLS =
    'id,left_identifier_type,left_identifier_hash,right_identifier_type,right_identifier_hash,' +
    'seen_count,first_seen_at,last_seen_at';

  async function fetchIdentifierCoBatch(
    side: 'left' | 'right',
    identifierType: string,
    hashes: string[]
  ): Promise<IdentifierCoOccurrenceEdgeRow[]> {
    if (hashes.length === 0) return [];
    const typeCol = side === 'left' ? 'left_identifier_type' : 'right_identifier_type';
    const hashCol = side === 'left' ? 'left_identifier_hash' : 'right_identifier_hash';
    const chunks: string[][] = [];
    for (let i = 0; i < hashes.length; i += IN_CHUNK) chunks.push(hashes.slice(i, i + IN_CHUNK));
    const results = await Promise.all(
      chunks.map((chunk) =>
        fetchSemaphore(async () => {
          const r = await withReadRetry(async () => {
            const { data, error } = await supabase
              .from(TABLES.IDENTIFIER_CO_OCCURRENCE_EDGES)
              .select(IDENTIFIER_EDGE_COLS)
              .eq(typeCol, identifierType)
              .in(hashCol, chunk);
            if (error) throw new Error(error.message);
            return (data as unknown as IdentifierCoOccurrenceEdgeRow[]) ?? [];
          });
          readHealth.fastContextReadRetries += r.retries;
          if (r.failed) {
            readHealth.fastContextReadFailures++;
            console.error(
              `[fastContext] identifier_co_occurrence_edges ${identifierType}/${side} fetch failed (after retries): ${String((r.lastError as Error)?.message ?? r.lastError)}`
            );
            return [] as IdentifierCoOccurrenceEdgeRow[];
          }
          return r.value ?? [];
        })
      )
    );
    return results.flat();
  }

  async function fetchAllIdentifierCoOccurrences(): Promise<IdentifierCoOccurrenceEdgeRow[]> {
    const v1Fetches: Array<Promise<IdentifierCoOccurrenceEdgeRow[]>> = [
      fetchIdentifierCoBatch('left', 'normalized_email_hash', allEmails),
      fetchIdentifierCoBatch('right', 'normalized_email_hash', allEmails),
      fetchIdentifierCoBatch('left', 'full_normalized_shipping_address_hash', allAddresses),
      fetchIdentifierCoBatch('right', 'full_normalized_shipping_address_hash', allAddresses),
      fetchIdentifierCoBatch('left', 'full_normalized_billing_address_hash', allBillingAddresses),
      fetchIdentifierCoBatch('right', 'full_normalized_billing_address_hash', allBillingAddresses),
      fetchIdentifierCoBatch('left', 'phone_e164_hash', allPhoneHashes),
      fetchIdentifierCoBatch('right', 'phone_e164_hash', allPhoneHashes),
    ];
    const rows = (await Promise.all(v1Fetches)).flat();
    const byId = new Map<string, IdentifierCoOccurrenceEdgeRow>();
    for (const row of rows) {
      if (!byId.has(row.id)) byId.set(row.id, row);
    }
    return Array.from(byId.values());
  }

  async function fetchAllLegacyCoOccurrences(): Promise<CoOccurrence[]> {
    const legacyFetches = await Promise.all([
      fetchCoBatch('a', 'email',      legacyPlaintext.emails),
      fetchCoBatch('b', 'email',      legacyPlaintext.emails),
      fetchCoBatch('a', 'ip',         legacyPlaintext.ips),
      fetchCoBatch('b', 'ip',         legacyPlaintext.ips),
      fetchCoBatch('a', 'address',    legacyPlaintext.addresses),
      fetchCoBatch('b', 'address',    legacyPlaintext.addresses),
      fetchCoBatch('a', 'card_last4', legacyPlaintext.cards),
      fetchCoBatch('b', 'card_last4', legacyPlaintext.cards),
    ]);
    return legacyFetches.flat();
  }

  async function fetchMergedCoOccurrences(): Promise<CoOccurrence[]> {
    const [legacyRows, newRows] = await Promise.all([
      fetchAllLegacyCoOccurrences(),
      fetchAllIdentifierCoOccurrences(),
    ]);
    return mergeCoOccurrenceSources(legacyRows, newRows, hashToLegacy);
  }

  // -----------------------------------------------------------------------
  // All Supabase reads in ONE parallel round-trip.
  // Entity history (4 types), co-occurrences (legacy + new graph, parallel merge),
  // signal weights, and cross-merchant profiles all fire simultaneously —
  // previously these were three sequential await stages costing 3× the wall-clock latency.
  // The RPC has a 10-second safety timeout so it never blocks the pipeline.
  // -----------------------------------------------------------------------
  const [
    emailHistory,
    ipHistory,
    addressHistory,
    cardHistory,
    { data: weightAdjustments },
    mergedCoRows,
    crossMerchantResult,
  ] = await Promise.all([
    fetchEntityBatch('email',      allEmails),
    fetchEntityBatch('ip',         allIPs),
    fetchEntityBatch('address',    allAddresses),
    fetchEntityBatch('card_last4', allCards),
    // Phase 6 — adaptive weights. Tolerate missing table gracefully.
    supabase.from('signal_performance').select('signal_name, weight_adjustment'),
    fetchMergedCoOccurrences(),
    // §1.2 — Cross-merchant profiles.
    //
    // PERF (2026-05-03): the previous implementation pulled up to 10 000
    // customer_profiles rows on EVERY upload via
    //   .gte('total_merchants_seen_at', 3).limit(10000)
    // which (a) returned huge `emails[]/ips[]/addresses[]/card_last4s[]`
    // arrays and (b) grew without bound as the network grew, eventually
    // dominating wall-clock time of `buildFastContext`.
    //
    // We now fetch ONLY the profiles whose array columns overlap the
    // identifiers actually present in this batch, chunked to stay under
    // PostgREST's URL limit. For a typical 2k-row CSV this returns dozens
    // of rows instead of 10k, and scales linearly with overlap rather than
    // the size of the network.
    merchantId
      ? fetchCrossMerchantProfiles(supabase, allEmails, allIPs, allAddresses, allCards)
          .then((data) => ({ data, error: null }))
          .catch((error) => {
            console.error('[fastContext] cross-merchant fetch failed:', error?.message ?? error);
            return { data: [] as CrossMerchantProfile[], error };
          })
      : Promise.resolve({ data: null, error: null }),
  ]);

  const historicalEmailMap   = new Map(emailHistory.map((e: FraudEntity)   => [e.entity_value, e]));
  const historicalIPMap      = new Map(ipHistory.map((e: FraudEntity)      => [e.entity_value, e]));
  const historicalAddressMap = new Map(addressHistory.map((e: FraudEntity) => [e.entity_value, e]));
  const historicalCardMap    = new Map(cardHistory.map((e: FraudEntity)    => [e.entity_value, e]));

  const historicalCoOccurrenceMap = indexCoOccurrencesByEntity(mergedCoRows);
  const seenCoIds = new Set(mergedCoRows.map((co) => co.id));

  const signalWeightAdjustments: Record<string, number> = {};
  for (const row of weightAdjustments ?? []) {
    const adj = Number(row.weight_adjustment) || 0;
    // Clamp source value to [-1, 1] so applied multiplier (1+adj) stays in [0, 2]
    signalWeightAdjustments[row.signal_name] = Math.max(-1, Math.min(1, adj));
  }

  // Diagnostic: surface the historical hit rate so Phase 7 Check 3 is observable.
  // Shows both the query inputs and the matches so a 0 result is clearly
  // attributable to either "no values in batch", "no matches found", or
  // (post-2026-05) "reads partially failed and we silently fell back to []".
  // eslint-disable-next-line no-console
  console.log(
    `[fastContext] inputs: emails=${allEmails.length} ips=${allIPs.length} addrs=${allAddresses.length} cards=${allCards.length} | ` +
    `hits: email=${historicalEmailMap.size} ip=${historicalIPMap.size} ` +
    `address=${historicalAddressMap.size} card=${historicalCardMap.size} ` +
    `coOcc=${seenCoIds.size} ` +
    `weightAdj=${Object.keys(signalWeightAdjustments).length} ` +
    `crossMerchantProfiles=${(crossMerchantResult.data ?? []).length} | ` +
    `readRetries=${readHealth.fastContextReadRetries} readFailures=${readHealth.fastContextReadFailures}`
  );

  // Filter cross-merchant profiles to exclude those that include the requesting merchant.
  // This prevents a merchant from being scored against their own history.
  const rawCrossProfiles = (crossMerchantResult.data ?? []) as CrossMerchantProfile[];
  const crossMerchantProfiles = merchantId
    ? rawCrossProfiles.filter((p) => !(p.merchant_ids as string[]).includes(merchantId))
    : rawCrossProfiles;

  return {
    allOrders: orders,
    customerOrderHistory,
    populationRefundStats,
    addressEmailMap,
    emailRawEmailsMap,
    customerMaxVelocity,
    customerValueStats,
    customerPaymentMethods,
    historicalEmailMap,
    historicalIPMap,
    historicalAddressMap,
    historicalCardMap,
    historicalCoOccurrenceMap,
    signalWeightAdjustments,
    requestingMerchantId: merchantId,
    crossMerchantProfiles,
    pendingAuditLogs: [],
    readHealth,
  };
}
