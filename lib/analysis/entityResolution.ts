/* ────────────────────────────────────────────────────────────────────────────
 * 🔒 LOCKED FILE — DO NOT MODIFY WITHOUT EXPLICIT USER PERMISSION 🔒
 *
 * Part of the CSV upload + scanning pipeline. Bulk fetch + column projection
 * here were tuned on 2026-05-03; reverting to `select *` or per-order DB
 * round-trips will reintroduce the 10-minute upload regression. Any change
 * requires explicit user sign-off — see workspace memory rule
 * "Locked CSV upload pipeline".
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * Entity Resolution — Living Customer Profiles
 *
 * After each CSV batch is scored, this module resolves each scored order to
 * an existing customer_profile (or creates a new one) and writes an
 * appearance link to customer_profile_audit_appearances.
 *
 * Matching priority cascade:
 *   1. Exact email match — strongest (confidence 99)
 *   2. Card last4 match — very strong (confidence 90)
 *   3. IP + address match — strong (confidence 85)
 *   4. IP only — moderate (confidence 60), ONLY if existing profile risk_score >= 50
 *
 * Critical rule: Never merge on IP alone if the existing profile has risk_score < 50.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../supabase/types';
import type { ScoredOrder } from '../engine/types';
import {
  normaliseEmail,
  normaliseIP,
  normaliseAddress,
  normaliseCard,
} from '../identity/normalise';
import { RISK_TIER_THRESHOLDS } from '../engine/weights';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ServiceClient = SupabaseClient<Database>;

export interface CustomerProfileRow {
  id: string;
  primary_email: string | null;
  emails: string[];
  ips: string[];
  addresses: string[];
  card_last4s: string[];
  phones: string[];
  names: string[];
  risk_score: number;
  risk_level: string;
  fraud_flags: string[];
  total_orders: number;
  total_refund_claims: number;
  total_chargebacks: number;
  total_merchants_seen_at: number;
  refund_rate: number;
  refund_timestamps: string[];
  fastest_claim_days: number | null;
  avg_claim_days: number | null;
  refund_acceleration_score: number;
  merchant_ids: string[];
  first_seen: string;
  last_seen: string;
  last_audit_id: string | null;
  profile_confidence: number;
  manually_reviewed: boolean;
  merchant_notes: string | null;
  on_watchlist: boolean;
}

interface ResolveResult {
  profile: CustomerProfileRow | null;
  matchType: 'email' | 'card' | 'ip_address' | 'ip_only' | null;
  confidence: number;
}

// ---------------------------------------------------------------------------
// Risk level helper — mirrors fastScore.ts getRiskTier
// ---------------------------------------------------------------------------

function getRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
  if (score >= RISK_TIER_THRESHOLDS.critical) return 'critical';
  if (score >= RISK_TIER_THRESHOLDS.high) return 'high';
  if (score >= RISK_TIER_THRESHOLDS.medium) return 'medium';
  return 'low';
}

// ---------------------------------------------------------------------------
// Phase 3 — Entity Resolution
// ---------------------------------------------------------------------------

/**
 * Resolve a scored order to an existing customer profile.
 * Returns the matched profile, match type, and confidence — or null if new.
 */
