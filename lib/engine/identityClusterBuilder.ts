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
import { extractRawIds, chooseAnchor, reasonsFromSignals } from './identityHelpers';

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

// extractRawIds, chooseAnchor, reasonsFromSignals imported from identityHelpers.ts

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

    let existing: IdentityCluster | null = null;
    for (const o of emailOrders) {
      const cluster = map[o.orderId];
      if (cluster !== null) {
        existing = cluster;
        break;
      }
    }
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
