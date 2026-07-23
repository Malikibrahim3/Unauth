/**
 * Idempotent merchant-timeline projection for durable audit domain events.
 *
 * `domain_events` is the durable source. `user_action_log` is a readable
 * projection and may safely be rebuilt/retried because domain_event_id is
 * unique. Never copy credentials or arbitrary business rows into this table;
 * the database capture function supplies a deliberately bounded payload.
 */
import type { DomainEventHandler } from '@/lib/events/handlers/types';

type AuditPayload = {
  action?: unknown;
  resource_type?: unknown;
  resource_id?: unknown;
  actor_role?: unknown;
  meaning?: unknown;
  effective_at?: unknown;
  recorded_at?: unknown;
  idempotency_reference?: unknown;
  request_ip?: unknown;
  metadata?: unknown;
};

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function auditPayload(payload: Record<string, unknown> | null): AuditPayload {
  const candidate = payload?.audit;
  return candidate && typeof candidate === 'object' && !Array.isArray(candidate)
    ? candidate as AuditPayload
    : {};
}

export const auditTimelineProjection: DomainEventHandler = async (client, event) => {
  if (event.event_type !== 'audit.action_recorded') {
    return { applied: false, detail: 'event_type_not_supported' };
  }

  const audit = auditPayload(event.payload);
  const action = stringOrNull(audit.action);
  if (!action) throw new Error('audit_projection_invalid_payload: action_required');

  const metadata = audit.metadata && typeof audit.metadata === 'object' && !Array.isArray(audit.metadata)
    ? audit.metadata as Record<string, unknown>
    : {};
  const recordedAt = stringOrNull(audit.recorded_at) ?? event.recorded_at ?? new Date().toISOString();
  const effectiveAt = stringOrNull(audit.effective_at) ?? event.occurred_at ?? recordedAt;

  const { error } = await client.from('user_action_log').upsert({
    merchant_id: event.merchant_id,
    domain_event_id: event.id,
    actor_user_id: event.actor_id ?? null,
    actor_type: event.actor_type ?? (event.actor_id ? 'user' : 'system'),
    actor_role: stringOrNull(audit.actor_role) ?? (event.actor_id ? 'unknown' : 'system'),
    action,
    resource_type: stringOrNull(audit.resource_type) ?? event.aggregate_type,
    resource_id: stringOrNull(audit.resource_id) ?? event.aggregate_id,
    metadata,
    request_ip: stringOrNull(audit.request_ip),
    correlation_id: event.correlation_id ?? null,
    idempotency_reference: stringOrNull(audit.idempotency_reference) ?? event.idempotency_key ?? event.id,
    effective_at: effectiveAt,
    recorded_at: recordedAt,
    meaning: stringOrNull(audit.meaning) ?? action.replace(/_/g, ' '),
    created_at: recordedAt,
  }, {
    onConflict: 'domain_event_id',
    ignoreDuplicates: true,
  });
  if (error) throw new Error(`audit_timeline_projection_failed: ${error.message}`);
  return { applied: true };
};
