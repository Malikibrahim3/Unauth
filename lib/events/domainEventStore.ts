/**
 * Domain event store — provider-neutral, append-only outbox.
 *
 * `domain_events` is immutable (a DB trigger blocks UPDATE/DELETE). Events are
 * written through the `record_domain_event` RPC, which is idempotent on
 * `(merchant_id, idempotency_key)` and optionally registers per-handler
 * delivery rows. Handlers claim/complete/fail deliveries through their own RPCs.
 *
 * See ARCHITECTURE.md §2.4 / §4.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

/** MVP+ internal event vocabulary (namespaced, past-tense facts). */
export const DOMAIN_EVENT_TYPES = [
  'customer.created', 'customer.updated',
  'order.created', 'order.updated',
  'refund.created', 'refund.updated',
  'replacement.created', 'replacement.updated',
  'fulfilment.created', 'fulfilment.updated',
  'shipment.created', 'shipment.updated', 'shipment.delivered', 'shipment.exception_recorded',
  'tracking_event.recorded',
  'return.created', 'return.updated', 'return.overdue',
  'dispute.created', 'dispute.updated',
  'ticket.created', 'ticket.updated', 'message.created',
  'evidence.created', 'evidence.updated',
  'relationship.confirmed', 'relationship.ambiguous', 'relationship.resolved',
  'case.created', 'case.updated', 'case.assigned', 'case.decision_recorded',
  'case.outcome_reconciled', 'case.prevention_confirmed', 'case.closed',
  'investigation.created', 'investigation.updated', 'investigation.sent',
  'investigation.send_failed', 'investigation.chased',
  'investigation.response_recorded', 'investigation.closed',
  'investigation.cancelled',
  'case.issue_corrected', 'responsibility.confirmed',
  'responsibility.corrected', 'recovery.handoff_requested',
  'rule.evaluated',
  'loss.created', 'loss.confirmed', 'loss.written_off',
  'recovery.created', 'recovery.status_changed', 'recovery.submitted', 'recovery.completed',
  'task.created', 'task.assigned', 'task.completed',
  'notification.requested', 'notification.delivered', 'notification.failed',
  'connection.sync_started', 'connection.sync_completed', 'connection.sync_failed',
  'audit.action_recorded',
] as const;

export type DomainEventType = (typeof DOMAIN_EVENT_TYPES)[number];

export type RecordDomainEventInput = {
  merchantId: string;
  eventType: DomainEventType | string;
  aggregateType: string;
  aggregateId?: string | null;
  idempotencyKey: string;
  payload?: Record<string, unknown>;
  sourceRecordId?: string | null;
  connectionId?: string | null;
  ingestionEventId?: string | null;
  actorType?: string;
  actorId?: string | null;
  occurredAt?: string;
  correlationId?: string | null;
  causationId?: string | null;
  /** Handler names to register delivery rows for. */
  handlers?: string[];
};

/**
 * Record a domain event through the idempotent `record_domain_event` RPC.
 * A replayed idempotency key returns the existing row and registers no new
 * deliveries. Requires a service-role client (the RPC is service-role only).
 */
export async function recordDomainEvent(
  client: SupabaseClient,
  input: RecordDomainEventInput,
) {
  const { data, error } = await client.rpc('record_domain_event', {
    p_merchant_id: input.merchantId,
    p_event_type: input.eventType,
    p_aggregate_type: input.aggregateType,
    p_aggregate_id: input.aggregateId ?? null,
    p_idempotency_key: input.idempotencyKey,
    p_payload: input.payload ?? {},
    p_source_record_id: input.sourceRecordId ?? null,
    p_connection_id: input.connectionId ?? null,
    p_ingestion_event_id: input.ingestionEventId ?? null,
    p_actor_type: input.actorType ?? 'system',
    p_actor_id: input.actorId ?? null,
    p_occurred_at: input.occurredAt ?? new Date().toISOString(),
    p_correlation_id: input.correlationId ?? null,
    p_causation_id: input.causationId ?? null,
    p_handlers: input.handlers ?? [],
  });
  if (error) throw error;
  return data;
}
