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
  damage_photo: 'Damage photo',
  packaging_photo: 'Packaging photo',
  label_photo: 'Label photo',
  wrong_item_photo: 'Wrong-item photo',
  proof_of_value: 'Proof of value',
  proof_of_dispatch: 'Proof of dispatch',
  delivery_photo: 'Delivery photo',
  customer_non_receipt_statement: 'Customer non-receipt statement',
  carrier_investigation: 'Carrier investigation',
  warehouse_pick_pack_record: 'Pick/pack record',
  packing_slip: 'Packing slip',
  weight_scan: 'Weight scan',
  refund_proof: 'Refund proof',
  reship_proof: 'Reship proof',
  supplier_batch_lot: 'Supplier batch / lot',
  purchase_order: 'Purchase order',
  return_inspection: 'Return inspection',
  chargeback_notice: 'Chargeback notice',
  carrier_claim_correspondence: 'Carrier claim correspondence',
  three_pl_dispute_correspondence: '3PL dispute correspondence',
  supplier_credit_note: 'Supplier credit note',
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
  new: 'New',
  evidence_needed: 'Needs evidence',
  awaiting_customer_evidence: 'Awaiting customer evidence',
  awaiting_carrier_response: 'Awaiting carrier response',
  awaiting_3pl_response: 'Awaiting 3PL response',
  awaiting_supplier_response: 'Awaiting supplier response',
  ready_for_decision: 'Ready for decision',
  manual_review: 'Manual review',
  decision_recorded: 'Decision recorded',
  recovery_opened: 'Recovery opened',
  open: 'Active',
  under_review: 'Under review',
  evidence_requested: 'Evidence requested',
  pending: 'Waiting on source data',
  escalated: 'High evidence',
  resolved: 'Outcome recorded',
  closed: 'Archived',
};

export const QUICK_LIFECYCLE_STATUSES: Array<{ value: ClaimStatus; label: string }> = [
  { value: 'evidence_needed', label: 'Needs evidence' },
  { value: 'awaiting_customer_evidence', label: 'Awaiting customer' },
  { value: 'awaiting_carrier_response', label: 'Awaiting carrier' },
  { value: 'awaiting_3pl_response', label: 'Awaiting 3PL' },
  { value: 'awaiting_supplier_response', label: 'Awaiting supplier' },
  { value: 'ready_for_decision', label: 'Ready for decision' },
  { value: 'manual_review', label: 'Manual review' },
];
