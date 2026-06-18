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
  approved: 'Merchant response recorded',
  denied: 'Merchant response recorded',
  escalated: 'Merchant response recorded',
  partial_refund: 'Merchant response recorded',
  full_refund: 'Merchant response recorded',
  chargeback_disputed: 'Merchant response recorded',
  blacklist: 'Merchant response recorded',
  internal_watch: 'Merchant response recorded',
  no_action: 'No action recorded',
};

export const OUTCOME_LABELS: Record<Outcome, string> = {
  loss: 'Merchant response recorded',
  recovered: 'Merchant response recorded',
  pending: 'Merchant response pending',
  chargeback_won: 'Merchant response recorded',
  chargeback_lost: 'Merchant response recorded',
  customer_verified: 'Merchant response recorded',
  suspected_fraud: 'Merchant response recorded',
  legitimate: 'Merchant response recorded',
};

export const EVIDENCE_TYPE_LABELS: Record<EvidenceType, string> = {
  tracking: 'Tracking record',
  proof_of_delivery: 'Proof of delivery',
  customer_message: 'Customer message',
  support_ticket: 'Helpdesk case record',
  return_label: 'Return label',
  warehouse_scan: 'Warehouse scan',
  payment_dispute: 'Payment dispute',
  note: 'Internal note',
  other: 'Other',
};

export const EVIDENCE_SOURCE_LABELS: Record<EvidenceSource, string> = {
  manual: 'Manual record',
  csv_import: 'Legacy import',
  zendesk: 'Zendesk',
  gorgias: 'Gorgias',
  shopify: 'Shopify',
  stripe: 'Stripe',
  paypal: 'PayPal',
  carrier: 'Order delivery data',
};

export const STATUS_LABELS: Record<string, string> = {
  open: 'Active',
  under_review: 'Under review',
  evidence_requested: 'Evidence requested',
  pending: 'Waiting on source data',
  escalated: 'High evidence',
  resolved: 'Outcome recorded',
  closed: 'Archived',
};

export const QUICK_LIFECYCLE_STATUSES: Array<{ value: ClaimStatus; label: string }> = [
  { value: 'under_review', label: 'Under review' },
  { value: 'evidence_requested', label: 'Awaiting evidence' },
  { value: 'pending', label: 'Waiting on source data' },
  { value: 'escalated', label: 'High evidence' },
];
