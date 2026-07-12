import type { SupabaseClient } from '@supabase/supabase-js';
import type { ShipBobEnvironment } from './shipbobEnvironment';

export type ShipBobAuditAction =
  | 'shipbob_connection_started' | 'shipbob_connection_completed' | 'shipbob_authorization_failed'
  | 'shipbob_reconnected' | 'shipbob_disconnected'
  | 'shipbob_initial_import_queued' | 'shipbob_initial_import_completed' | 'shipbob_initial_import_failed'
  | 'shipbob_manual_sync_requested' | 'shipbob_manual_sync_completed' | 'shipbob_manual_sync_failed'
  | 'shipbob_webhook_subscription_created' | 'shipbob_webhook_subscription_removed';

const FORBIDDEN = /token|secret|authorization.?code|payload/i;

export function safeShipBobAuditMetadata(metadata: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(metadata).filter(([key]) => !FORBIDDEN.test(key)));
}

export async function recordShipBobAudit(client: SupabaseClient, input: {
  merchantId: string; action: ShipBobAuditAction; connectionId?: string | null;
  environment: ShipBobEnvironment; status: 'started' | 'completed' | 'failed' | 'queued';
  actorUserId?: string | null; actorRole?: string; metadata?: Record<string, unknown>;
}) {
  const { error } = await client.from('user_action_log').insert({
    merchant_id: input.merchantId,
    actor_user_id: input.actorUserId ?? null,
    actor_role: input.actorRole ?? (input.actorUserId ? 'merchant' : 'system'),
    action: input.action,
    resource_type: 'integration_connection',
    resource_id: input.connectionId ?? null,
    metadata: safeShipBobAuditMetadata({ provider: 'shipbob', environment: input.environment, status: input.status, ...(input.metadata ?? {}) }),
  });
  if (error) console.error('shipbob_audit_insert_failed', { action: input.action, category: error.code ?? 'database_error' });
}
