import type { NormalisedOrder } from './types';
import type { FastScoringContext } from './fastContext';
import type { IdentityAlert } from './types';
import { linkIdentities, type LinkerOrderInput, type LinkerSignal } from '../linker';

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

/**
 * Raw identifiers lifted off a NormalisedOrder for downstream lookups.
 * These carry the canonical, non-hashed values written by csv/normalise.ts
 * through the `_rawEmail` / `_rawIP` / `_rawAddress` / `_rawCardLast4`
 * carry-through properties.
 */
interface OrderRawIds {
  email: string;
  ip: string;
  address: string;
  card: string;
  phone: string;
  postcode: string;
  device: string;
  account: string;
  billingAddress: string;
}

function extractOrderRawIds(order: NormalisedOrder): OrderRawIds {
  const o = order as NormalisedOrder & {
    _rawEmail?: string;
    _rawIP?: string | null;
    _rawAddress?: string | null;
    _rawCardLast4?: string | null;
    _rawPhone?: string | null;
    _rawPostcode?: string | null;
    _rawDevice?: string | null;
    _rawDeviceId?: string | null;
    _rawAccount?: string | null;
    _rawAccountId?: string | null;
    _rawBillingAddress?: string | null;
    _rawCardBin?: string | null;
  };
  return {
    email: o._rawEmail ?? '',
    ip: o._rawIP ?? '',
    address: o._rawAddress ?? '',
    card: o._rawCardLast4 ?? '',
    phone: o._rawPhone ?? '',
    postcode: o._rawPostcode ?? '',
    device: o._rawDevice ?? o._rawDeviceId ?? '',
    account: o._rawAccount ?? o._rawAccountId ?? '',
    billingAddress: o._rawBillingAddress ?? '',
  };
}

/**
 * Choose a stable anchor (entityType, entityValue) for a cluster so that
 * downstream consumers (generateIdentityAlert, fraud_identity_clusters
 * upserts) can look the cluster up in the historical maps. The anchor
 * priority mirrors the linker signal strength order: card → phone →
 * device → account → email → postcode → ip.
 *
 * Values are taken from the FIRST member order's raw fields and therefore
 * use the same normalisation that populates ctx.historical*Map — do NOT
 * substitute the linker's own normalised form here.
 */
function chooseAnchor(
  signals: Set<LinkerSignal> | LinkerSignal[],
  members: NormalisedOrder[]
): { entityType: string; entityValue: string } {
  const sigSet = signals instanceof Set ? signals : new Set(signals);
  const firstWith = (pred: (ids: OrderRawIds) => string | null | undefined) => {
    for (const m of members) {
      const ids = extractOrderRawIds(m);
      const v = pred(ids);
      if (v) return v;
    }
    return '';
  };

  if (sigSet.has('card')) {
    const v = firstWith((i) => (i.card ? i.card.replace(/\D/g, '').slice(-4) : ''));
    if (v) return { entityType: 'card_last4', entityValue: v };
  }
  if (sigSet.has('phone')) {
    const v = firstWith((i) => (i.phone ? i.phone.replace(/\D/g, '').slice(-10) : ''));
    if (v) return { entityType: 'phone', entityValue: v };
  }
  if (sigSet.has('device')) {
    const v = firstWith((i) => i.device);
    if (v) return { entityType: 'device', entityValue: v };
  }
  if (sigSet.has('account')) {
    const v = firstWith((i) => i.account);
    if (v) return { entityType: 'account_id', entityValue: v };
  }
  if (sigSet.has('email')) {
    const v = firstWith((i) => (i.email ? i.email.toLowerCase().trim() : ''));
    if (v) return { entityType: 'email', entityValue: v };
  }
  if (sigSet.has('postcode')) {
    const v = firstWith((i) => (i.postcode ? i.postcode.toUpperCase().replace(/\s+/g, '') : ''));
    if (v) return { entityType: 'postcode', entityValue: v };
  }
  if (sigSet.has('ip')) {
    const v = firstWith((i) => i.ip);
    if (v) return { entityType: 'ip', entityValue: v };
  }
  return { entityType: 'unknown', entityValue: '' };
}

/**
 * Render a human-readable reason list from the matched signals. Consumed by
 * generateIdentityAlert and the fraud_identity_clusters UI.
 */
function reasonsFromSignals(signals: LinkerSignal[]): string[] {
  const PHRASES: Record<LinkerSignal, string> = {
    card: 'Same payment card (BIN + last 4) shared across orders',
    phone: 'Same phone number shared across orders',
    device: 'Same device fingerprint shared across orders',
    account: 'Same merchant account ID shared across orders',
    email: 'Same email base (dots/aliases ignored) shared across orders',
    postcode: 'Same postcode shared across orders',
    ip: 'Same IP address shared across orders (corroborating signal only)',
  };
  return signals.map((s) => PHRASES[s]);
}

