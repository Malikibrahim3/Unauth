import { CLAIM_TYPE_LABELS as CANONICAL_CLAIM_TYPE_LABELS } from '@/lib/claims/claimTypes';

/** Canonical claim-type labels plus legacy shorthand still present in stored rows. */
export const CLAIM_TYPE_LABELS: Record<string, string> = {
  ...CANONICAL_CLAIM_TYPE_LABELS,
  missing_parcel: 'Missing parcel',
};

/** Humanise a raw enum value: underscores → spaces, sentence case. Display fallback only. */
export function humanizeEnumValue(value: string): string {
  const words = value.replace(/_/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Humanise known enum/evidence tokens before they reach merchant-facing copy. */
export function sanitizeMerchantText(value: string): string {
  return value.replace(/\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/g, humanizeEnumValue);
}

/**
 * Display labels for merchant-recorded outcome values. Legacy fraud-era values
 * map to neutral policy language and must never render raw.
 */
export const OUTCOME_LABELS: Record<string, string> = {
  loss: 'Recorded as loss',
  recovered: 'Recovered',
  pending: 'Outcome pending',
  chargeback_won: 'Chargeback won',
  chargeback_lost: 'Chargeback lost',
  customer_verified: 'Customer verified',
  // Read-compat: legacy accusation-style value displays as a neutral policy denial.
  suspected_fraud: 'Denied under policy',
  legitimate: 'Resolved as legitimate',
};

export function outcomeLabel(outcome: string): string {
  return OUTCOME_LABELS[outcome] ?? humanizeEnumValue(outcome);
}

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
  investigation_open_count?: number;
  investigation_overdue_count?: number;
  investigation_awaiting_review_count?: number;
  investigation_waiting_target?: string | null;
  investigation_waiting_party?: string | null;
  investigation_next_due_at?: string | null;
  investigation_evidence_gap?: string | null;
  investigation_latest_response?: string | null;
  evidence_posture?: 'strong' | 'contestable' | 'insufficient' | 'not_assessable' | 'unavailable' | null;
  apparent_responsibility?: string | null;
  claim_readiness?: string | null;
  claim_deadline?: string | null;
  provider_position?: string | null;
  money_outcome?: string | null;
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