export async function resolveCustomerProfile(
  order: ScoredOrder,
  serviceClient: ServiceClient
): Promise<ResolveResult> {
  const rawOrder = order.order as ScoredOrder['order'] & {
    _rawEmail?: string;
    _rawIP?: string | null;
    _rawAddress?: string | null;
    _rawCardLast4?: string | null;
  };

  const normEmail = normaliseEmail(rawOrder._rawEmail);
  const normIP = normaliseIP(rawOrder._rawIP);
  const normAddr = normaliseAddress(rawOrder._rawAddress);
  const normCard = normaliseCard(rawOrder._rawCardLast4);

  // Priority 1: exact email match — strongest signal
  if (normEmail) {
    const { data } = await serviceClient
      .from('customer_profiles')
      .select('*')
      .contains('emails', JSON.stringify([normEmail]))
      .limit(1)
      .single();
    if (data) {
      return { profile: data as unknown as CustomerProfileRow, matchType: 'email', confidence: 99 };
    }
  }

  // Priority 2: card match — very strong
  if (normCard && normCard.length === 4) {
    const { data } = await serviceClient
      .from('customer_profiles')
      .select('*')
      .contains('card_last4s', JSON.stringify([normCard]))
      .limit(1)
      .single();
    if (data) {
      return { profile: data as unknown as CustomerProfileRow, matchType: 'card', confidence: 90 };
    }
  }

  // Priority 3: IP + address match — strong
  if (normIP && normAddr) {
    const { data } = await serviceClient
      .from('customer_profiles')
      .select('*')
      .contains('ips', JSON.stringify([normIP]))
      .contains('addresses', JSON.stringify([normAddr]))
      .limit(1)
      .single();
    if (data) {
      return { profile: data as unknown as CustomerProfileRow, matchType: 'ip_address', confidence: 85 };
    }
  }

  // Priority 4: IP only — moderate, ONLY if existing profile is already suspicious
  if (normIP) {
    const { data } = await serviceClient
      .from('customer_profiles')
      .select('*')
      .contains('ips', JSON.stringify([normIP]))
      .gte('risk_score', 50)
      .limit(1)
      .single();
    if (data) {
      return { profile: data as unknown as CustomerProfileRow, matchType: 'ip_only', confidence: 60 };
    }
  }

  // No match — new profile
  return { profile: null, matchType: null, confidence: 0 };
}

// ---------------------------------------------------------------------------
// Phase 4 — Profile Create and Update
// ---------------------------------------------------------------------------

export async function createCustomerProfile(
  order: ScoredOrder,
  score: { finalScore: number; flags: string[] },
  merchantId: string,
  auditId: string,
  serviceClient: ServiceClient
): Promise<CustomerProfileRow> {
  const rawOrder = order.order as ScoredOrder['order'] & {
    _rawEmail?: string;
    _rawIP?: string | null;
    _rawAddress?: string | null;
    _rawCardLast4?: string | null;
  };

  const normEmail = normaliseEmail(rawOrder._rawEmail);
  const normIP = normaliseIP(rawOrder._rawIP);
  const normAddr = normaliseAddress(rawOrder._rawAddress);
  const normCard = normaliseCard(rawOrder._rawCardLast4);
  const normName = rawOrder.customerNameNorm?.trim() || '';
  const isRefund =
    rawOrder.refundStatus === 'full' ||
    rawOrder.refundStatus === 'partial' ||
    rawOrder.orderStatus === 'refunded';
  const refundDate = rawOrder.refundDate?.toISOString() ?? null;

  const { data, error } = await serviceClient
    .from('customer_profiles')
    .insert({
      primary_email: normEmail || null,
      emails: normEmail ? [normEmail] : [],
      ips: normIP ? [normIP] : [],
      addresses: normAddr ? [normAddr] : [],
      card_last4s: normCard && normCard.length === 4 ? [normCard] : [],
      phones: [],
      names: normName ? [normName] : [],
      risk_score: score.finalScore,
      risk_level: getRiskLevel(score.finalScore),
      fraud_flags: score.flags,
      total_orders: 1,
      total_refund_claims: isRefund ? 1 : 0,
      total_chargebacks: 0,
      total_merchants_seen_at: 1,
      refund_rate: isRefund ? 1 : 0,
      refund_timestamps: isRefund && refundDate ? [refundDate] : [],
      merchant_ids: merchantId ? [merchantId] : [],
      last_audit_id: auditId,
      profile_confidence: 100,
    } as any)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`Failed to create customer profile: ${error?.message ?? 'unknown'}`);
  }

  return data as unknown as CustomerProfileRow;
}