/**
 * Build a per-order identity cluster map for an in-memory batch.
 *
 * This function is a thin adapter over `lib/linker.ts`. The linker does the
 * real work — normalise, index, score pairs, union-find — and returns
 * clusters in a clean shape. We translate those clusters into the
 * IdentityClusterMap contract that worker.ts / fastScore.ts expect.
 *
 * Historical enrichment (fraud_entities / customer_profiles lookups) is
 * deliberately NOT performed here anymore. The linker does one job —
 * in-batch identity linking. Historical risk data is still consumed
 * separately by `generateIdentityAlert` below, which reads
 * ctx.historical*Map via the cluster's entityValue.
 *
 * The `ctx` parameter is kept for backwards-compatible call sites (worker.ts
 * passes it) but is intentionally unused by the linker itself — mark with
 * `void` so lints stay clean.
 */
export async function buildIdentityClusters(
  orders: NormalisedOrder[],
  ctx: FastScoringContext
): Promise<IdentityClusterMap> {
  void ctx;

  // Build linker inputs from the raw fields we plumbed through csv/normalise.ts.
  // billing_address is intentionally skipped — the linker uses shipping
  // postcode (and explicit device/account/card/phone) for linking, not
  // addresses.
  const linkerInput: LinkerOrderInput[] = orders.map((o) => {
    const ids = extractOrderRawIds(o);
    const x = o as NormalisedOrder & { _rawCardBin?: string | null };
    return {
      order_id: o.orderId,
      email: ids.email || null,
      phone: ids.phone || null,
      address: ids.address || null,
      // Extract postcode from the explicit column if present; otherwise try
      // the trailing token of the address (UK postcodes conventionally sit
      // at the end of the shipping_address string).
      postcode: ids.postcode || postcodeFromAddress(ids.address) || null,
      ip: ids.ip || null,
      card_last4: ids.card || null,
      card_bin: x._rawCardBin ?? null,
      device_fingerprint: ids.device || null,
      account_id: ids.account || null,
    };
  });

  const linkerResult = linkIdentities(linkerInput);
  const { clusters } = linkerResult;

  // Build an order_id → cluster index for quick lookup.
  const memberById = new Map<string, NormalisedOrder>();
  for (const o of orders) memberById.set(o.orderId, o);

  const now = new Date().toISOString();
  const map: IdentityClusterMap = {};
  for (const o of orders) map[o.orderId] = null;

  for (const cluster of clusters) {
    const members = cluster.order_ids
      .map((id) => memberById.get(id))
      .filter((m): m is NormalisedOrder => !!m);
    if (members.length < 2) continue;

    const anchor = chooseAnchor(cluster.signals_matched, members);
    const record: IdentityCluster = {
      clusterId: cluster.cluster_id,
      entityType: anchor.entityType,
      entityValue: anchor.entityValue,
      confidence: cluster.confidence_score,
      matchReasons: reasonsFromSignals(cluster.signals_matched),
      firstSeen: now,
      lastSeen: now,
    };
    for (const id of cluster.order_ids) {
      map[id] = record;
    }
  }

  // §6 — Same-email fallback clustering
  // Orders from the same normalised email address are trivially the same
  // person, but the linker intentionally skips scoring same-raw-email pairs.
  // Without this pass, multi-order email groups never get a cluster_id, so
  // the UI can't group probable/possible rows together.
  // Only create a synthetic cluster when ≥2 orders share the email AND at
  // least one is not already in a cross-email identity cluster.
  const emailToOrders = new Map<string, NormalisedOrder[]>();
  for (const o of orders) {
    const rawEmail = (o as NormalisedOrder & { _rawEmail?: string })._rawEmail;
    if (!rawEmail) continue;
    const norm = rawEmail.toLowerCase().trim();
    const arr = emailToOrders.get(norm) ?? [];
    arr.push(o);
    emailToOrders.set(norm, arr);
  }

  for (const [normEmail, emailOrders] of emailToOrders) {
    if (emailOrders.length < 2) continue;
    // Only apply when at least one order in the group has no cluster yet.
    const hasMissing = emailOrders.some((o) => map[o.orderId] === null);
    if (!hasMissing) continue;

    // Find or create a cluster record for this email group.
    // Prefer an existing cross-email cluster if any member is already in one.
    const existing = emailOrders.map((o) => map[o.orderId]).find((c) => c !== null) ?? null;
    const syntheticClusterId = existing?.clusterId ?? `email-cluster:${normEmail}`;
    const record: IdentityCluster = existing ?? {
      clusterId: syntheticClusterId,
      entityType: 'email',
      entityValue: normEmail,
      confidence: 60, // moderate confidence for email-only grouping
      matchReasons: ['Same email address shared across orders'],
      firstSeen: now,
      lastSeen: now,
    };

    for (const o of emailOrders) {
      if (map[o.orderId] === null) {
        map[o.orderId] = record;
      }
    }
  }

  return map;
}

/**
 * Fallback: if the merchant didn't provide an explicit postcode column, try
 * to lift one from the trailing tokens of the shipping address. UK postcode
 * shape (ABC1 2DE / AB1 2CD / A1 2BC) is used as a heuristic; anything that
 * doesn't fit is ignored so we don't emit garbage postcodes.
 */
const UK_POSTCODE_RE = /\b([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})\b/i;
function postcodeFromAddress(address: string): string {
  if (!address) return '';
  const m = address.match(UK_POSTCODE_RE);
  return m ? m[1].toUpperCase().replace(/\s+/g, '') : '';
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
