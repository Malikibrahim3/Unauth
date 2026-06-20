export const CLAIM_TYPE_LABELS: Record<string, string> = {
  missing_parcel: 'Missing parcel',
  damaged: 'Damaged item',
  wrong_item: 'Wrong item',
  refund_request: 'Refund request',
  chargeback: 'Chargeback',
  return_abuse: 'Return abuse',
  other: 'Other',
};

export const DECISION_LABELS: Record<string, string> = {
  approved: 'Resolved in customer favour',
  denied: 'Closed without payout',
  escalated: 'Escalated for review',
  partial_refund: 'Partial resolution',
  full_refund: 'Full resolution',
  chargeback_disputed: 'Chargeback disputed',
  // Read-compat: historical 'blacklist' decisions display as a neutral policy denial,
  // matching the canonical map in lib/claims/events.ts.
  blacklist: 'Denied under policy',
  internal_watch: 'Internal watch',
  no_action: 'No further action',
};

export type ClaimRow = {
  id: string;
  customer_id: string | null;
  shop_domain: string | null;
  shopify_order_id: string | null;
  order_ref?: string | null;
  source_ticket_ref?: string | null;
  claim_type: string;
  status: string;
  amount_at_risk: number | null;
  total_estimated_loss?: number | null;
  currency: string | null;
  loss_attribution?: string | null;
  attribution_confidence?: string | null;
  recoverability?: string | null;
  recovery_owner?: string | null;
  recovery_required_evidence?: string[] | null;
  recovery_next_action?: string | null;
  payout_decision_state?: string | null;
  recovery_state?: string | null;
  next_action?: string | null;
  next_action_reason?: string | null;
  submitted_at?: string | null;
  created_at?: string | null;
  updated_at: string;
  first_viewed_at?: string | null;
  first_viewed_by?: string | null;
  assigned_to?: string | null;
  assigned_at?: string | null;
  snoozed_until?: string | null;
  snooze_reason?: string | null;
};

export type CustomerProfileSummary = {
  id: string;
  names: string[] | null;
  primary_email: string | null;
  risk_level: string;
};

export type EvidencePackageRow = {
  id: string;
  customer_profile_id: string | null;
  generated_for_order_id: string | null;
  reference_number: string;
  generated_at: string;
};

export const STATUS_META: Record<string, { label: string; bg: string; text: string }> = {
  new: { label: 'New', bg: 'var(--surface)', text: 'var(--text-secondary)' },
  evidence_needed: { label: 'Needs evidence', bg: 'var(--warning-bg)', text: 'var(--warning)' },
  awaiting_customer_evidence: { label: 'Awaiting customer', bg: 'var(--warning-bg)', text: 'var(--warning)' },
  awaiting_carrier_response: { label: 'Awaiting carrier', bg: 'var(--info-bg)', text: 'var(--info)' },
  awaiting_3pl_response: { label: 'Awaiting 3PL', bg: 'var(--info-bg)', text: 'var(--info)' },
  awaiting_supplier_response: { label: 'Awaiting supplier', bg: 'var(--info-bg)', text: 'var(--info)' },
  ready_for_decision: { label: 'Ready for decision', bg: 'var(--success-bg)', text: 'var(--success)' },
  manual_review: { label: 'Manual review', bg: 'var(--warning-bg)', text: 'var(--warning)' },
  decision_recorded: { label: 'Decision recorded', bg: 'var(--surface)', text: 'var(--text-secondary)' },
  recovery_opened: { label: 'Recovery opened', bg: 'var(--surface)', text: 'var(--text-secondary)' },
  closed: { label: 'Closed', bg: 'var(--surface)', text: 'var(--text-secondary)' },
  open: { label: 'Active', bg: 'var(--surface)', text: 'var(--text-secondary)' },
  pending: { label: 'Waiting on source data', bg: 'var(--warning-bg)', text: 'var(--warning)' },
  escalated: { label: 'High evidence', bg: 'var(--sev-probable-fill)', text: 'var(--sev-probable)' },
  resolved_refunded: { label: 'Resolved: refunded', bg: 'var(--success-bg)', text: 'var(--success)' },
  resolved_won: { label: 'Resolved: won', bg: 'var(--success-bg)', text: 'var(--success)' },
  resolved_lost: { label: 'Resolved: lost', bg: 'var(--risk-critical-bg)', text: 'var(--risk-critical-fg)' },
  resolved_denied: { label: 'Resolved: denied', bg: 'var(--surface)', text: 'var(--text-secondary)' },
  resolved_exchanged: { label: 'Resolved: exchanged', bg: 'var(--success-bg)', text: 'var(--success)' },
  voided: { label: 'Voided', bg: 'var(--surface)', text: 'var(--text-secondary)' },
  stale: { label: 'Stale', bg: 'var(--surface)', text: 'var(--text-secondary)' },
};

export const SLA_COLOUR_MAP: Record<string, { bg: string; text: string }> = {
  normal: { bg: 'var(--surface)', text: 'var(--text-secondary)' },
  approaching: { bg: 'var(--warning-bg)', text: 'var(--warning)' },
  overdue: { bg: 'var(--warning-bg)', text: 'var(--warning)' },
  resolved: { bg: 'var(--success-bg)', text: 'var(--success)' },
};
