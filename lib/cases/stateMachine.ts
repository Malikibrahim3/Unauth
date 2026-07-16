/**
 * Case state machine. A support payout case has three independent state axes:
 *   - `status`               — pipeline status (claim_status enum)
 *   - `payout_decision_state`— decision lifecycle (pending → recorded → reversed)
 *   - `recovery_state`       — recovery lifecycle (none → open → …)
 *
 * They are separate axes with ONE transition service (`transitionCase`). Routes
 * must not mutate them directly. This module validates a proposed transition on
 * any axis; the status axis delegates to the canonical claim status machine so
 * there is a single source of truth for status transitions.
 *
 * See ARCHITECTURE.md §6.
 */
import { canTransitionClaimStatus } from '@/lib/claims/statusMachine';
import {
  PAYOUT_DECISION_STATES as WORKFLOW_DECISION_STATES,
  RECOVERY_STATES as WORKFLOW_RECOVERY_STATES,
} from '@/lib/payouts/types';

export const PAYOUT_DECISION_STATES = [...WORKFLOW_DECISION_STATES, 'reversed'] as const;
export type PayoutDecisionState = (typeof PAYOUT_DECISION_STATES)[number];

export const RECOVERY_STATES = WORKFLOW_RECOVERY_STATES;
export type RecoveryState = (typeof RECOVERY_STATES)[number];

const DECISION_STATES = new Set<string>(PAYOUT_DECISION_STATES);
const RECOVERY_STATE_SET = new Set<string>(RECOVERY_STATES);

export function canTransitionDecisionState(from: string, to: string): boolean {
  if (from === to) return true;
  if (!DECISION_STATES.has(from) || !DECISION_STATES.has(to)) return false;
  // Workflow recommendations may be revised until an agent records a decision.
  // A reversal is only meaningful after that recorded decision.
  if (from === 'decision_recorded') return to === 'reversed';
  if (from === 'reversed') return to === 'decision_recorded';
  return to !== 'reversed';
}

export function canTransitionRecoveryState(from: string, to: string): boolean {
  if (from === to) return true;
  if (!RECOVERY_STATE_SET.has(from) || !RECOVERY_STATE_SET.has(to)) return false;
  if (from === 'recovery_paid' || from === 'closed_unrecoverable') return false;
  if (to === 'recovery_paid') return from === 'recovery_submitted';
  if (to === 'recovery_submitted') return from === 'recovery_opened';
  if (to === 'recovery_opened') return from === 'recovery_possible';
  if (to === 'closed_unrecoverable') return from !== 'no_recovery_needed';
  return true;
}

export type CaseAxisPatch = {
  status?: string;
  payoutDecisionState?: string;
  recoveryState?: string;
};

export type CaseAxisState = {
  status: string;
  payoutDecisionState: string;
  recoveryState: string;
};

/**
 * Validate a proposed multi-axis transition. Returns the list of rejected axes
 * (empty when the whole transition is allowed).
 */
export function validateCaseTransition(
  current: CaseAxisState,
  patch: CaseAxisPatch,
  options: { allowReopen?: boolean; allowDecisionReversal?: boolean; allowSnooze?: boolean } = {},
): { ok: boolean; rejected: string[] } {
  const rejected: string[] = [];
  if (patch.status !== undefined && !canTransitionClaimStatus(current.status, patch.status, options)) {
    rejected.push('status');
  }
  if (
    patch.payoutDecisionState !== undefined &&
    !canTransitionDecisionState(current.payoutDecisionState, patch.payoutDecisionState) &&
    !(options.allowDecisionReversal && patch.payoutDecisionState === 'reversed')
  ) {
    rejected.push('payout_decision_state');
  }
  if (
    patch.recoveryState !== undefined &&
    !canTransitionRecoveryState(current.recoveryState, patch.recoveryState)
  ) {
    rejected.push('recovery_state');
  }
  return { ok: rejected.length === 0, rejected };
}
