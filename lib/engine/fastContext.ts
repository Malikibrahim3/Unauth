import type { NormalisedOrder } from './types';
import type { SupabaseClient } from '@supabase/supabase-js';
import { normaliseEmail, normaliseIP, normaliseAddress, normaliseCard } from '../identity/normalise';

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

  const sorted = [...customerOrders].sort((a, b) => a.orderDate.getTime() - b.orderDate.getTime());

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
  const customerOrderHistory = new Map<string, NormalisedOrder[]>();
  const addressEmailMap = new Map<string, Set<string>>();
  const emailRawEmailsMap = new Map<string, string[]>();
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
      const list = emailRawEmailsMap.get(order.emailHash) ?? [];
      if (!list.includes(rawEmail)) list.push(rawEmail);
      emailRawEmailsMap.set(order.emailHash, list);
    }
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
  const allEmails = Array.from(new Set(
    orders.map((o) => normaliseEmail((o as NormalisedOrder & { _rawEmail?: string })._rawEmail))
          .filter(Boolean)
  ));
  const allIPs = Array.from(new Set(
    orders.map((o) => normaliseIP((o as NormalisedOrder & { _rawIP?: string | null })._rawIP))
          .filter(Boolean)
  ));
  const allAddresses = Array.from(new Set(
    orders.map((o) => normaliseAddress((o as NormalisedOrder & { _rawAddress?: string | null })._rawAddress))
          .filter(Boolean)
  ));
  const allCards = Array.from(new Set(
    orders.map((o) => normaliseCard((o as NormalisedOrder & { _rawCardLast4?: string | null })._rawCardLast4))
          .filter(Boolean)
  ));

  // -----------------------------------------------------------------------
  // Chunked IN() queries.
  //
  // PostgREST/Supabase passes .in() filters in the URL query string; for a
  // 5000-row upload this overflows the ~8KB URL limit and silently returns
  // zero rows. Chunking to 200 keeps each URL well under the limit.
  // -----------------------------------------------------------------------
  const IN_CHUNK = 200;

  // Chunks fire in parallel — no sequential for-loop, so 2000 unique emails at
  // IN_CHUNK=200 costs 1 wall-clock round-trip instead of 10 sequential ones.
  async function fetchEntityBatch(entityType: string, values: string[]): Promise<FraudEntity[]> {
    if (values.length === 0) return [];
    const chunks: string[][] = [];
    for (let i = 0; i < values.length; i += IN_CHUNK) chunks.push(values.slice(i, i + IN_CHUNK));
    const results = await Promise.all(
      chunks.map(async (chunk) => {
        const { data, error } = await supabase
          .from('fraud_entities')
          .select('*')
          .eq('entity_type', entityType)
          .in('entity_value', chunk);
        if (error) {
          console.error(`[fastContext] fraud_entities ${entityType} fetch failed: ${error.message}`);
          return [] as FraudEntity[];
        }
        return (data as FraudEntity[]) ?? [];
      })
    );
    return results.flat();
  }

  // Parallelize co-occurrence chunk fetches in the same way.
  async function fetchCoBatch(side: 'a' | 'b', entityType: string, values: string[]): Promise<CoOccurrence[]> {
    if (values.length === 0) return [];
    const typeCol  = side === 'a' ? 'entity_a_type'  : 'entity_b_type';
    const valueCol = side === 'a' ? 'entity_a_value' : 'entity_b_value';
    const chunks: string[][] = [];
    for (let i = 0; i < values.length; i += IN_CHUNK) chunks.push(values.slice(i, i + IN_CHUNK));
    const results = await Promise.all(
      chunks.map(async (chunk) => {
        const { data, error } = await supabase
          .from('fraud_entity_co_occurrences')
          .select('*')
          .eq(typeCol, entityType)
          .in(valueCol, chunk);
        if (error) {
          console.error(`[fastContext] co_occurrences ${entityType}/${side} fetch failed: ${error.message}`);
          return [] as CoOccurrence[];
        }
        return (data as CoOccurrence[]) ?? [];
      })
    );
    return results.flat();
  }

  // -----------------------------------------------------------------------
  // All Supabase reads in ONE parallel round-trip.
  // Entity history (4 types), co-occurrences (8 directions), signal weights,
  // and cross-merchant profiles all fire simultaneously — previously these
  // were three sequential await stages costing 3× the wall-clock latency.
  // The RPC has a 10-second safety timeout so it never blocks the pipeline.
  // -----------------------------------------------------------------------
  const [
    emailHistory,
    ipHistory,
    addressHistory,
    cardHistory,
    { data: weightAdjustments },
    coArrays,
    crossMerchantResult,
  ] = await Promise.all([
    fetchEntityBatch('email',      allEmails),
    fetchEntityBatch('ip',         allIPs),
    fetchEntityBatch('address',    allAddresses),
    fetchEntityBatch('card_last4', allCards),
    // Phase 6 — adaptive weights. Tolerate missing table gracefully.
    supabase.from('signal_performance').select('signal_name, weight_adjustment'),
    // All co-occurrence directions in parallel
    Promise.all([
      fetchCoBatch('a', 'email',      allEmails),
      fetchCoBatch('b', 'email',      allEmails),
      fetchCoBatch('a', 'ip',         allIPs),
      fetchCoBatch('b', 'ip',         allIPs),
      fetchCoBatch('a', 'address',    allAddresses),
      fetchCoBatch('b', 'address',    allAddresses),
      fetchCoBatch('a', 'card_last4', allCards),
      fetchCoBatch('b', 'card_last4', allCards),
    ]),
    // §1.2 — Cross-merchant profiles: fetch customer_profiles seen at 3+ merchants
    // that do NOT include the requesting merchant (excludes self-matches).
    // Limit to 10 000 to bound memory in pilot; production should use RPC.
    merchantId
      ? supabase
          .from('customer_profiles')
          .select('id, emails, ips, addresses, card_last4s, phones, total_orders, total_refund_claims, total_merchants_seen_at, merchant_ids')
          .gte('total_merchants_seen_at', 3)
          .limit(10000)
      : Promise.resolve({ data: null, error: null }),
  ]);

  const historicalEmailMap   = new Map(emailHistory.map((e: FraudEntity)   => [e.entity_value, e]));
  const historicalIPMap      = new Map(ipHistory.map((e: FraudEntity)      => [e.entity_value, e]));
  const historicalAddressMap = new Map(addressHistory.map((e: FraudEntity) => [e.entity_value, e]));
  const historicalCardMap    = new Map(cardHistory.map((e: FraudEntity)    => [e.entity_value, e]));

  const seenCoIds = new Set<string>();
  const historicalCoOccurrenceMap = new Map<string, CoOccurrence[]>();
  for (const arr of coArrays) {
    for (const co of arr) {
      if (seenCoIds.has(co.id)) continue;
      seenCoIds.add(co.id);
      const keyA = `${co.entity_a_type}:${co.entity_a_value}`;
      const keyB = `${co.entity_b_type}:${co.entity_b_value}`;
      if (!historicalCoOccurrenceMap.has(keyA)) historicalCoOccurrenceMap.set(keyA, []);
      if (!historicalCoOccurrenceMap.has(keyB)) historicalCoOccurrenceMap.set(keyB, []);
      historicalCoOccurrenceMap.get(keyA)!.push(co);
      historicalCoOccurrenceMap.get(keyB)!.push(co);
    }
  }

  const signalWeightAdjustments: Record<string, number> = {};
  for (const row of weightAdjustments ?? []) {
    const adj = Number(row.weight_adjustment) || 0;
    // Clamp source value to [-1, 1] so applied multiplier (1+adj) stays in [0, 2]
    signalWeightAdjustments[row.signal_name] = Math.max(-1, Math.min(1, adj));
  }

  // Diagnostic: surface the historical hit rate so Phase 7 Check 3 is observable.
  // Shows both the query inputs and the matches so a 0 result is clearly
  // attributable to either "no values in batch" or "no matches found".
  // eslint-disable-next-line no-console
  console.log(
    `[fastContext] inputs: emails=${allEmails.length} ips=${allIPs.length} addrs=${allAddresses.length} cards=${allCards.length} | ` +
    `hits: email=${historicalEmailMap.size} ip=${historicalIPMap.size} ` +
    `address=${historicalAddressMap.size} card=${historicalCardMap.size} ` +
    `coOcc=${seenCoIds.size} ` +
    `weightAdj=${Object.keys(signalWeightAdjustments).length} ` +
    `crossMerchantProfiles=${(crossMerchantResult.data ?? []).length}`
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
  };
}
