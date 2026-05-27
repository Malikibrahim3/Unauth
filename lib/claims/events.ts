import { z } from 'zod';

export const claimEventTypeSchema = z.enum([
  'claim_created',
  'claim_updated',
  'note_added',
  'evidence_added',
  'outcome_added',
  'status_changed',
  'claim_resolved',
  'claim_reopened',
  'decision_reversed',
  'customer_response_copied',
  'escalation_added',
]);

export type ClaimEventType = z.infer<typeof claimEventTypeSchema>;

export type ClaimEventInput = {
  claim_id: string;
  merchant_id?: string | null;
  shop_domain?: string | null;
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
  metadata?: Record<string, unknown>;
};

export async function appendClaimEvent(supabase: any, input: ClaimEventInput) {
  const payload = {
    claim_id: input.claim_id,
    merchant_id: input.merchant_id ?? null,
    shop_domain: input.shop_domain ?? null,
    event_type: input.event_type,
    previous_status: input.previous_status ?? null,
    new_status: input.new_status ?? null,
    previous_decision: input.previous_decision ?? null,
    new_decision: input.new_decision ?? null,
    previous_outcome: input.previous_outcome ?? null,
    new_outcome: input.new_outcome ?? null,
    note: input.note ?? null,
    actor_user_id: input.actor_user_id ?? null,
    actor_email_hash: input.actor_email_hash ?? null,
    metadata: input.metadata ?? {},
  };

  const { data, error } = await supabase
    .from('claim_events' as any)
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
    note_added: 'Internal note added',
    evidence_added: 'Evidence added',
    outcome_added: 'Outcome recorded',
    status_changed: 'Status changed',
    claim_resolved: 'Claim resolved',
    claim_reopened: 'Claim reopened',
    decision_reversed: 'Decision reversed',
    customer_response_copied: 'Customer response copied',
    escalation_added: 'Claim escalated',
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
  open: 'Open',
  under_review: 'Under review',
  evidence_requested: 'Evidence requested',
  pending: 'Pending external evidence',
  escalated: 'Escalated',
  resolved: 'Resolved',
  closed: 'Closed',
};

const DECISION_LABELS: Record<string, string> = {
  approved: 'Approved',
  denied: 'Denied',
  escalated: 'Escalated',
  partial_refund: 'Partial refund',
  full_refund: 'Full refund',
  chargeback_disputed: 'Chargeback disputed',
  blacklist: 'Blacklisted',
  no_action: 'No action',
};

const OUTCOME_LABELS: Record<string, string> = {
  loss: 'Loss accepted',
  recovered: 'Recovered',
  pending: 'Pending',
  chargeback_won: 'Chargeback won',
  chargeback_lost: 'Chargeback lost',
  customer_verified: 'Customer verified',
  suspected_fraud: 'Suspected fraud',
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
    case 'evidence_added':
      return 'Supporting evidence was attached to the claim.';
    case 'outcome_added':
      return 'An outcome was recorded for analyst review.';
    case 'customer_response_copied':
      return 'The customer-safe response template was copied.';
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
