import type { ClaimRow } from '@/app/(app)/claims/claimsPageData';
import {
  PAYOUT_CASE_NEXT_ACTION_LABELS,
  PAYOUT_CASE_STATUS_LABELS,
  type PayoutCaseNextAction,
  type PayoutCaseStatus,
} from '@/lib/payouts/types';
import { formatDateAbsolute } from '@/lib/utils/format';

export type ClaimEvidenceStatus = {
  evidenceStatus: string;
  reviewState: string;
  nextActionLabel: string;
  daysWaiting: number | null;
};

function daysWaiting(claim: ClaimRow): number | null {
  const value = claim.updated_at ?? claim.submitted_at ?? claim.created_at ?? null;
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000)));
}

function isPayoutCaseNextAction(value: string | null | undefined): value is PayoutCaseNextAction {
  return !!value && value in PAYOUT_CASE_NEXT_ACTION_LABELS;
}

function isPayoutCaseStatus(value: string | null | undefined): value is PayoutCaseStatus {
  return !!value && value in PAYOUT_CASE_STATUS_LABELS;
}

function fallbackNextActionLabel(status: string): string {
  switch (status) {
    case 'evidence_needed':
    case 'awaiting_customer_evidence':
      return 'Request customer evidence';
    case 'awaiting_carrier_response':
      return 'Ask carrier for clarification';
    case 'awaiting_3pl_response':
      return 'Ask 3PL for clarification';
    case 'awaiting_supplier_response':
      return 'Ask supplier for clarification';
    case 'ready_for_decision':
    case 'open':
      return 'Make payout decision';
    case 'manual_review':
    case 'escalated':
      return 'Escalate internal review';
    case 'decision_recorded':
      return 'Open recovery or close';
    case 'recovery_opened':
      return 'Wait for recovery update';
    case 'closed':
    case 'resolved_refunded':
    case 'resolved_won':
    case 'resolved_lost':
    case 'resolved_denied':
    case 'resolved_exchanged':
    case 'voided':
    case 'stale':
      return 'Close case';
    default:
      return 'Triage payout case';
  }
}

export function claimNextAction(
  claim: ClaimRow,
  _latestOutcome: { decision: string; outcome: string; updated_at: string } | null,
  _currentUserId: string,
): ClaimEvidenceStatus {
  const nextActionLabel = isPayoutCaseNextAction(claim.next_action)
    ? PAYOUT_CASE_NEXT_ACTION_LABELS[claim.next_action]
    : fallbackNextActionLabel(claim.status);
  const stateLabel = isPayoutCaseStatus(claim.status)
    ? PAYOUT_CASE_STATUS_LABELS[claim.status]
    : claim.status.replace(/_/g, ' ');
  const waitingDays = daysWaiting(claim);
  const snoozedUntil = claim.snoozed_until ? new Date(claim.snoozed_until) : null;
  if (snoozedUntil && snoozedUntil.getTime() > Date.now()) {
    return {
      evidenceStatus: 'Linked identity evidence available after follow-up date',
      reviewState: `Evidence state: Deferred until ${formatDateAbsolute(snoozedUntil)}`,
      nextActionLabel,
      daysWaiting: waitingDays,
    };
  }
  if (claim.next_action_reason) {
    return {
      evidenceStatus: nextActionLabel,
      reviewState: claim.next_action_reason,
      nextActionLabel,
      daysWaiting: waitingDays,
    };
  }
  switch (claim.status) {
    case 'new':
      return {
        evidenceStatus: 'New payout case',
        reviewState: 'Evidence state: Initial triage',
        nextActionLabel,
        daysWaiting: waitingDays,
      };
    case 'evidence_needed':
    case 'awaiting_customer_evidence':
    case 'awaiting_carrier_response':
    case 'awaiting_3pl_response':
    case 'awaiting_supplier_response':
      return {
        evidenceStatus: `${stateLabel}: external information needed`,
        reviewState: 'Evidence state: Clarification before payout',
        nextActionLabel,
        daysWaiting: waitingDays,
      };
    case 'ready_for_decision':
      return {
        evidenceStatus: 'Evidence is ready for payout decision',
        reviewState: 'Evidence state: Ready for decision',
        nextActionLabel,
        daysWaiting: waitingDays,
      };
    case 'manual_review':
      return {
        evidenceStatus: 'Manual review required before payout',
        reviewState: 'Evidence state: Internal escalation',
        nextActionLabel,
        daysWaiting: waitingDays,
      };
    case 'decision_recorded':
    case 'recovery_opened':
      return {
        evidenceStatus: 'Customer payout decision recorded',
        reviewState: 'Evidence state: Recovery or close-out',
        nextActionLabel,
        daysWaiting: waitingDays,
      };
    case 'closed':
      return {
        evidenceStatus: 'Payout case closed',
        reviewState: 'Evidence state: Closed',
        nextActionLabel,
        daysWaiting: waitingDays,
      };
    case 'open':
      return {
        evidenceStatus: 'Linked identity evidence available',
        reviewState: claim.first_viewed_at
          ? 'Review state: Needs review'
          : 'Evidence state: New evidence found',
        nextActionLabel,
        daysWaiting: waitingDays,
      };
    case 'pending':
      return {
        evidenceStatus: 'Waiting on delivery or customer source data',
        reviewState: 'Evidence state: Waiting on source data',
        nextActionLabel,
        daysWaiting: waitingDays,
      };
    case 'escalated':
      return {
        evidenceStatus: 'High-density identity evidence available',
        reviewState: 'Evidence state: High evidence density',
        nextActionLabel,
        daysWaiting: waitingDays,
      };
    case 'resolved_refunded':
    case 'resolved_won':
    case 'resolved_lost':
    case 'resolved_denied':
    case 'resolved_exchanged':
      return {
        evidenceStatus: 'Merchant-recorded outcome on file',
        reviewState: 'Evidence state: Outcome recorded',
        nextActionLabel,
        daysWaiting: waitingDays,
      };
    case 'voided':
      return {
        evidenceStatus: 'Claim voided — no active evidence review',
        reviewState: 'Evidence state: Archived',
        nextActionLabel,
        daysWaiting: waitingDays,
      };
    case 'stale':
      return {
        evidenceStatus: 'Reopen if new identity evidence arrives',
        reviewState: 'Evidence state: Stale',
        nextActionLabel,
        daysWaiting: waitingDays,
      };
    default:
      return {
        evidenceStatus: 'Linked identity evidence available',
        reviewState: 'Review state: Needs review',
        nextActionLabel,
        daysWaiting: waitingDays,
      };
  }
}

export function buildClaimsQueryString(
  sp: Record<string, string | undefined>,
  overrides: Record<string, string | undefined> = {},
) {
  const merged: Record<string, string | undefined> = { ...sp, ...overrides };
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) delete merged[key];
  }
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) {
    if (value == null || value === '') continue;
    next.set(key, value);
  }
  const qs = next.toString();
  return qs ? `?${qs}` : '';
}