export async function updateCustomerProfile(
  existingProfile: CustomerProfileRow,
  order: ScoredOrder,
  score: { finalScore: number; flags: string[] },
  merchantId: string,
  auditId: string,
  matchConfidence: number,
  serviceClient: ServiceClient
): Promise<CustomerProfileRow> {
  const rawOrder = order.order as ScoredOrder['order'] & {
    _rawEmail?: string;
    _rawIP?: string | null;
    _rawAddress?: string | null;
    _rawCardLast4?: string | null;
  };

  const normEmail = normaliseEmail(rawOrder._rawEmail);
  const normIP = normaliseIP(rawOrder._rawIP);
  const normAddr = normaliseAddress(rawOrder._rawAddress);
  const normCard = normaliseCard(rawOrder._rawCardLast4);
  const normName = rawOrder.customerNameNorm?.trim() || '';
  const isRefund =
    rawOrder.refundStatus === 'full' ||
    rawOrder.refundStatus === 'partial' ||
    rawOrder.orderStatus === 'refunded';
  const refundDate = rawOrder.refundDate?.toISOString() ?? null;

  // Merge arrays — add new values only, no duplicates
  const mergedEmails = Array.from(new Set([...existingProfile.emails, normEmail].filter(Boolean)));
  const mergedIPs = Array.from(new Set([...existingProfile.ips, normIP].filter(Boolean)));
  const mergedAddresses = Array.from(new Set([...existingProfile.addresses, normAddr].filter(Boolean)));
  const mergedCards = Array.from(new Set([
    ...existingProfile.card_last4s,
    normCard && normCard.length === 4 ? normCard : '',
  ].filter(Boolean)));
  const mergedMerchants = Array.from(new Set([...existingProfile.merchant_ids, merchantId].filter(Boolean)));
  const mergedNames = Array.from(new Set([...existingProfile.names, normName].filter(Boolean)));
  const mergedFlags = Array.from(new Set([...existingProfile.fraud_flags, ...score.flags]));

  // Recalculate totals
  const newTotalOrders = existingProfile.total_orders + 1;
  const newRefundClaims = existingProfile.total_refund_claims + (isRefund ? 1 : 0);
  const newChargebacks = existingProfile.total_chargebacks; // no chargeback data in CSV
  const newRefundRate = newTotalOrders > 0 ? newRefundClaims / newTotalOrders : 0;

  // Rolling risk score — weight recent score more than historical average
  const newRiskScore = (existingProfile.risk_score * 0.6) + (score.finalScore * 0.4);

  // Refund timestamps
  const newTimestamps = isRefund && refundDate
    ? [...existingProfile.refund_timestamps, refundDate]
    : [...existingProfile.refund_timestamps];

  // Lower profile confidence if matched on weaker signals
  const newConfidence = Math.min(existingProfile.profile_confidence, matchConfidence);

  const { data, error } = await serviceClient
    .from('customer_profiles')
    .update({
      emails: mergedEmails,
      ips: mergedIPs,
      addresses: mergedAddresses,
      card_last4s: mergedCards,
      names: mergedNames,
      merchant_ids: mergedMerchants,
      fraud_flags: mergedFlags,
      risk_score: newRiskScore,
      risk_level: getRiskLevel(newRiskScore),
      total_orders: newTotalOrders,
      total_refund_claims: newRefundClaims,
      total_chargebacks: newChargebacks,
      total_merchants_seen_at: mergedMerchants.length,
      refund_rate: newRefundRate,
      refund_timestamps: newTimestamps,
      last_seen: new Date().toISOString(),
      last_audit_id: auditId,
      profile_confidence: newConfidence,
    } as any)
    .eq('id', existingProfile.id)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`Failed to update customer profile: ${error?.message ?? 'unknown'}`);
  }

  return data as unknown as CustomerProfileRow;
}

// ---------------------------------------------------------------------------
// Appearance link
// ---------------------------------------------------------------------------

