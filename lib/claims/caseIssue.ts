import type { ClaimTypeValue } from '@/lib/claims/claimTypes';

/**
 * Merchant-correctable product issues. `claim_type` remains the compatibility
 * taxonomy; `reason_normalized` stores this more precise Release 1 issue.
 */
export const CASE_ISSUES = [
  'item_not_received',
  'missing_item',
  'damaged_item',
  'wrong_item',
  'not_as_described',
  'late_delivery',
  'refund_request',
  'chargeback_related',
  'return_abuse',
  'other',
] as const;

export type CaseIssue = (typeof CASE_ISSUES)[number];

export const CASE_ISSUE_LABELS: Record<CaseIssue, string> = {
  item_not_received: 'Whole parcel not received',
  missing_item: 'Item missing from parcel',
  damaged_item: 'Item damaged',
  wrong_item: 'Wrong item',
  not_as_described: 'Not as described',
  late_delivery: 'Late delivery',
  refund_request: 'Refund request',
  chargeback_related: 'Chargeback or dispute',
  return_abuse: 'Return abuse',
  other: 'Other',
};

export function storedClaimTypeForCaseIssue(issue: CaseIssue): ClaimTypeValue {
  switch (issue) {
    case 'item_not_received':
    case 'missing_item':
    case 'late_delivery':
      return 'item_not_received';
    case 'damaged_item':
      return 'damaged';
    case 'wrong_item':
      return 'wrong_item';
    case 'not_as_described':
      return 'not_as_described';
    case 'refund_request':
      return 'refund_request';
    case 'chargeback_related':
      return 'chargeback';
    case 'return_abuse':
      return 'return_abuse';
    case 'other':
      return 'other';
  }
}

