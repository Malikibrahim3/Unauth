import type { NormalisedOrder } from './types';
import type { LinkerResult } from '../linker';
import { CONFIDENCE_THRESHOLDS } from './weights';

export interface MergedHistory {
  /** Primary lookup: emailHash → combined order history for all cluster members */
  byEmailHash: Map<string, NormalisedOrder[]>;
}

/**
 * Merges customerOrderHistory entries across linker clusters so that
 * behavioural signals (velocity, refundRate, refundPattern, etc.) see the
 * full shared history of a fraud ring rather than just one email's orders.
 *
 * Only clusters whose confidence_score meets confidenceFloor are merged.
 * Below the floor the cluster is too uncertain to risk contaminating histories.
 *
 * The returned map is safe to layer on top of an existing customerOrderHistory:
 *   for (const [eh, hist] of merged.byEmailHash) context.customerOrderHistory.set(eh, hist);
 */
export function mergeHistoryByCluster(
  orders: NormalisedOrder[],
  linkerResult: LinkerResult,
  confidenceFloor: number = CONFIDENCE_THRESHOLDS.PROBABLE,
): MergedHistory {
  // Build a lookup from orderId → order for O(1) access
  const orderById = new Map<string, NormalisedOrder>();
  for (const o of orders) orderById.set(o.orderId, o);

  // Collect per-emailHash order lists (same as buildContext baseline)
  const baseHistory = new Map<string, NormalisedOrder[]>();
  for (const o of orders) {
    const arr = baseHistory.get(o.emailHash) ?? [];
    arr.push(o);
    baseHistory.set(o.emailHash, arr);
  }

  // For each high-confidence cluster, union all member emailHashes into one history
  for (const cluster of linkerResult.clusters) {
    if (cluster.confidence_score < confidenceFloor) continue;

    // Gather all orders in this cluster
    const clusterOrders: NormalisedOrder[] = [];
    for (const oid of cluster.order_ids) {
      const o = orderById.get(oid);
      if (o) clusterOrders.push(o);
    }
    if (clusterOrders.length === 0) continue;

    // Collect the set of distinct emailHashes in this cluster
    const emailHashes = new Set<string>();
    for (const o of clusterOrders) emailHashes.add(o.emailHash);

    if (emailHashes.size < 2) continue; // nothing to merge

    // Build the merged history as the union of all per-hash histories
    const merged: NormalisedOrder[] = [];
    const seen = new Set<string>();
    for (const eh of emailHashes) {
      for (const o of (baseHistory.get(eh) ?? [])) {
        if (!seen.has(o.orderId)) {
          seen.add(o.orderId);
          merged.push(o);
        }
      }
    }

    // Point every emailHash in the cluster at the merged history
    for (const eh of emailHashes) {
      baseHistory.set(eh, merged);
    }
  }

  return { byEmailHash: baseHistory };
}
