/**
 * Cross-Merchant Signal — §1.2
 *
 * Queries customer_profiles for identities seen at 3+ merchants (k-anonymity
 * gate) that also appear in the current order. Fires when the same identity
 * has been observed at other merchants in the Unauth network.
 *
 * Privacy invariants:
 *   - reasoning strings NEVER contain merchant names, only counts
 *   - queried values are normalised hashes, never plaintext PII
 *   - only profiles with merchant_count >= 3 are eligible (k-anon gate)
 *   - the requesting merchant's own history is excluded from the aggregate
 */

import type { SignalResult } from '../types';
import type { CrossMerchantProfile, PendingAuditLog } from '../fastContext';

export interface CrossMerchantInput {
  /** Normalised email value (from normaliseEmail). May be null. */
  normEmail: string | null;
  /** Normalised IP value (from normaliseIP). May be null. */
  normIP: string | null;
  /** Normalised address value (from normaliseAddress). May be null. */
  normAddress: string | null;
  /** Normalised card last4 value (from normaliseCard). May be null. */
  normCard: string | null;
  /** The requesting merchant's UUID. Used to exclude self-matches. */
  requestingMerchantId: string;
  /**
   * Pre-fetched cross-merchant profiles (from buildFastContext).
   * These are already filtered to merchant_count >= 3 but NOT yet filtered
   * by requesting_merchant_id — that filter is applied here per-order.
   */
  profiles: CrossMerchantProfile[];
  /**
   * Mutable array to push audit log entries into.
   * The worker flushes this to access_audit_log after scoring completes.
   */
  pendingAuditLogs: PendingAuditLog[];
}

/**
 * Pure, testable implementation of the cross-merchant signal.
 * All DB I/O has been moved to buildFastContext; this function is synchronous.
 */
export function computeCrossMerchantSignal(input: CrossMerchantInput): SignalResult {
  const {
    normEmail, normIP, normAddress, normCard,
    requestingMerchantId, profiles, pendingAuditLogs,
  } = input;

  const queriedHashes = [normEmail, normIP, normAddress, normCard].filter((v): v is string => Boolean(v));

  // Find profiles that match any identifier AND exclude the requesting merchant
  const matchingProfiles = profiles.filter((profile) => {
    // Exclude profiles where the requesting merchant is already listed —
    // this would be a self-match, not cross-merchant intelligence.
    if ((profile.merchant_ids as string[]).includes(requestingMerchantId)) {
      return false;
    }
    return (
      (normEmail   && (profile.emails      as string[]).includes(normEmail))   ||
      (normAddress && (profile.addresses   as string[]).includes(normAddress)) ||
      (normCard    && (profile.card_last4s as string[]).includes(normCard))    ||
      (normIP      && (profile.ips         as string[]).includes(normIP))
    );
  });

  const kAnonSatisfied = matchingProfiles.length > 0;
  const matchedMerchantCount = kAnonSatisfied
    ? matchingProfiles.reduce((max, p) => Math.max(max, p.total_merchants_seen_at), 0)
    : 0;

  // Always record an audit log entry — whether fired or not
  pendingAuditLogs.push({
    requesting_merchant_id: requestingMerchantId,
    queried_hashes: queriedHashes,
    k_anon_satisfied: kAnonSatisfied,
    matched_merchant_count: matchedMerchantCount,
  });

  if (!kAnonSatisfied) {
    return {
      name: 'crossMerchant',
      fired: false,
      score: 0,
      reason: "Cross-merchant data not available (k-anonymity not satisfied for this identity).",
      evidence: { queriedHashCount: queriedHashes.length },
      identifierTypesUsed: [],
    };
  }

  // Aggregate across matched profiles (only other merchants' contributions)
  let networkOrders = 0;
  let networkRefundClaims = 0;
  const merchantSet = new Set<string>();
  const usedTypes: string[] = [];

  for (const profile of matchingProfiles) {
    networkOrders       += profile.total_orders;
    networkRefundClaims += profile.total_refund_claims;

    for (const mid of profile.merchant_ids as string[]) {
      if (mid !== requestingMerchantId) merchantSet.add(mid);
    }

    // Track which identifier types contributed to the match (for §5.1 cap)
    if (normEmail   && (profile.emails      as string[]).includes(normEmail))   usedTypes.push('email');
    if (normAddress && (profile.addresses   as string[]).includes(normAddress)) usedTypes.push('address');
    if (normCard    && (profile.card_last4s as string[]).includes(normCard))    usedTypes.push('payment');
    if (normIP      && (profile.ips         as string[]).includes(normIP))      usedTypes.push('ip');
  }

  const networkMerchantCount = merchantSet.size;
  const inrRate = networkOrders > 0 ? networkRefundClaims / networkOrders : 0;

  let score = 30 + Math.round(inrRate * 40);
  score = Math.min(score, 70);

  // Privacy invariant: reasoning contains only COUNTS, never merchant names
  const reason = `This identity has been observed at ${networkMerchantCount} other merchant${networkMerchantCount !== 1 ? 's' : ''} in the Unauth network with ${Math.round(inrRate * 100)}% 'item not received' claim rate.`;

  return {
    name: 'crossMerchant',
    fired: true,
    score,
    reason,
    evidence: {
      networkMerchantCount,
      networkOrders,
      networkRefundClaims,
      inrRate,
      matchedProfileCount: matchingProfiles.length,
    },
    identifierTypesUsed: [...new Set(usedTypes)],
  };
}
