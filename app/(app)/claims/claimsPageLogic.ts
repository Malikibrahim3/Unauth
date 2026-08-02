import type { ClaimRow } from '@/app/(app)/claims/claimsPageData';
import { sanitizeMerchantText } from '@/app/(app)/claims/claimsPageData';
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
  // Waiting time describes how long the customer request has been open. A
  // fresh read or evidence sync must not reset it by changing updated_at.
  const value = claim.submitted_at ?? claim.created_at ?? claim.updated_at ?? null;
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
      return 'Make decision';
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
      return 'Review case';
  }
}

export function claimNextAction(
  claim: ClaimRow,
  _latestOutcome: { decision: string; outcome: string; updated_at: string } | null,
  _currentUserId: string,
): ClaimEvidenceStatus {
  const projectedNextAction = isPayoutCaseNextAction(claim.next_action)
    ? PAYOUT_CASE_NEXT_ACTION_LABELS[claim.next_action]
    : fallbackNextActionLabel(claim.status);
  const stateLabel = isPayoutCaseStatus(claim.status)
    ? PAYOUT_CASE_STATUS_LABELS[claim.status]
    : claim.status.replace(/_/g, ' ');
  const waitingDays = daysWaiting(claim);
  if ((claim.investigation_awaiting_review_count ?? 0) > 0) {
    return {
      evidenceStatus: `${claim.investigation_awaiting_review_count} investigation response${claim.investigation_awaiting_review_count === 1 ? '' : 's'} ready`,
      reviewState: claim.investigation_latest_response
        ? sanitizeMerchantText(claim.investigation_latest_response)
        : 'Evidence state: External response needs review',
      nextActionLabel: 'Review investigation response',
      daysWaiting: waitingDays,
    };
  }
  if ((claim.investigation_overdue_count ?? 0) > 0) {
    const party = claim.investigation_waiting_party
      ?? claim.investigation_waiting_target?.replaceAll('_', ' ')
      ?? 'external party';
    return {
      evidenceStatus: `${claim.investigation_overdue_count} overdue investigation${claim.investigation_overdue_count === 1 ? '' : 's'}`,
      reviewState: claim.investigation_evidence_gap
        ? sanitizeMerchantText(claim.investigation_evidence_gap)
        : `Evidence state: Waiting on ${party}`,
      nextActionLabel: `Chase ${party}`,
      daysWaiting: waitingDays,
    };
  }
  if ((claim.investigation_open_count ?? 0) > 0 && claim.investigation_waiting_target) {
    const party = claim.investigation_waiting_party
      ?? claim.investigation_waiting_target.replaceAll('_', ' ');
    return {
      evidenceStatus: `${claim.investigation_open_count} open investigation${claim.investigation_open_count === 1 ? '' : 's'}`,
      reviewState: claim.investigation_evidence_gap
        ? sanitizeMerchantText(claim.investigation_evidence_gap)
        : `Evidence state: Waiting on ${party}`,
      nextActionLabel: `Waiting on ${party}`,
      daysWaiting: waitingDays,
    };
  }
  const nextActionLabel = projectedNextAction;
  const snoozedUntil = claim.snoozed_until ? new Date(claim.snoozed_until) : null;
  if (snoozedUntil && snoozedUntil.getTime() > Date.now()) {
    return {
      evidenceStatus: 'Linked identity evidence available after follow-up date',
      reviewState: `Evidence state: Deferred until ${formatDateAbsolute(snoozedUntil)}`,
      nextActionLabel,
      daysWaiting: waitingDays,
    };
  }
  if (claim.status === 'recovery_opened') {
    return {
      evidenceStatus: 'Recovery in progress',
      reviewState: 'Customer decision recorded. Monitor the recovery route for the next partner update.',
      nextActionLabel,
      daysWaiting: waitingDays,
    };
  }
  if (claim.status === 'decision_recorded') {
    return {
      evidenceStatus: 'Customer decision recorded',
      reviewState: 'Customer action is complete. Open a recovery route or close the case.',
      nextActionLabel,
      daysWaiting: waitingDays,
    };
  }
  if (claim.next_action_reason) {
    return {
      evidenceStatus: nextActionLabel,
      reviewState: sanitizeMerchantText(claim.next_action_reason),
      nextActionLabel,
      daysWaiting: waitingDays,
    };
  }
  switch (claim.status) {
    case 'new':
      return {
        evidenceStatus: 'New case',
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
        reviewState: 'Evidence state: Clarification before customer action',
        nextActionLabel,
        daysWaiting: waitingDays,
      };
    case 'ready_for_decision':
      return {
        evidenceStatus: 'Evidence is ready for a customer decision',
        reviewState: 'Evidence state: Ready for decision',
        nextActionLabel,
        daysWaiting: waitingDays,
      };
    case 'manual_review':
      return {
        evidenceStatus: 'Manual review required before customer action',
        reviewState: 'Evidence state: Internal escalation',
        nextActionLabel,
        daysWaiting: waitingDays,
      };
    case 'closed':
      return {
        evidenceStatus: 'Case closed',
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
        evidenceStatus: 'Case voided — no active evidence review',
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
