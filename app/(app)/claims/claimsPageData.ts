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
  blacklist: 'Escalated hold',
  internal_watch: 'Internal watch',
  no_action: 'No further action',
};

export type ClaimRow = {
  id: string;
  customer_id: string | null;
  shop_domain: string | null;
  shopify_order_id: string | null;
  order_ref?: string | null;
  claim_type: string;
  status: string;
  amount_at_risk: number | null;
  currency: string | null;
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
