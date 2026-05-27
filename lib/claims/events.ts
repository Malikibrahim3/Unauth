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
    note_added: 'Note added',
    evidence_added: 'Evidence added',
    outcome_added: 'Outcome added',
    status_changed: 'Status changed',
    claim_resolved: 'Claim resolved',
    claim_reopened: 'Claim reopened',
    decision_reversed: 'Decision reversed',
    customer_response_copied: 'Customer response copied',
    escalation_added: 'Escalation added',
  };
  return labels[eventType] ?? eventType;
}
