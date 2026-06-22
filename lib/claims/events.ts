import { z } from 'zod';

export const claimEventTypeSchema = z.enum([
  'claim_created',
  'claim_updated',
  'claim_viewed',
  'claim_assigned',
  'claim_unassigned',
  'claim_snoozed',
  'claim_unsnoozed',
  'note_added',
  'evidence_added',
  'outcome_added',
  'status_changed',
  'claim_resolved',
  'claim_reopened',
  'decision_reversed',
  'customer_response_copied',
  'customer_response_saved',
  'escalation_added',
]);

export type ClaimEventType = z.infer<typeof claimEventTypeSchema>;

export type ClaimEventInput = {
  claim_id: string;
  merchant_id?: string | null;
  event_type: ClaimEventType;
  previous_status?: string | null;
  new_status?: string | null;
  previous_decision?: string | null;
  new_decision?: string | null;
  previous_outcome?: string | null;
  new_outcome?: string | null;
  note?: string | null;
  actor_user_id?: string | null;
  actor_email_hash?: string | null;
  triggered_by?: string | null;
  triggered_at?: string | null;
  metadata?: Record<string, unknown>;
};

export async function appendClaimEvent(supabase: any, input: ClaimEventInput) {
  if (!input.merchant_id) {
    throw new Error('insert claim_events failed: merchant_id is required');
  }
  const metadata = input.metadata ?? {};
  const triggeredBy =
    input.triggered_by ??
    (typeof metadata.triggered_by === 'string' ? metadata.triggered_by : null) ??
    input.event_type;
  // v2 claim_events keeps status transitions in dedicated columns; decision /
  // outcome transitions and actor context live in metadata.
  const payload = {
    claim_id: input.claim_id,
    merchant_id: input.merchant_id,
    event_type: input.event_type,
    from_status: input.previous_status ?? null,
    to_status: input.new_status ?? null,
    note: input.note ?? null,
    actor_user_id: input.actor_user_id ?? null,
    metadata: {
      ...metadata,
      triggered_by: triggeredBy,
      triggered_at: input.triggered_at ?? new Date().toISOString(),
      ...(input.previous_decision != null ? { previous_decision: input.previous_decision } : {}),
      ...(input.new_decision != null ? { new_decision: input.new_decision } : {}),
      ...(input.previous_outcome != null ? { previous_outcome: input.previous_outcome } : {}),
      ...(input.new_outcome != null ? { new_outcome: input.new_outcome } : {}),
      ...(input.actor_email_hash != null ? { actor_email_hash: input.actor_email_hash } : {}),
    },
  };

  const { data, error } = await supabase
    .from('claim_events')
    .insert(payload)
    .select()
    .single();
  if (error) throw new Error(`insert claim_events failed: ${error.message}`);
  return data;
}

export function claimEventLabel(eventType: string): string {
  const labels: Record<string, string> = {
    claim_created: 'Claim created',
    claim_updated: 'Claim updated',
    claim_viewed: 'Claim viewed',
    claim_assigned: 'Reviewer updated',
    claim_unassigned: 'Reviewer cleared',
    claim_snoozed: 'Review deferred',
    claim_unsnoozed: 'Review resumed',
    note_added: 'Internal note added',
    evidence_added: 'Evidence pulled',
    outcome_added: 'Outcome recorded',
    status_changed: 'Status changed',
    claim_resolved: 'Outcome recorded',
    claim_reopened: 'Claim reopened',
    decision_reversed: 'Decision reversed',
    customer_response_copied: 'Customer response copied',
    customer_response_saved: 'Customer response saved',
    escalation_added: 'High evidence flag added',
  };
  return labels[eventType] ?? eventType.replace(/_/g, ' ');
}

