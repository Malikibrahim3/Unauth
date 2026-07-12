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

export type ReconcileFailure = { detector: string; message: string };
export type ReconcileResult = {
  merchantId: string;
  detectors: DetectorResult[];
  exceptionsRaised: number;
  failures: ReconcileFailure[];
};

/** Run all reconciliation detectors for one merchant. */
export async function reconcileMerchant(
  client: SupabaseClient,
  merchantId: string,
  options: { nowMs?: number } = {},
): Promise<ReconcileResult> {
  const nowMs = options.nowMs ?? Date.now();
  const detectors: DetectorResult[] = [];
  const failures: ReconcileFailure[] = [];
  // Each detector is independent; one failing must not abort the sweep.
  const runners: Array<{ detector: string; run: () => Promise<DetectorResult> }> = [
    { detector: 'unmatched_refunds', run: () => detectUnmatchedRefunds(client, merchantId) },
    { detector: 'changed_refund_amounts', run: () => detectChangedRefundAmounts(client, merchantId) },
    { detector: 'unlinked_replacements', run: () => detectUnlinkedReplacements(client, merchantId) },
    { detector: 'unlinked_returns', run: () => detectUnlinkedReturns(client, merchantId) },
    { detector: 'delivery_outcome_updates', run: () => detectDeliveryOutcomeUpdates(client, merchantId) },
    { detector: 'stale_open_cases', run: () => detectStaleOpenCases(client, merchantId, nowMs) },
    { detector: 'closure_eligible_cases', run: () => detectClosureEligibleCases(client, merchantId) },
    { detector: 'duplicate_financials', run: () => detectDuplicateFinancials(client, merchantId) },
    { detector: 'unresolved_dispute_outcomes', run: () => detectUnresolvedDisputeOutcomes(client, merchantId, nowMs) },
    { detector: 'missing_recovery_outcomes', run: () => detectMissingRecoveryOutcomes(client, merchantId, nowMs) },
    { detector: 'probable_matches', run: () => detectProbableMatches(client, merchantId) },
  ];
  for (const runner of runners) {
    try {
      detectors.push(await runner.run());
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      failures.push({ detector: runner.detector, message });
      console.error('[reconcile] detector failed', { merchantId, detector: runner.detector, message });
    }
  }
  return {
    merchantId,
    detectors,
    exceptionsRaised: detectors.reduce((sum, d) => sum + d.raised, 0),
    failures,
  };
}
