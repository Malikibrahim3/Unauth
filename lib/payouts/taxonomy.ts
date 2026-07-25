import type { ClaimTypeValue } from '@/lib/claims/claimTypes';
import { PAYOUT_CASE_STATUSES, type PayoutCaseStatus } from '@/lib/payouts/types';

export const SUPPORT_PAYOUT_CASE_STATUSES = PAYOUT_CASE_STATUSES;

export type SupportPayoutCaseStatus = PayoutCaseStatus;

export const SUPPORT_PAYOUT_CASE_REASONS = [
  'item_not_received',
  'missing_item',
  'damaged_item',
  'wrong_item',
  'not_as_described',
  'late_delivery',
  'refund_request',
  'reship_request',
  'replacement_request',
  'returnless_refund',
  'store_credit_request',
  'chargeback_related',
  'policy_exception',
  'supplier_defect',
  'warehouse_error',
  'carrier_issue',
  'unknown',
] as const;

export type SupportPayoutCaseReason = (typeof SUPPORT_PAYOUT_CASE_REASONS)[number];

const FINAL_LEGACY_STATUSES = new Set([
  'resolved_refunded',
  'resolved_won',
  'resolved_lost',
  'resolved_denied',
  'resolved_exchanged',
  'voided',
  'stale',
  'resolved',
  'closed',
]);

export function toSupportPayoutCaseStatus(
  status: string | null | undefined,
  recoveryOpened = false,
): SupportPayoutCaseStatus {
  if (recoveryOpened) return 'recovery_opened';
  if (!status) return 'new';
  if ((SUPPORT_PAYOUT_CASE_STATUSES as readonly string[]).includes(status)) {
    return status as SupportPayoutCaseStatus;
  }
  if (status === 'pending' || status === 'new') return 'new';
  if (status === 'evidence_requested' || status === 'waiting_evidence') return 'evidence_needed';
  if (status === 'open' || status === 'under_review') return 'ready_for_decision';
  if (status === 'escalated' || status === 'recommendation_ready') return 'manual_review';
  if (status === 'decision_recorded') return 'decision_recorded';
  if (FINAL_LEGACY_STATUSES.has(status)) return 'closed';
  return 'evidence_needed';
}

export function toStoredClaimStatus(status: string | null | undefined): string | null {
  switch (status) {
    case 'new':
    case 'evidence_needed':
    case 'awaiting_customer_evidence':
    case 'awaiting_carrier_response':
    case 'awaiting_3pl_response':
    case 'awaiting_supplier_response':
    case 'ready_for_decision':
    case 'manual_review':
    case 'decision_recorded':
    case 'recovery_opened':
    case 'closed':
      return status;
    case 'waiting_evidence':
      return 'evidence_needed';
    case 'recommendation_ready':
      return 'ready_for_decision';
    default:
      return status ?? null;
  }
}

export function toLegacyStoredClaimStatus(status: string | null | undefined): string | null {
  switch (status) {
    case 'new':
      return 'pending';
    case 'evidence_needed':
    case 'awaiting_customer_evidence':
    case 'awaiting_carrier_response':
    case 'awaiting_3pl_response':
    case 'awaiting_supplier_response':
    case 'waiting_evidence':
    case 'manual_review':
    case 'ready_for_decision':
    case 'decision_recorded':
    case 'recovery_opened':
      return 'open';
    case 'closed':
      return 'resolved_denied';
    default:
      return status ?? null;
  }
}

export function toSupportPayoutCaseReason(
  claimType: string | null | undefined,
  normalizedReason?: string | null,
): SupportPayoutCaseReason {
  const value = normalizedReason || claimType;
  switch (value) {
    case 'missing_parcel':
    case 'item_not_received':
      return 'item_not_received';
    case 'missing_item':
      return 'missing_item';
    case 'damaged':
    case 'damaged_item':
      return 'damaged_item';
    case 'wrong_item':
      return 'wrong_item';
    case 'not_as_described':
      return 'not_as_described';
    case 'late_delivery':
      return 'late_delivery';
    case 'refund_request':
      return 'refund_request';
    case 'reship_request':
      return 'reship_request';
    case 'replacement_request':
      return 'replacement_request';
    case 'return_request':
    case 'returnless_refund':
      return 'returnless_refund';
    case 'store_credit_request':
      return 'store_credit_request';
    case 'chargeback':
    case 'dispute':
    case 'chargeback_related':
      return 'chargeback_related';
    case 'supplier_defect':
      return 'supplier_defect';
    case 'warehouse_error':
      return 'warehouse_error';
    case 'carrier_issue':
      return 'carrier_issue';
    case 'return_abuse':
    case 'policy_exception':
      return 'policy_exception';
    default:
      return 'unknown';
  }
}

export function toStoredClaimType(reason: string | null | undefined): ClaimTypeValue | null {
  switch (reason) {
    case 'item_not_received':
    case 'missing_item':
    case 'late_delivery':
    case 'reship_request':
    case 'carrier_issue':
      return 'item_not_received';
    case 'damaged_item':
    case 'supplier_defect':
      return 'damaged';
    case 'wrong_item':
    case 'warehouse_error':
    case 'replacement_request':
      return 'wrong_item';
    case 'not_as_described':
      return 'not_as_described';
    case 'refund_request':
    case 'returnless_refund':
    case 'store_credit_request':
      return 'refund_request';
    case 'chargeback_related':
      return 'chargeback';
    case 'policy_exception':
      return 'return_abuse';
    case 'unknown':
      return 'other';
    default:
      return null;
  }
}
