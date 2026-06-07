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
  chargeback_disputed: 'CB disputed',
  blacklist: 'Legacy restricted action',
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
  open: { label: 'Open', bg: 'var(--bg-subtle)', text: 'var(--text-muted)' },
  pending: { label: 'Pending external evidence', bg: 'var(--sev-medium-fill,#FEF3C7)', text: 'var(--sev-medium,#B45309)' },
  escalated: { label: 'Escalated', bg: 'var(--risk-critical-bg,#FEE2E2)', text: 'var(--risk-critical,#991B1B)' },
  resolved_refunded: { label: 'Resolved: refunded', bg: 'var(--sev-clear-fill,#DCFCE7)', text: 'var(--sev-clear,#166534)' },
  resolved_won: { label: 'Resolved: won', bg: 'var(--sev-clear-fill,#DCFCE7)', text: 'var(--sev-clear,#166534)' },
  resolved_lost: { label: 'Resolved: lost', bg: 'var(--sev-high-fill,#FEE2E2)', text: 'var(--sev-high,#991B1B)' },
  resolved_denied: { label: 'Resolved: denied', bg: 'var(--bg-subtle)', text: 'var(--text-muted)' },
  resolved_exchanged: { label: 'Resolved: exchanged', bg: 'var(--sev-clear-fill,#DCFCE7)', text: 'var(--sev-clear,#166534)' },
  voided: { label: 'Voided', bg: 'var(--bg-subtle)', text: 'var(--text-muted)' },
  stale: { label: 'Stale', bg: 'var(--bg-subtle)', text: 'var(--text-muted)' },
};

export const SLA_COLOUR_MAP: Record<string, { bg: string; text: string }> = {
  normal: { bg: 'var(--bg-subtle)', text: 'var(--text-muted)' },
  approaching: { bg: 'var(--sev-medium-fill,#FEF3C7)', text: 'var(--sev-medium,#B45309)' },
  overdue: { bg: 'var(--sev-high-fill,#FEE2E2)', text: 'var(--sev-high,#991B1B)' },
  resolved: { bg: 'var(--sev-clear-fill,#DCFCE7)', text: 'var(--sev-clear,#166534)' },
};
