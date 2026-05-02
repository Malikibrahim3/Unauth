import { createHash } from 'node:crypto';
import type { NormalisedOrder } from './types';
import type { FastScoringContext, FraudEntity } from './fastContext';
import type { IdentityAlert } from './types';

interface IdentityCluster {
  clusterId: string;
  entityType: string;
  entityValue: string;
  confidence: number;
  matchReasons: string[];
  firstSeen: string;
  lastSeen: string;
}

export interface IdentityClusterMap {
  [orderId: string]: IdentityCluster | null;
}

// Helper: Normalize address for fuzzy matching
function normalizeAddress(address: string): string {
  return address
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Helper: Check if addresses are similar (fuzzy match)
function addressesSimilar(addr1: string, addr2: string): boolean {
  const norm1 = normalizeAddress(addr1);
  const norm2 = normalizeAddress(addr2);

  if (norm1 === norm2) return true;

  // Simple word overlap check
  const words1 = new Set(norm1.split(' '));
  const words2 = new Set(norm2.split(' '));

  const intersection = new Set(Array.from(words1).filter((x) => words2.has(x)));
  const union = new Set([...Array.from(words1), ...Array.from(words2)]);

  return intersection.size / union.size > 0.6; // 60% similarity threshold
}

// Helper: Extract email domain
function getEmailDomain(email: string): string {
  const parts = email.toLowerCase().split('@');
  return parts.length > 1 ? parts[1] : '';
}

// Helper: Check if order values are within 10%
function valuesWithin10Percent(val1: number, val2: number): boolean {
  const avg = (val1 + val2) / 2;
  if (avg === 0) return val1 === val2;
  const diff = Math.abs(val1 - val2);
  return diff / avg <= 0.1;
}

// Helper: Extract item category from order (simplified - would need product catalog in production)
function getItemCategory(order: NormalisedOrder): string {
  if (order.orderTotal < 50) return 'low_value';
  if (order.orderTotal < 200) return 'mid_value';
  return 'high_value';
}

// Stable cluster_id derived from the strongest matched entity. Two orders
// matched through the same entity get the same cluster_id, and re-running the
// pipeline produces the same id — so fraud_identity_clusters is not bloated by
// reprocessing (the previous implementation used crypto.randomUUID() per
// order, producing a fresh row every time).
function deterministicClusterId(entityType: string, entityValue: string): string {
  const h = createHash('sha256').update(`${entityType}:${entityValue}`).digest('hex');
  // Format as a UUIDv4-ish string so the column type stays compatible
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

interface RawIdentifiers {
  email: string;
  ip: string;
  address: string;
  card: string;
  name: string;
}

function extractRawIdentifiers(order: NormalisedOrder): RawIdentifiers {
  const o = order as NormalisedOrder & {
    _rawEmail?: string;
    _rawIP?: string | null;
    _rawAddress?: string | null;
    _rawCardLast4?: string | null;
  };
  return {
    email: o._rawEmail?.toLowerCase().trim() ?? '',
    ip: o._rawIP?.trim().toLowerCase() ?? '',
    address: o._rawAddress?.trim().toLowerCase() ?? '',
    card: o._rawCardLast4?.trim() ?? '',
    name: order.customerNameNorm?.trim() ?? '',
  };
}

// In-batch peer match: shared identifier types between this order and another
// order in the same batch. IP alone is intentionally insufficient — see the
// constraint comment in matchInBatch().
interface PeerOverlap {
  peerOrderId: string;
  peerEmail: string;
  sharedTypes: Set<'ip' | 'address' | 'card' | 'name'>;
  reasons: string[];
  // Strongest entity used to anchor the cluster_id.
  anchorType: 'card_last4' | 'address' | 'ip';
  anchorValue: string;
}

/**
 * Find an in-batch peer that shares enough identifiers with this order to
 * justify clustering, returning the strongest match.
 *
 * IP-ONLY CONSTRAINT (critical):
 *   IP can be shared by genuinely unrelated customers via NAT, mobile
 *   carriers, shared office networks, VPNs, and CGNAT. We never cluster two
 *   orders on IP alone. A peer with only `ip` in sharedTypes is rejected.
 *   This mirrors the IP-only downgrade in scoreBatch (lib/engine/fastScore.ts
 *   §5.2).
 */
function matchInBatch(
  order: NormalisedOrder,
  ids: RawIdentifiers,
  indexes: {
    byIp: Map<string, NormalisedOrder[]>;
    byAddress: Map<string, NormalisedOrder[]>;
    byCard: Map<string, NormalisedOrder[]>;
    byName: Map<string, NormalisedOrder[]>;
  }
): PeerOverlap | null {
  const peerMap = new Map<string, PeerOverlap>();

  const addOverlap = (
    peer: NormalisedOrder,
    type: 'ip' | 'address' | 'card' | 'name',
    reason: string
  ) => {
    if (peer.orderId === order.orderId) return;
    const peerIds = extractRawIdentifiers(peer);
    // Only treat the peer as a candidate match if at least one identifier
    // (the email itself) actually differs — otherwise the same identity has
    // simply placed multiple orders, which is not a "cluster".
    if (peerIds.email && peerIds.email === ids.email) return;
    let entry = peerMap.get(peer.orderId);
    if (!entry) {
      entry = {
        peerOrderId: peer.orderId,
        peerEmail: peerIds.email,
        sharedTypes: new Set(),
        reasons: [],
        anchorType: 'ip',
        anchorValue: ids.ip || ids.address || ids.card,
      };
      peerMap.set(peer.orderId, entry);
    }
    if (!entry.sharedTypes.has(type)) {
      entry.sharedTypes.add(type);
      entry.reasons.push(reason);
    }
  };

  if (ids.ip) {
    for (const peer of indexes.byIp.get(ids.ip) ?? []) {
      addOverlap(peer, 'ip', `Same IP address (${ids.ip}) seen on another order in this batch`);
    }
  }
  if (ids.address) {
    for (const peer of indexes.byAddress.get(ids.address) ?? []) {
      addOverlap(peer, 'address', 'Same shipping address used by another customer in this batch');
    }
  }
  if (ids.card) {
    for (const peer of indexes.byCard.get(ids.card) ?? []) {
      addOverlap(peer, 'card', 'Same payment card last 4 digits used by another customer in this batch');
    }
  }
  if (ids.name) {
    for (const peer of indexes.byName.get(ids.name) ?? []) {
      addOverlap(peer, 'name', 'Same customer name used by another email address in this batch');
    }
  }

  // Score each peer and pick the strongest. IP-only peers are skipped — they
  // would otherwise allow shared-network orders (NAT, carrier, office) to be
  // clustered as the same identity, which damages merchant trust.
  let best: { peer: PeerOverlap; confidence: number } | null = null;

  for (const peer of Array.from(peerMap.values())) {
    const types = peer.sharedTypes;

    // Hard rejection: IP alone is not sufficient corroboration.
    if (types.size === 1 && types.has('ip')) continue;

    let confidence = 0;
    let anchorType: 'card_last4' | 'address' | 'ip' = 'ip';
    let anchorValue = ids.ip;

    if (types.has('card') && types.has('address')) {
      confidence = 90;                                // strong: card + address
      anchorType = 'card_last4';
      anchorValue = ids.card;
    } else if (types.has('ip') && types.has('address') && types.has('name')) {
      confidence = 92;                                // strong: ip + address + name
      anchorType = 'address';
      anchorValue = ids.address;
    } else if (types.has('ip') && types.has('address')) {
      confidence = 85;                                // strong: ip + address (Alice/Bob synthetic case)
      anchorType = 'address';
      anchorValue = ids.address;
    } else if (types.has('address') && types.has('name')) {
      confidence = 80;                                // strong: address + name (different email)
      anchorType = 'address';
      anchorValue = ids.address;
    } else if (types.has('card')) {
      confidence = 80;                                // card last4 alone (different email/name)
      anchorType = 'card_last4';
      anchorValue = ids.card;
    } else if (types.has('address')) {
      confidence = 65;                                // address alone (different email)
      anchorType = 'address';
      anchorValue = ids.address;
    } else if (types.has('ip') && types.has('name')) {
      confidence = 60;                                // ip + name (no address)
      anchorType = 'ip';
      anchorValue = ids.ip;
    } else if (types.has('name')) {
      confidence = 35;                                // name alone — weak
      anchorType = 'address';
      anchorValue = ids.address || ids.ip;
    } else {
      continue;
    }

    if (!best || confidence > best.confidence) {
      best = { peer: { ...peer, anchorType, anchorValue }, confidence };
    }
  }

  return best?.peer ?? null;
}

export async function buildIdentityClusters(
  orders: NormalisedOrder[],
  ctx: FastScoringContext
): Promise<IdentityClusterMap> {
  const clusterMap: IdentityClusterMap = {};

  // ---------------------------------------------------------------------
  // In-batch indexes — built once, reused for every order.
  // The previous implementation only matched against historical Supabase
  // entities, which meant two orders that arrived in the same upload
  // sharing IP+address could not be linked unless one was already in
  // history. That blind spot let the most obvious duplicate-identity
  // pattern (refund-fraud rings uploading bursts of orders) slip through.
  // ---------------------------------------------------------------------
  const byIp = new Map<string, NormalisedOrder[]>();
  const byAddress = new Map<string, NormalisedOrder[]>();
  const byCard = new Map<string, NormalisedOrder[]>();
  const byName = new Map<string, NormalisedOrder[]>();

  for (const o of orders) {
    const ids = extractRawIdentifiers(o);
    if (ids.ip) (byIp.get(ids.ip) ?? byIp.set(ids.ip, []).get(ids.ip)!).push(o);
    if (ids.address) (byAddress.get(ids.address) ?? byAddress.set(ids.address, []).get(ids.address)!).push(o);
    if (ids.card) (byCard.get(ids.card) ?? byCard.set(ids.card, []).get(ids.card)!).push(o);
    if (ids.name) (byName.get(ids.name) ?? byName.set(ids.name, []).get(ids.name)!).push(o);
  }

  for (const order of orders) {
    const ids = extractRawIdentifiers(order);

    if (!ids.email) {
      clusterMap[order.orderId] = null;
      continue;
    }

    let matchedCluster: IdentityCluster | null = null;
    const now = new Date().toISOString();

    // -------------------------------------------------------------------
    // Pass 1 — In-batch peer match.
    // Always considered first because the batch is the freshest evidence
    // and historical maps may not contain identifiers seen for the first
    // time in this upload.
    // -------------------------------------------------------------------
    const peer = matchInBatch(order, ids, { byIp, byAddress, byCard, byName });
    if (peer) {
      const clusterId = deterministicClusterId(peer.anchorType, peer.anchorValue);
      matchedCluster = {
        clusterId,
        entityType: peer.anchorType,
        entityValue: peer.anchorValue,
        confidence: scoreFromTypes(peer.sharedTypes),
        matchReasons: peer.reasons,
        firstSeen: now,
        lastSeen: now,
      };
    }

    // -------------------------------------------------------------------
    // Pass 2 — Historical match (preserved from prior implementation,
    // refactored to use deterministic cluster_ids). Skipped if a strong
    // in-batch match already exists; otherwise considered as an
    // alternative or upgrade.
    // -------------------------------------------------------------------
    matchedCluster = strongestOf(matchedCluster, historicalMatch(order, ids, ctx, now));

    clusterMap[order.orderId] = matchedCluster;
  }

  return clusterMap;
}

function scoreFromTypes(types: Set<'ip' | 'address' | 'card' | 'name'>): number {
  if (types.has('card') && types.has('address')) return 90;
  if (types.has('ip') && types.has('address') && types.has('name')) return 92;
  if (types.has('ip') && types.has('address')) return 85;
  if (types.has('address') && types.has('name')) return 80;
  if (types.has('card')) return 80;
  if (types.has('address')) return 65;
  if (types.has('ip') && types.has('name')) return 60;
  if (types.has('name')) return 35;
  return 0;
}

function strongestOf(
  a: IdentityCluster | null,
  b: IdentityCluster | null
): IdentityCluster | null {
  if (!a) return b;
  if (!b) return a;
  return b.confidence > a.confidence ? b : a;
}

function historicalMatch(
  order: NormalisedOrder,
  ids: RawIdentifiers,
  ctx: FastScoringContext,
  now: string
): IdentityCluster | null {
  // Priority 1 — Hard match (95): same card + email-was-different historically.
  if (ids.card) {
    const cardRecord = ctx.historicalCardMap.get(ids.card);
    if (cardRecord) {
      // If the historical card has been seen with email(s) other than this one,
      // that's the strong "stolen card / shared payment" signal.
      let differentEmailExists = false;
      for (const [emailValue] of Array.from(ctx.historicalEmailMap.entries())) {
        if (emailValue && emailValue !== ids.email) {
          differentEmailExists = true;
          break;
        }
      }
      if (differentEmailExists) {
        return {
          clusterId: deterministicClusterId('card_last4', ids.card),
          entityType: 'card_last4',
          entityValue: ids.card,
          confidence: 95,
          matchReasons: ['Same payment card previously used with a different email address'],
          firstSeen: cardRecord.first_seen,
          lastSeen: cardRecord.last_seen,
        };
      }
    }
  }

  // Priority 2a — Strong (92): same IP + same shipping address (history).
  if (ids.ip && ids.address) {
    const ipRecord = ctx.historicalIPMap.get(ids.ip);
    let addressRecord: FraudEntity | undefined = ctx.historicalAddressMap.get(ids.address);
    if (!addressRecord) {
      const norm = normalizeAddress(ids.address);
      for (const [addrValue, addrRec] of Array.from(ctx.historicalAddressMap.entries())) {
        if (normalizeAddress(addrValue) === norm) {
          addressRecord = addrRec;
          break;
        }
      }
    }
    if (ipRecord && addressRecord) {
      return {
        clusterId: deterministicClusterId('address', ids.address),
        entityType: 'ip',
        entityValue: ids.ip,
        confidence: 92,
        matchReasons: ['Same IP address and shipping address as a previous customer'],
        firstSeen: ipRecord.first_seen,
        lastSeen: ipRecord.last_seen,
      };
    }
  }

  // Priority 2b — Strong (88): same card + same shipping address (history).
  if (ids.card && ids.address) {
    const cardRecord = ctx.historicalCardMap.get(ids.card);
    const addressRecord = ctx.historicalAddressMap.get(ids.address);
    if (cardRecord && addressRecord) {
      return {
        clusterId: deterministicClusterId('card_last4', ids.card),
        entityType: 'card_last4',
        entityValue: ids.card,
        confidence: 88,
        matchReasons: ['Same payment card and shipping address as a previous customer'],
        firstSeen: cardRecord.first_seen,
        lastSeen: cardRecord.last_seen,
      };
    }
  }

  // Priority 3 — Probable (70): same IP + fuzzy-similar address (history).
  if (ids.ip && ids.address) {
    for (const [addrValue, addrRec] of Array.from(ctx.historicalAddressMap.entries())) {
      if (addressesSimilar(ids.address, addrValue)) {
        return {
          clusterId: deterministicClusterId('address', addrValue),
          entityType: 'ip',
          entityValue: ids.ip,
          confidence: 70,
          matchReasons: ['Same IP address with a similar shipping address to a previous customer'],
          firstSeen: addrRec.first_seen,
          lastSeen: addrRec.last_seen,
        };
      }
    }
  }

  // Priority 4 — Probable (65): same IP + same email domain (history).
  if (ids.ip && ids.email) {
    const ipRecord = ctx.historicalIPMap.get(ids.ip);
    if (ipRecord) {
      const domain = getEmailDomain(ids.email);
      for (const [emailValue, emailRec] of Array.from(ctx.historicalEmailMap.entries())) {
        if (emailValue !== ids.email && getEmailDomain(emailValue) === domain) {
          return {
            clusterId: deterministicClusterId('ip', ids.ip),
            entityType: 'ip',
            entityValue: ids.ip,
            confidence: 65,
            matchReasons: ['Same IP address previously used with an email from the same domain'],
            firstSeen: emailRec.first_seen,
            lastSeen: emailRec.last_seen,
          };
        }
      }
    }
  }

  // Priority 5 — Possible (50): same address + similar order value/category.
  if (ids.address) {
    for (const [addrValue, addrRec] of Array.from(ctx.historicalAddressMap.entries())) {
      if (normalizeAddress(addrValue) !== normalizeAddress(ids.address)) continue;
      for (const otherOrder of ctx.allOrders) {
        if (otherOrder.orderId === order.orderId) continue;
        const otherIds = extractRawIdentifiers(otherOrder);
        if (otherIds.address === ids.address) continue;
        if (
          valuesWithin10Percent(order.orderTotal, otherOrder.orderTotal) &&
          getItemCategory(order) === getItemCategory(otherOrder)
        ) {
          return {
            clusterId: deterministicClusterId('address', ids.address),
            entityType: 'address',
            entityValue: ids.address,
            confidence: 50,
            matchReasons: ['Similar shipping address, order value, and item type to a previous customer'],
            firstSeen: addrRec.first_seen,
            lastSeen: addrRec.last_seen,
          };
        }
      }
    }
  }

  // Priority 6 — Weak (35): IP previously associated with flagged accounts.
  // Despite the IP-alone constraint, this is allowed because the corroboration
  // comes from a *historical* signal (flagged_count >= 2 means the IP has
  // been linked to confirmed bad actors before, not just any neighbour on the
  // same network). It is also the lowest tier and capped at 'weak' downstream.
  if (ids.ip) {
    const ipRecord = ctx.historicalIPMap.get(ids.ip);
    if (ipRecord && ipRecord.flagged_count >= 2) {
      return {
        clusterId: deterministicClusterId('ip', ids.ip),
        entityType: 'ip',
        entityValue: ids.ip,
        confidence: 35,
        matchReasons: ['IP address previously associated with flagged accounts'],
        firstSeen: ipRecord.first_seen,
        lastSeen: ipRecord.last_seen,
      };
    }
  }

  return null;
}

export function generateIdentityAlert(
  order: NormalisedOrder,
  cluster: IdentityCluster | null,
  ctx: FastScoringContext
): IdentityAlert {
  if (!cluster) {
    return {
      hasMatch: false,
      confidence: 0,
      matchReasons: [],
      historicalRiskSummary: null,
      recommendation: 'review',
    };
  }

  const rawEmail = (order as NormalisedOrder & { _rawEmail?: string })._rawEmail?.toLowerCase();

  let historicalRiskSummary = null;
  const entityRecord =
    ctx.historicalEmailMap.get(rawEmail || '') ||
    ctx.historicalIPMap.get(cluster.entityValue) ||
    ctx.historicalAddressMap.get(cluster.entityValue) ||
    ctx.historicalCardMap.get(cluster.entityValue);

  if (entityRecord && entityRecord.total_orders > 0) {
    historicalRiskSummary = {
      totalPreviousOrders: entityRecord.total_orders,
      totalRefundClaims: entityRecord.total_refund_claims,
      totalChargebacks: entityRecord.total_chargebacks,
      refundRate: entityRecord.total_orders > 0 ? entityRecord.total_refund_claims / entityRecord.total_orders : 0,
      // Use ?? not || so a real 0-day claim isn't squashed to null
      avgDaysToClaim: entityRecord.fastest_claim_days ?? null,
      merchantsSeenAt: entityRecord.total_merchants,
    };
  }

  let recommendation: 'review' | 'flag' | 'block' = 'review';
  if (cluster.confidence >= 80 && historicalRiskSummary) {
    if (historicalRiskSummary.totalChargebacks >= 2 || historicalRiskSummary.refundRate > 0.5) {
      recommendation = 'block';
    } else if (historicalRiskSummary.totalChargebacks >= 1 || historicalRiskSummary.refundRate > 0.3) {
      recommendation = 'flag';
    } else {
      recommendation = 'review';
    }
  } else if (cluster.confidence >= 70 && historicalRiskSummary) {
    if (historicalRiskSummary.totalChargebacks >= 1 || historicalRiskSummary.refundRate > 0.3) {
      recommendation = 'flag';
    } else {
      recommendation = 'review';
    }
  } else if (cluster.confidence >= 40) {
    recommendation = 'review';
  }

  return {
    hasMatch: true,
    confidence: cluster.confidence,
    matchReasons: cluster.matchReasons,
    historicalRiskSummary,
    recommendation,
  };
}
