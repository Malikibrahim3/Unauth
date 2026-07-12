/**
 * Phase 12 scheduled reconciliation.
 *
 * Beyond live event notifications, Unauth periodically compares its records with
 * connected sources to catch missed/delayed events and drift. Reconciliation is
 * safe and idempotent: detectors raise de-duplicated exceptions (or, where the
 * source cannot expose an outcome, a clearly-labelled UNKNOWN exception) and never
 * create duplicate cases or re-apply financial facts.
 *
 * See lib/reconciliation/detectors.ts for the individual, data-supported checks.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  detectUnmatchedRefunds,
  detectChangedRefundAmounts,
  detectUnlinkedReplacements,
  detectUnlinkedReturns,
  detectDeliveryOutcomeUpdates,
  detectStaleOpenCases,
  detectClosureEligibleCases,
  detectDuplicateFinancials,
  detectUnresolvedDisputeOutcomes,
  detectMissingRecoveryOutcomes,
  detectProbableMatches,
  type DetectorResult,
} from '@/lib/reconciliation/detectors';

export type { DetectorResult } from '@/lib/reconciliation/detectors';
export { detectUnmatchedRefunds } from '@/lib/reconciliation/detectors';

export type ReconcileResult = { merchantId: string; detectors: DetectorResult[]; exceptionsRaised: number };

/** Run all reconciliation detectors for one merchant. */
export async function reconcileMerchant(
  client: SupabaseClient,
  merchantId: string,
  options: { nowMs?: number } = {},
): Promise<ReconcileResult> {
  const nowMs = options.nowMs ?? Date.now();
  const detectors: DetectorResult[] = [];
  // Each detector is independent; one failing must not abort the sweep.
  const runners: Array<() => Promise<DetectorResult>> = [
    () => detectUnmatchedRefunds(client, merchantId),
    () => detectChangedRefundAmounts(client, merchantId),
    () => detectUnlinkedReplacements(client, merchantId),
    () => detectUnlinkedReturns(client, merchantId),
    () => detectDeliveryOutcomeUpdates(client, merchantId),
    () => detectStaleOpenCases(client, merchantId, nowMs),
    () => detectClosureEligibleCases(client, merchantId),
    () => detectDuplicateFinancials(client, merchantId),
    () => detectUnresolvedDisputeOutcomes(client, merchantId, nowMs),
    () => detectMissingRecoveryOutcomes(client, merchantId, nowMs),
    () => detectProbableMatches(client, merchantId),
  ];
  for (const run of runners) {
    try {
      detectors.push(await run());
    } catch (cause) {
      console.error('[reconcile] detector failed', { merchantId, message: cause instanceof Error ? cause.message : String(cause) });
    }
  }
  return { merchantId, detectors, exceptionsRaised: detectors.reduce((sum, d) => sum + d.raised, 0) };
}
