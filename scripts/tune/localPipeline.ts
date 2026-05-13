/**
 * localPipeline.ts
 *
 * Orchestrates a full identity-resolution run for a batch of SyntheticOrders:
 *   1. Convert SyntheticOrders into LocalLinkerInput
 *   2. Run linkIdentitiesLocal (parameterised clone of lib/linker.ts)
 *   3. Assign a stable profileId per cluster (UUID minted from cluster_id)
 *   4. Return Map<order_id, profileId> for accuracy evaluation
 *
 * We deliberately bypass processProfilesForBatch / entityResolution.ts because
 * that function requires fully scored + normalised ScoredOrder objects (fastScore
 * pipeline, DB lookups, etc.) that are out-of-scope for this harness.  The LOCAL
 * LINKER clusters are the direct subject of tuning, so they are the correct
 * source of truth for accuracy measurement.
 */

import { randomUUID } from 'crypto';
import type { TuneConfig, SyntheticOrder } from './types';
import { linkIdentitiesLocal } from './localLinker';
import type { LocalLinkedPair } from './localLinker';
import type { MockStore, MockProfile } from './mockSupabase';

export interface PipelineResult {
  /** Map from order_id to profileId (cluster representative UUID) */
  orderToProfile: Map<string, string>;
  /** Total distinct profiles (clusters) */
  profileCount: number;
  /** Direct linked pair decisions emitted by the local linker. */
  linkedPairs: LocalLinkedPair[];
}

// ---------------------------------------------------------------------------
// Convert SyntheticOrder to LocalLinkerInput (snake_case, matches interface)
// ---------------------------------------------------------------------------

function toLinkerInput(orders: SyntheticOrder[]) {
  return orders.map(o => ({
    order_id:           o.order_id,
    email:              o.customer_email      ?? undefined,
    phone:              o.phone               ?? undefined,
    device_fingerprint: o.device_fingerprint  ?? undefined,
    ip:                 o.device_ip           ?? undefined,
    shipping_address:   o.shipping_address    ?? undefined,
    billing_address:    o.billing_address     ?? undefined,
    card_last4:         o.card_last4          ?? undefined,
    card_bin:           o.card_bin            ?? undefined,
    card_fingerprint:   o.card_fingerprint    ?? undefined,
    postcode:           o.postcode            ?? undefined,
    account_id:         o.account_id          ?? undefined,
    name:               o.customer_name       ?? undefined,
  }));
}

// ---------------------------------------------------------------------------
// Main pipeline entry point (synchronous — no DB I/O)
// ---------------------------------------------------------------------------

export function runLocalPipeline(
  orders: SyntheticOrder[],
  cfg: TuneConfig,
  store: MockStore,
): PipelineResult {
  store.reset();

  // Step 1: Run local linker
  const linkerInput = toLinkerInput(orders);
  const linkerResult = linkIdentitiesLocal(linkerInput, cfg);

  // Step 2: Build cluster_id to stable UUID map
  const clusterToProfile = new Map<string, string>();
  for (const cluster of linkerResult.clusters) {
    clusterToProfile.set(cluster.cluster_id, randomUUID());
  }

  // Step 3: Build order_id to profileId via linker cluster membership
  const orderToProfile = new Map<string, string>();
  for (const order of orders) {
    const clusterId = linkerResult.orderToCluster.get(order.order_id);
    if (clusterId !== undefined) {
      const profileId = clusterToProfile.get(clusterId);
      if (profileId) orderToProfile.set(order.order_id, profileId);
    } else {
      // Singleton — gets its own unique profile
      orderToProfile.set(order.order_id, randomUUID());
    }
  }

  // Step 4: Materialise lightweight MockProfile records in the store
  const now = new Date().toISOString();

  for (const [clusterId, profileId] of clusterToProfile) {
    const cluster = linkerResult.clusters.find(c => c.cluster_id === clusterId);
    const profile: MockProfile = {
      id: profileId,
      primary_email: null,
      emails: [],
      ips: [],
      addresses: [],
      card_last4s: [],
      phones: [],
      names: [],
      risk_score: 0,
      risk_level: 'low',
      fraud_flags: [],
      total_orders: cluster?.order_ids.length ?? 0,
      total_refund_claims: 0,
      total_chargebacks: 0,
      total_merchants_seen_at: 0,
      refund_rate: 0,
      refund_timestamps: [],
      fastest_claim_days: null,
      avg_claim_days: null,
      refund_acceleration_score: 0,
      merchant_ids: [],
      first_seen: now,
      last_seen: now,
      last_audit_id: null,
      profile_confidence: cluster?.confidence_score ?? 100,
      manually_reviewed: false,
      merchant_notes: null,
      on_watchlist: false,
      identity_confidence_grade: null,
      identity_signals_summary: cluster ? [...cluster.signals_matched] : [],
      identity_cluster_id: clusterId,
      identity_status: null,
    };
    store.profiles.set(profileId, profile);
  }

  // Singleton profiles (orders not part of any multi-order cluster)
  for (const [orderId, profileId] of orderToProfile) {
    if (!store.profiles.has(profileId)) {
      const profile: MockProfile = {
        id: profileId,
        primary_email: null,
        emails: [],
        ips: [],
        addresses: [],
        card_last4s: [],
        phones: [],
        names: [],
        risk_score: 0,
        risk_level: 'low',
        fraud_flags: [],
        total_orders: 1,
        total_refund_claims: 0,
        total_chargebacks: 0,
        total_merchants_seen_at: 0,
        refund_rate: 0,
        refund_timestamps: [],
        fastest_claim_days: null,
        avg_claim_days: null,
        refund_acceleration_score: 0,
        merchant_ids: [],
        first_seen: now,
        last_seen: now,
        last_audit_id: null,
        profile_confidence: 100,
        manually_reviewed: false,
        merchant_notes: null,
        on_watchlist: false,
        identity_confidence_grade: null,
        identity_signals_summary: [],
        identity_cluster_id: orderId,
        identity_status: null,
      };
      store.profiles.set(profileId, profile);
    }
  }

  return {
    orderToProfile,
    profileCount: store.profiles.size,
    linkedPairs: linkerResult.linkedPairs,
  };
}