type ClaimEventSummaryInput = {
  event_type: string;
  previous_status?: string | null;
  new_status?: string | null;
  previous_decision?: string | null;
  new_decision?: string | null;
  previous_outcome?: string | null;
  new_outcome?: string | null;
  note?: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  open: 'Active',
  pending: 'Waiting on source data',
  escalated: 'High evidence',
  resolved_refunded: 'Outcome recorded: refunded',
  resolved_won: 'Outcome recorded: won',
  resolved_lost: 'Outcome recorded: lost',
  resolved_denied: 'Outcome recorded: denied',
  resolved_exchanged: 'Outcome recorded: exchanged',
  voided: 'Voided',
  stale: 'Stale',
};

const DECISION_LABELS: Record<string, string> = {
  approved: 'Approved',
  denied: 'Denied',
  escalated: 'Escalated',
  partial_refund: 'Partial refund',
  full_refund: 'Full refund',
  chargeback_disputed: 'Chargeback disputed',
  // Read-compat: historical 'blacklist' decisions display as a neutral policy denial.
  blacklist: 'Denied under policy',
  no_action: 'No action',
};

const OUTCOME_LABELS: Record<string, string> = {
  loss: 'Loss accepted',
  recovered: 'Recovered',
  pending: 'Pending',
  chargeback_won: 'Chargeback won',
  chargeback_lost: 'Chargeback lost',
  customer_verified: 'Customer verified',
  // Read-compat: historical outcome value displays as a neutral review label.
  suspected_fraud: 'Review required',
  legitimate: 'Legitimate',
};

function humanStatus(value: string | null | undefined): string {
  if (!value) return '—';
  return STATUS_LABELS[value] ?? value.replace(/_/g, ' ');
}

function humanDecision(value: string | null | undefined): string {
  if (!value) return '—';
  return DECISION_LABELS[value] ?? value.replace(/_/g, ' ');
}

function humanOutcome(value: string | null | undefined): string {
  if (!value) return '—';
  return OUTCOME_LABELS[value] ?? value.replace(/_/g, ' ');
}

/** Human-readable one-line summary for claim timeline rows. */
export function claimEventSummary(event: ClaimEventSummaryInput): string {
  const parts: string[] = [];

  if (event.previous_status && event.new_status && event.previous_status !== event.new_status) {
    parts.push(`Status: ${humanStatus(event.previous_status)} → ${humanStatus(event.new_status)}`);
  }
  if (event.previous_decision && event.new_decision && event.previous_decision !== event.new_decision) {
    parts.push(`Decision: ${humanDecision(event.previous_decision)} → ${humanDecision(event.new_decision)}`);
  }
  if (event.previous_outcome && event.new_outcome && event.previous_outcome !== event.new_outcome) {
    parts.push(`Outcome: ${humanOutcome(event.previous_outcome)} → ${humanOutcome(event.new_outcome)}`);
  }

  if (parts.length > 0) return parts.join(' · ');
  if (event.note?.trim()) return event.note.trim();

  switch (event.event_type) {
    case 'claim_created':
      return 'A new claim was opened for this order.';
    case 'claim_viewed':
      return 'The claim was opened for review.';
    case 'claim_assigned':
      return 'A reviewer was linked to this claim record.';
    case 'claim_unassigned':
      return 'Reviewer link was cleared from this claim record.';
    case 'claim_snoozed':
      return 'Evidence review was deferred until follow-up is due.';
    case 'claim_unsnoozed':
      return 'Evidence review resumed for this claim.';
    case 'evidence_added':
      return 'Supporting evidence was attached to the claim.';
    case 'outcome_added':
      return 'An outcome was recorded for analyst review.';
    case 'customer_response_copied':
      return 'The customer-safe response template was copied.';
    case 'customer_response_saved':
      return 'The customer-safe response text was saved.';
    case 'claim_reopened':
      return 'The claim was reopened for further review.';
    case 'decision_reversed':
      return 'The previous decision was reversed with a documented reason.';
    case 'escalation_added':
      return 'The claim was escalated for manager review.';
    default:
      return 'Claim activity recorded.';
  }
}

export function claimHasEvidence(input: { evidence_count?: number | null; events?: Array<{ event_type?: string | null }> | null }): boolean {
  return (input.evidence_count ?? 0) > 0 || (input.events ?? []).some((event) => event.event_type === 'evidence_added');
}
