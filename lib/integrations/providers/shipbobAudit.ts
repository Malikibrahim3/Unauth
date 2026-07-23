import type { SupabaseClient } from '@supabase/supabase-js';
import type { ShipBobEnvironment } from './shipbobEnvironment';
import { recordDomainEvent } from '@/lib/events/domainEventStore';

export type ShipBobAuditAction =
  | 'shipbob_connection_started' | 'shipbob_connection_completed' | 'shipbob_authorization_failed'
  | 'shipbob_reconnected' | 'shipbob_disconnected'
  | 'shipbob_initial_import_queued' | 'shipbob_initial_import_completed' | 'shipbob_initial_import_failed'
  | 'shipbob_manual_sync_requested' | 'shipbob_manual_sync_completed' | 'shipbob_manual_sync_failed'
  | 'shipbob_webhook_subscription_created' | 'shipbob_webhook_subscription_removed';

const SAFE_METADATA_KEYS = new Set([
  'provider',
  'environment',
  'status',
  'sourceAccountId',
  'subscriptionCount',
  'jobId',
  'recordCount',
  'failureCategory',
  'cleanup',
]);

export function safeShipBobAuditMetadata(metadata: Record<string, unknown>) {
  const safe: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (!SAFE_METADATA_KEYS.has(key)) continue;
    if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
      safe[key] = value;
      continue;
    }
    if (typeof value !== 'string') continue;
    if (key === 'failureCategory') {
      const category = value.trim().match(/^([a-z][a-z0-9]*(?:[_-][a-z0-9]+)+)(?=[:\s(]|$)/i)?.[1]
        ?.toLowerCase()
        .replaceAll('-', '_')
        .slice(0, 80);
      safe[key] = category || 'integration_error';
      continue;
    }
    safe[key] = value.slice(0, 160);
  }
  return safe;
}

export async function recordShipBobAudit(client: SupabaseClient, input: {
  merchantId: string; action: ShipBobAuditAction; connectionId?: string | null;
  environment: ShipBobEnvironment; status: 'started' | 'completed' | 'failed' | 'queued';
  actorUserId?: string | null; actorRole?: string; metadata?: Record<string, unknown>;
}) {
  const metadata = safeShipBobAuditMetadata({
    provider: 'shipbob',
    environment: input.environment,
    status: input.status,
    ...(input.metadata ?? {}),
  });
  const stableReference = typeof metadata.jobId === 'string'
    ? metadata.jobId
    : input.connectionId ?? crypto.randomUUID();
  const now = new Date().toISOString();
  return recordDomainEvent(client, {
    merchantId: input.merchantId,
    eventType: 'audit.action_recorded',
    aggregateType: 'integration_connection',
    aggregateId: input.connectionId ?? null,
    idempotencyKey: `audit:shipbob:${input.action}:${stableReference}`,
    actorType: input.actorUserId ? 'user' : 'system',
    actorId: input.actorUserId ?? null,
    occurredAt: now,
    correlationId: crypto.randomUUID(),
    handlers: ['auditTimelineProjection'],
    payload: {
      audit: {
        action: input.action,
        resource_type: 'integration_connection',
        resource_id: input.connectionId ?? null,
        actor_role: input.actorRole ?? (input.actorUserId ? 'merchant' : 'system'),
        meaning: input.action.replaceAll('_', ' '),
        effective_at: now,
        recorded_at: now,
        idempotency_reference: `shipbob:${input.action}:${stableReference}`,
        metadata,
      },
    },
  });
}
