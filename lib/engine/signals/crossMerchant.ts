/**
 * Cross-Merchant Signal — §1.2
 *
 * Queries customer_profiles for identities seen at 3+ merchants (k-anonymity
 * gate) that also appear in the current order. Fires when the same identity
 * has been observed at other merchants in the Unauth network.
 *
 * Privacy invariants:
 *   - reasoning strings NEVER contain merchant names, only counts
 *   - match keys are HMAC hashes stored on customer_profiles (email_hashes, etc.)
 *   - only profiles with merchant_count >= 3 are eligible (k-anon gate)
 *   - the requesting merchant's own history is excluded from the aggregate
 */

import type { SignalResult } from '../types';
import type { CrossMerchantProfile, PendingAuditLog } from '../fastContext';

export interface CrossMerchantInput {
  /** HMAC hash of normalised email (order.emailHash). */
  emailHash: string | null;
  /** HMAC hash of normalised IP (order.ipHash). */
  ipHash: string | null;
  /** HMAC hash of normalised address (order.addressHash). */
  addressHash: string | null;
  /** HMAC hash of card last4 (order.cardLast4). */
  cardHash: string | null;
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

function hashArrayIncludes(arr: unknown, value: string): boolean {
  return Array.isArray(arr) && (arr as string[]).includes(value);
}

function profileMatchesHash(
  profile: CrossMerchantProfile,
  field: 'email' | 'ip' | 'address' | 'card',
  hash: string
): boolean {
  switch (field) {
    case 'email':
      return hashArrayIncludes(profile.email_hashes, hash);
    case 'ip':
      return hashArrayIncludes(profile.ip_hashes, hash);
    case 'address':
      return hashArrayIncludes(profile.address_hashes, hash);
    case 'card':
      return hashArrayIncludes(profile.card_hashes, hash);
    default:
      return false;
  }
}

/**
 * Pure, testable implementation of the cross-merchant signal.
 * All DB I/O has been moved to buildFastContext; this function is synchronous.
 */
export function computeCrossMerchantSignal(input: CrossMerchantInput): SignalResult {
  const {
    emailHash,
    ipHash,
    addressHash,
    cardHash,
    requestingMerchantId,
    profiles,
    pendingAuditLogs,
  } = input;

  const queriedHashes = [emailHash, ipHash, addressHash, cardHash].filter((v): v is string => Boolean(v));

  const matchingProfiles = profiles.filter((profile) => {
    if ((profile.merchant_ids as string[]).includes(requestingMerchantId)) {
      return false;
    }
    return (
      (emailHash && profileMatchesHash(profile, 'email', emailHash)) ||
      (addressHash && profileMatchesHash(profile, 'address', addressHash)) ||
      (cardHash && profileMatchesHash(profile, 'card', cardHash)) ||
      (ipHash && profileMatchesHash(profile, 'ip', ipHash))
    );
  });

  const kAnonSatisfied = matchingProfiles.length > 0;
  const matchedMerchantCount = kAnonSatisfied
    ? matchingProfiles.reduce((max, p) => Math.max(max, p.total_merchants_seen_at), 0)
    : 0;

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

  let networkOrders = 0;
  let networkRefundClaims = 0;
  const merchantSet = new Set<string>();
  const usedTypes: string[] = [];

  for (const profile of matchingProfiles) {
    networkOrders += profile.total_orders;
    networkRefundClaims += profile.total_refund_claims;

    for (const mid of profile.merchant_ids as string[]) {
      if (mid !== requestingMerchantId) merchantSet.add(mid);
    }

    if (emailHash && profileMatchesHash(profile, 'email', emailHash)) usedTypes.push('email');
    if (addressHash && profileMatchesHash(profile, 'address', addressHash)) usedTypes.push('address');
    if (cardHash && profileMatchesHash(profile, 'card', cardHash)) usedTypes.push('payment');
    if (ipHash && profileMatchesHash(profile, 'ip', ipHash)) usedTypes.push('ip');
  }

  const networkMerchantCount = merchantSet.size;
  const inrRate = networkOrders > 0 ? networkRefundClaims / networkOrders : 0;

  let score = 30 + Math.round(inrRate * 40);
  score = Math.min(score, 70);

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
