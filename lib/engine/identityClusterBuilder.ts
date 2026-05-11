/**
 * identityClusterBuilder.ts
 *
 * Builds an IdentityClusterMap from a pre-computed LinkerResult — avoiding
 * the need to run linkIdentities() a second time when the caller already
 * has a LinkerResult available.
 *
 * This is a performance helper extracted so that worker.ts can call
 * linkIdentities() exactly once per chunk instead of twice (once here, once
 * inside buildIdentityClusters in identityMatching.ts).
 *
 * Logic mirrors identityMatching.ts :: buildIdentityClusters exactly.
 * identityMatching.ts is frozen so the duplicated helpers live here instead.
 */

import type { NormalisedOrder } from './types';
import type { LinkerResult, LinkerSignal } from '../linker';

export interface IdentityCluster {
  clusterId: string;
  entityType: string;
  entityValue: string;
  confidence: number;
  matchReasons: string[];
  firstSeen: string;
  lastSeen: string;
}

export type IdentityClusterMap = Record<string, IdentityCluster | null>;

// ---------------------------------------------------------------------------
// Internal helpers (mirrors identityMatching.ts — kept in sync manually)
// ---------------------------------------------------------------------------

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

function extractRawIds(order: NormalisedOrder): OrderRawIds {
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

function chooseAnchor(
  signals: LinkerSignal[],
  members: NormalisedOrder[]
): { entityType: string; entityValue: string } {
  const sigSet = new Set(signals);
  const firstWith = (pred: (ids: OrderRawIds) => string | null | undefined) => {
    for (const m of members) {
      const ids = extractRawIds(m);
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

const SIGNAL_PHRASES: Partial<Record<LinkerSignal, string>> = {
  card: 'Same payment card (BIN + last 4) shared across orders',
  phone: 'Same phone number shared across orders',
  device: 'Same device fingerprint shared across orders',
  account: 'Same merchant account ID shared across orders',
  email: 'Same email base (dots/aliases ignored) shared across orders',
  postcode: 'Same postcode shared across orders',
  ip: 'Same IP address shared across orders (corroborating signal only)',
  name: 'Same customer name shared across orders',
  shipping_address: 'Same shipping address shared across orders',
  billing_address: 'Same billing address shared across orders',
};

function reasonsFromSignals(signals: LinkerSignal[]): string[] {
  return signals.map((s) => SIGNAL_PHRASES[s] ?? s);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build an IdentityClusterMap from an already-computed LinkerResult.
 *
 * Identical output to buildIdentityClusters() in identityMatching.ts but
 * accepts an externally-computed LinkerResult so the caller can share a
 * single linkIdentities() invocation.
 */
export function buildIdentityClusterMapFromLinkerResult(
  orders: NormalisedOrder[],
  linkerResult: LinkerResult
): IdentityClusterMap {
  const { clusters } = linkerResult;

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

  // §6 — Same-email fallback clustering (mirrors identityMatching.ts exactly)
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
    const hasMissing = emailOrders.some((o) => map[o.orderId] === null);
    if (!hasMissing) continue;

    const existing = emailOrders.map((o) => map[o.orderId]).find((c) => c !== null) ?? null;
    const syntheticClusterId = existing?.clusterId ?? crypto.randomUUID();
    const record: IdentityCluster = existing ?? {
      clusterId: syntheticClusterId,
      entityType: 'email',
      entityValue: normEmail,
      confidence: 60,
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