async function writeAppearanceLink(
  profileId: string,
  auditId: string,
  transactionId: string | null,
  score: number,
  flags: string[],
  serviceClient: ServiceClient
): Promise<void> {
  const { error } = await serviceClient
    .from('customer_profile_audit_appearances')
    .insert({
      profile_id: profileId,
      audit_id: auditId,
      transaction_id: transactionId,
      score_at_time: score,
      flags_at_time: flags,
    } as any);

  if (error) {
    console.error(`[entityResolution] Failed to write appearance link: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Batch orchestrator — called from the worker after scoring
// ---------------------------------------------------------------------------

/**
 * Process entity resolution for a batch of scored orders — BULK version.
 *
 * Previous implementation made up to 6 sequential DB round-trips per order
 * (resolve × 4 priority checks + update/create + appearance link), which
 * caused ~12,000 sequential queries for a 2,000-row CSV → 20-minute runs.
 *
 * New approach — 6 total DB calls for the entire batch regardless of size:
 *   1. overlaps query on customer_profiles.emails         (1 query)
 *   2. overlaps query on customer_profiles.card_last4s   (1 query)
 *   3. overlaps query on customer_profiles.ips           (1 query)
 *   4. Bulk upsert existing profile updates              (1 query)
 *   5. Bulk insert new profiles                          (1 query)
 *   6. Bulk insert appearance links                      (1 query)
 */
export async function processProfilesForBatch(
  scored: ScoredOrder[],
  merchantId: string,
  auditId: string,
  transactionIdMap: Map<string, string>, // orderId → audit_transactions.id
  serviceClient: ServiceClient
): Promise<{ profilesCreated: number; profilesUpdated: number; errors: string[] }> {
  if (scored.length === 0) return { profilesCreated: 0, profilesUpdated: 0, errors: [] };

  const errors: string[] = [];

  // -------------------------------------------------------------------------
  // 0. Pre-compute normalised entity values for every order (in-memory, O(n))
  // -------------------------------------------------------------------------
  interface OrderData {
    scoredOrder: ScoredOrder;
    normEmail: string;
    normCard: string;
    normIP: string;
    normAddr: string;
    flags: string[];
    isRefund: boolean;
    refundDate: string | null;
  }

  const orderDataList: OrderData[] = scored.map((scoredOrder) => {
    const rawOrder = scoredOrder.order as ScoredOrder['order'] & {
      _rawEmail?: string;
      _rawIP?: string | null;
      _rawAddress?: string | null;
      _rawCardLast4?: string | null;
      refundStatus?: string;
      orderStatus?: string;
      refundDate?: Date | null;
    };
    const normEmail = normaliseEmail(rawOrder._rawEmail);
    const normCard  = normaliseCard(rawOrder._rawCardLast4);
    const normIP    = normaliseIP(rawOrder._rawIP);
    const normAddr  = normaliseAddress(rawOrder._rawAddress);
    const flags     = scoredOrder.signals.filter((s) => s.fired).map((s) => s.name);
    const isRefund  =
      rawOrder.refundStatus === 'full' ||
      rawOrder.refundStatus === 'partial' ||
      rawOrder.orderStatus  === 'refunded';
    const refundDate = rawOrder.refundDate?.toISOString() ?? null;
    return { scoredOrder, normEmail, normCard, normIP, normAddr, flags, isRefund, refundDate };
  });

  const uniqueEmails = [...new Set(orderDataList.map((od) => od.normEmail).filter(Boolean))];
  const uniqueCards  = [...new Set(orderDataList.map((od) => od.normCard).filter((c) => c.length === 4))];
  const uniqueIPs    = [...new Set(orderDataList.map((od) => od.normIP).filter(Boolean))];

  // -------------------------------------------------------------------------
  // 1. Bulk fetch potentially matching profiles — 3 parallel queries.
  //
  // Project only the columns we read/mutate — `select *` was returning every
  // unbounded array column (refund_timestamps, names, …) for every candidate
  // profile, which dominated bandwidth on large batches.
  //
  // Each `.overlaps()` URL is bounded by chunking input arrays to 100 values.
  // -------------------------------------------------------------------------
  const PROFILE_COLS =
    'id,primary_email,emails,ips,addresses,card_last4s,phones,names,' +
    'risk_score,risk_level,fraud_flags,total_orders,total_refund_claims,' +
    'total_chargebacks,total_merchants_seen_at,refund_rate,' +
    'refund_timestamps,fastest_claim_days,avg_claim_days,' +
    'refund_acceleration_score,merchant_ids,first_seen,last_seen,' +
    'last_audit_id,profile_confidence,manually_reviewed,' +
    'merchant_notes,on_watchlist';
  // The identifier columns on customer_profiles are JSONB arrays, NOT native
  // text[], so we cannot use `.overlaps()` (which generates the PG `&&`
  // operator — only valid on real arrays). Instead we issue chunked
  // OR-of-`@>` queries: "does this row's jsonb array contain ANY of these
  // N values?" expressed in PostgREST as `or=(col.cs.[v1],col.cs.[v2],…)`.
  const OVERLAP_CHUNK = 100;
  const fetchProfilesByOverlap = async (
    col: 'emails' | 'card_last4s' | 'ips',
    values: string[],
    extraFilter?: (q: any) => any
  ): Promise<CustomerProfileRow[]> => {
    if (values.length === 0) return [];
    const chunks: string[][] = [];
    for (let i = 0; i < values.length; i += OVERLAP_CHUNK) chunks.push(values.slice(i, i + OVERLAP_CHUNK));
    const results = await Promise.all(
      chunks.map(async (chunk) => {
        const orExpr = chunk.map((v) => `${col}.cs.${JSON.stringify([v])}`).join(',');
        let q: any = serviceClient.from('customer_profiles').select(PROFILE_COLS).or(orExpr);
        if (extraFilter) q = extraFilter(q);
        const { data, error } = await q;
        if (error) {
          console.error(`[entityResolution] or(${col}) failed: ${error.message}`);
          return [] as CustomerProfileRow[];
        }
        return (data as unknown as CustomerProfileRow[]) ?? [];
      })
    );
    return results.flat();
  };

  const [emailProfiles, cardProfiles, ipProfiles] = await Promise.all([
    fetchProfilesByOverlap('emails',      uniqueEmails),
    fetchProfilesByOverlap('card_last4s', uniqueCards),
    fetchProfilesByOverlap('ips',         uniqueIPs, (q) => q.gte('risk_score', 50)),
  ]);
  const emailProfilesResult = { data: emailProfiles, error: null };
  const cardProfilesResult  = { data: cardProfiles,  error: null };
  const ipProfilesResult    = { data: ipProfiles,    error: null };

  // Build lookup maps: entity value → profile (deduplicated by profile id)
  const profileByEmail = new Map<string, CustomerProfileRow>();
  const profileByCard  = new Map<string, CustomerProfileRow>();
  const profileByIP    = new Map<string, CustomerProfileRow>();
  const profilesById   = new Map<string, CustomerProfileRow>();

  for (const p of (emailProfilesResult.data ?? []) as CustomerProfileRow[]) {
    profilesById.set(p.id, p);
    for (const e of p.emails) profileByEmail.set(e, p);
  }
  for (const p of (cardProfilesResult.data ?? []) as CustomerProfileRow[]) {
    if (!profilesById.has(p.id)) profilesById.set(p.id, p);
    for (const c of p.card_last4s) profileByCard.set(c, p);
  }
  for (const p of (ipProfilesResult.data ?? []) as CustomerProfileRow[]) {
    if (!profilesById.has(p.id)) profilesById.set(p.id, p);
    for (const ip of p.ips) profileByIP.set(ip, p);
  }

  // -------------------------------------------------------------------------
  // 2. Match every order to a profile in-memory (priority: email > card > ip)
  //    Accumulate all changes per profile to collapse N orders → 1 upsert row.
  // -------------------------------------------------------------------------
  interface ProfileAccumulator {
    profile: CustomerProfileRow;  // latest in-memory state (mutated per order)
    matchConfidence: number;
  }

  const profileAccumulators = new Map<string, ProfileAccumulator>();
  const newProfileGroups    = new Map<string, OrderData[]>(); // primaryKey → orders

  const profileIdForOrder   = new Map<string, string>(); // orderId → profileId (filled later)

  for (const od of orderDataList) {
    let matchedProfile: CustomerProfileRow | null = null;
    let confidence = 0;

    if (od.normEmail && profileByEmail.has(od.normEmail)) {
      matchedProfile = profileByEmail.get(od.normEmail)!;
      confidence = 99;
    } else if (od.normCard && od.normCard.length === 4 && profileByCard.has(od.normCard)) {
      matchedProfile = profileByCard.get(od.normCard)!;
      confidence = 90;
    } else if (od.normIP && profileByIP.has(od.normIP)) {
      matchedProfile = profileByIP.get(od.normIP)!;
      confidence = 60;
    }

    if (matchedProfile) {
      // Accumulate all order contributions into the in-memory profile state
      let acc = profileAccumulators.get(matchedProfile.id);
      if (!acc) {
        // Clone so we mutate the accumulator, not the original fetched row
        acc = { profile: { ...matchedProfile, emails: [...matchedProfile.emails], ips: [...matchedProfile.ips], addresses: [...matchedProfile.addresses], card_last4s: [...matchedProfile.card_last4s], fraud_flags: [...matchedProfile.fraud_flags], merchant_ids: [...matchedProfile.merchant_ids], refund_timestamps: [...matchedProfile.refund_timestamps] }, matchConfidence: confidence };
        profileAccumulators.set(matchedProfile.id, acc);
      }
      const p = acc.profile;

      if (od.normEmail) p.emails = [...new Set([...p.emails, od.normEmail])];
      if (od.normIP)    p.ips    = [...new Set([...p.ips, od.normIP])];
      if (od.normAddr)  p.addresses = [...new Set([...p.addresses, od.normAddr])];
      if (od.normCard && od.normCard.length === 4)
        p.card_last4s = [...new Set([...p.card_last4s, od.normCard])];
      if (merchantId) p.merchant_ids = [...new Set([...p.merchant_ids, merchantId])];
      p.fraud_flags = [...new Set([...p.fraud_flags, ...od.flags])];
      p.total_orders += 1;
      if (od.isRefund) {
        p.total_refund_claims += 1;
        if (od.refundDate) p.refund_timestamps = [...p.refund_timestamps, od.refundDate];
      }
      p.refund_rate   = p.total_orders > 0 ? p.total_refund_claims / p.total_orders : 0;
      p.risk_score    = p.risk_score * 0.6 + od.scoredOrder.totalScore * 0.4;
      p.risk_level    = getRiskLevel(p.risk_score);
      p.profile_confidence = Math.min(p.profile_confidence, confidence);
      p.last_seen     = new Date().toISOString();
      p.last_audit_id = auditId;
      acc.matchConfidence = Math.min(acc.matchConfidence, confidence);

      profileIdForOrder.set(od.scoredOrder.order.orderId, matchedProfile.id);
    } else {
      // Group unmatched orders by primary entity so the same customer appearing
      // twice in this batch only creates ONE new profile row.
      const primaryKey =
        od.normEmail          ? `email:${od.normEmail}` :
        od.normCard.length === 4 ? `card:${od.normCard}`  :
        od.normIP             ? `ip:${od.normIP}`         :
        `anon:${od.scoredOrder.order.orderId}`;
      const group = newProfileGroups.get(primaryKey) ?? [];
      group.push(od);
      newProfileGroups.set(primaryKey, group);
    }
  }

  // -------------------------------------------------------------------------
  // 3. Build bulk upsert payload for existing profiles
  // -------------------------------------------------------------------------
  const profileUpserts = Array.from(profileAccumulators.values()).map(({ profile: p }) => ({
    id:                        p.id,
    emails:                    p.emails,
    ips:                       p.ips,
    addresses:                 p.addresses,
    card_last4s:               p.card_last4s,
    names:                     p.names,
    merchant_ids:              p.merchant_ids,
    fraud_flags:               p.fraud_flags,
    risk_score:                p.risk_score,
    risk_level:                p.risk_level,
    total_orders:              p.total_orders,
    total_refund_claims:       p.total_refund_claims,
    total_chargebacks:         p.total_chargebacks,
    total_merchants_seen_at:   p.merchant_ids.length,
    refund_rate:               p.refund_rate,
    refund_timestamps:         p.refund_timestamps,
    last_seen:                 p.last_seen,
    last_audit_id:             p.last_audit_id,
    profile_confidence:        p.profile_confidence,
  }));

  // -------------------------------------------------------------------------
  // 4. Build bulk insert payload for new profiles (one row per group)
  // -------------------------------------------------------------------------
  const now = new Date().toISOString();
  const newProfileInserts = Array.from(newProfileGroups.values()).map((group) => {
    const emails    = new Set<string>();
    const ips       = new Set<string>();
    const addrs     = new Set<string>();
    const cards     = new Set<string>();
    let totalOrders   = 0;
    let totalRefunds  = 0;
    let maxScore      = 0;
    const refundTs: string[] = [];
    const allFlags    = new Set<string>();

    for (const od of group) {
      totalOrders++;
      if (od.normEmail) emails.add(od.normEmail);
      if (od.normIP)    ips.add(od.normIP);
      if (od.normAddr)  addrs.add(od.normAddr);
      if (od.normCard && od.normCard.length === 4) cards.add(od.normCard);
      if (od.isRefund) { totalRefunds++; if (od.refundDate) refundTs.push(od.refundDate); }
      if (od.scoredOrder.totalScore > maxScore) maxScore = od.scoredOrder.totalScore;
      od.flags.forEach((f) => allFlags.add(f));
    }

    return {
      primary_email:           [...emails][0] ?? null,
      emails:                  [...emails],
      ips:                     [...ips],
      addresses:               [...addrs],
      card_last4s:             [...cards],
      phones:                  [] as string[],
      names:                   [] as string[],
      risk_score:              maxScore,
      risk_level:              getRiskLevel(maxScore),
      fraud_flags:             [...allFlags],
      total_orders:            totalOrders,
      total_refund_claims:     totalRefunds,
      total_chargebacks:       0,
      total_merchants_seen_at: merchantId ? 1 : 0,
      refund_rate:             totalOrders > 0 ? totalRefunds / totalOrders : 0,
      refund_timestamps:       refundTs,
      merchant_ids:            merchantId ? [merchantId] : ([] as string[]),
      last_audit_id:           auditId,
      profile_confidence:      100,
      first_seen:              now,
      last_seen:               now,
    };
  });

  // -------------------------------------------------------------------------
  // 5. Write profiles — bulk upsert existing + bulk insert new — in parallel
  // -------------------------------------------------------------------------
  let profilesCreated = 0;
  let profilesUpdated = 0;

  await Promise.all([
    profileUpserts.length > 0
      ? serviceClient
          .from('customer_profiles')
          .upsert(profileUpserts as any, { onConflict: 'id', ignoreDuplicates: false })
          .then(({ error }) => {
            if (error) errors.push(`Bulk profile update failed: ${error.message}`);
            else profilesUpdated = profileUpserts.length;
          })
      : Promise.resolve(),

    newProfileInserts.length > 0
      ? serviceClient
          .from('customer_profiles')
          .insert(newProfileInserts as any)
          .select('id, emails, card_last4s, ips')
          .then(({ data, error }) => {
            if (error) {
              errors.push(`Bulk profile insert failed: ${error.message}`);
              return;
            }
            profilesCreated = (data ?? []).length;
            // Map new profile IDs back to each order in the group
            for (const newP of (data ?? []) as { id: string; emails: string[]; card_last4s: string[]; ips: string[] }[]) {
              for (const group of newProfileGroups.values()) {
                for (const od of group) {
                  if (
                    (od.normEmail && newP.emails.includes(od.normEmail)) ||
                    (od.normCard && newP.card_last4s.includes(od.normCard)) ||
                    (od.normIP   && newP.ips.includes(od.normIP))
                  ) {
                    profileIdForOrder.set(od.scoredOrder.order.orderId, newP.id);
                  }
                }
              }
            }
          })
      : Promise.resolve(),
  ]);

  // -------------------------------------------------------------------------
  // 6. Bulk insert all appearance links in one query
  // -------------------------------------------------------------------------
  const appearanceInserts = scored
    .map((scoredOrder) => {
      const profileId = profileIdForOrder.get(scoredOrder.order.orderId);
      if (!profileId) return null;
      return {
        profile_id:      profileId,
        audit_id:        auditId,
        transaction_id:  transactionIdMap.get(scoredOrder.order.orderId) ?? null,
        score_at_time:   scoredOrder.totalScore,
        flags_at_time:   scoredOrder.signals.filter((s) => s.fired).map((s) => s.name),
      };
    })
    .filter(Boolean);

  if (appearanceInserts.length > 0) {
    const { error } = await serviceClient
      .from('customer_profile_audit_appearances')
      .insert(appearanceInserts as any);
    if (error) errors.push(`Bulk appearance link insert failed: ${error.message}`);
  }

  console.log(
    `[entityResolution] bulk: ${profilesUpdated} updated, ${profilesCreated} created, ` +
    `${appearanceInserts.length} appearances — ${errors.length} errors`
  );

  return { profilesCreated, profilesUpdated, errors };
}
