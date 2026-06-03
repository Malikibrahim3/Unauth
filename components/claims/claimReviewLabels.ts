import type {
  ClaimStatus,
  ClaimType,
  Decision,
  EvidenceSource,
  EvidenceType,
  Outcome,
} from '@/components/claims/claimReviewTypes';

export const DEFAULT_META_ROWS = [{ id: 'default-note', key: 'note', value: '' }];

export const CLAIM_TYPE_LABELS: Record<ClaimType, string> = {
  missing_parcel: 'Missing parcel',
  damaged: 'Damaged item',
  wrong_item: 'Wrong item',
  refund_request: 'Refund request',
  chargeback: 'Chargeback',
  return_abuse: 'Return abuse',
  other: 'Other',
};

export const DECISION_LABELS: Record<Decision, string> = {
  approved: 'Merchant resolved in customer favour',
  denied: 'Merchant closed without payout',
  escalated: 'Escalated for review',
  partial_refund: 'Partial resolution',
  full_refund: 'Full resolution',
  chargeback_disputed: 'Chargeback disputed',
  blacklist: 'Legacy restricted action',
  no_action: 'No further action',
};

export const OUTCOME_LABELS: Record<Outcome, string> = {
  loss: 'Loss accepted',
  recovered: 'Recovered',
  pending: 'Pending',
  chargeback_won: 'Chargeback won',
  chargeback_lost: 'Chargeback lost',
  customer_verified: 'Additional identity details verified',
  suspected_fraud: 'Pattern requires closer review',
  legitimate: 'Claim context resolved',
};

export const EVIDENCE_TYPE_LABELS: Record<EvidenceType, string> = {
  tracking: 'Tracking record',
  proof_of_delivery: 'Proof of delivery',
  customer_message: 'Customer message',
  support_ticket: 'Support ticket',
  return_label: 'Return label',
  warehouse_scan: 'Warehouse scan',
  payment_dispute: 'Payment dispute',
  note: 'Internal note',
  other: 'Other',
};

export const EVIDENCE_SOURCE_LABELS: Record<EvidenceSource, string> = {
  manual: 'Manual upload',
  csv_import: 'CSV import',
  zendesk: 'Zendesk',
  gorgias: 'Gorgias',
  shopify: 'Shopify',
  stripe: 'Stripe',
  paypal: 'PayPal',
  carrier: 'Carrier',
};

export const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  under_review: 'Under review',
  evidence_requested: 'Evidence requested',
  pending: 'Pending external evidence',
  escalated: 'Escalated',
  resolved: 'Resolved',
  closed: 'Closed',
};

export const QUICK_LIFECYCLE_STATUSES: Array<{ value: ClaimStatus; label: string }> = [
  { value: 'under_review', label: 'Under review' },
  { value: 'evidence_requested', label: 'Awaiting evidence' },
  { value: 'pending', label: 'Awaiting info' },
  { value: 'escalated', label: 'Escalated' },
];
