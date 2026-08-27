export type ClaimType =
  | 'missing_parcel'
  | 'damaged'
  | 'wrong_item'
  | 'refund_request'
  | 'chargeback'
  | 'return_abuse'
  | 'other';

export type Decision =
  | 'approved'
  | 'denied'
  | 'escalated'
  | 'partial_refund'
  | 'full_refund'
  | 'chargeback_disputed'
  | 'blacklist'
  | 'internal_watch'
  | 'no_action';

export type Outcome =
  | 'loss'
  | 'recovered'
  | 'pending'
  | 'chargeback_won'
  | 'chargeback_lost'
  | 'customer_verified'
  | 'suspected_fraud'
  | 'legitimate';

// CR-4: accusation-style values remain in the unions for read-compatibility with
// historical rows, but are never offered as a new merchant choice and are
// rejected by the live decision/outcome APIs. Listed here (a file excluded from
// the banned-terms scan) so UI code can filter them without naming them inline.
export const WRITE_PROHIBITED_DECISIONS: Decision[] = ['blacklist'];
export const WRITE_PROHIBITED_OUTCOMES: Outcome[] = ['suspected_fraud'];

export type EvidenceType =
  | 'tracking'
  | 'proof_of_delivery'
  | 'customer_message'
  | 'support_ticket'
  | 'return_label'
  | 'warehouse_scan'
  | 'payment_dispute'
  | 'note'
  | 'damage_photo'
  | 'packaging_photo'
  | 'label_photo'
  | 'wrong_item_photo'
  | 'proof_of_value'
  | 'proof_of_dispatch'
  | 'delivery_photo'
  | 'customer_non_receipt_statement'
  | 'carrier_investigation'
  | 'warehouse_pick_pack_record'
  | 'packing_slip'
  | 'weight_scan'
  | 'refund_proof'
  | 'reship_proof'
  | 'supplier_batch_lot'
  | 'purchase_order'
  | 'return_inspection'
  | 'chargeback_notice'
  | 'carrier_claim_correspondence'
  | 'three_pl_dispute_correspondence'
  | 'supplier_credit_note'
  | 'other';

export type EvidenceSource =
  | 'manual'
  | 'csv_import'
  | 'zendesk'
  | 'gorgias'
  | 'shopify'
  | 'stripe'
  | 'paypal'
  | 'carrier';

export type ClaimStatus =
  | 'new'
  | 'evidence_needed'
  | 'awaiting_customer_evidence'
  | 'awaiting_carrier_response'
  | 'awaiting_3pl_response'
  | 'awaiting_supplier_response'
  | 'ready_for_decision'
  | 'manual_review'
  | 'decision_recorded'
  | 'recovery_opened'
  | 'open'
  | 'under_review'
  | 'evidence_requested'
  | 'pending'
  | 'escalated'
  | 'resolved'
  | 'closed';

export type OrderOption = {
  id: string;
  orderLabel: string;
  orderValue: number | null;
  currency?: string | null;
  status: string;
  date?: string | null;
  source?: string;
};

export type MetaRow = { id: string; key: string; value: string };

export type ClaimRecord = {
  id: string;
  status: string;
  claim_type?: string;
  customer_claim_reason?: string | null;
  normalized_reason?: string | null;
  customer_name?: string | null;
  shopify_order_id?: string | null;
  order_ref?: string | null;
  source_ticket_ref?: string | null;
  amount_at_risk?: number | null;
  requested_action?: string | null;
  currency?: string | null;
  first_viewed_at?: string | null;
  assigned_to?: string | null;
  assigned_to_name?: string | null;
  snoozed_until?: string | null;
  evidence_count?: number;
  submitted_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  latest_outcome?: { decision?: string; outcome?: string; actor_user_id?: string; updated_at?: string } | null;
  outcomes?: Array<{ decision?: string; outcome?: string; actor_user_id?: string; updated_at?: string }>;
  events?: Array<{ id: string; event_type: string; created_at?: string; actor_user_id?: string; metadata?: unknown }>;
};

export type PrimaryActionKey =
  | 'evidence'
  | 'decision'
  | 'response'
  | 'status'
  | 'close'
  | 'save_claim'
  | 'reopen'
  | 'none';

export type MessageTone = 'success' | 'error' | 'neutral';
