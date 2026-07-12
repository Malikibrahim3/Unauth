/**
 * Dead-letter operations for the domain-event delivery ledger.
 *
 * The cron worker only claims `pending`/`failed` deliveries; once a delivery
 * exhausts its attempts it becomes `dead_letter` (terminal). These operations
 * let an authorised operator work the DLQ:
 *   - retry:  reset a failed/dead_letter delivery to `pending` (attempts cleared)
 *             so the worker re-attempts it on the next tick;
 *   - ignore: mark it `ignored` (terminal) so it stops surfacing;
 *   - replay: re-run the handler for it immediately and record the outcome.
 *
 * Every operation is merchant-scoped.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';
import { DOMAIN_EVENT_HANDLERS } from '@/lib/events/handlers/registry';
import type { DomainEventRecord } from '@/lib/events/handlers/types';

export type DeadLetterOp = 'retry' | 'ignore' | 'replay';

export type DeadLetterDelivery = {
  id: string;
  domain_event_id: string;
  handler_name: string;
  status: string;
  attempts: number;
  max_attempts: number;
  last_error: string | null;
  next_attempt_at: string | null;
  updated_at: string | null;
};

const WORKABLE = ['failed', 'dead_letter'];

export async function listDeadLetterDeliveries(
  client: SupabaseClient,
  merchantId: string,
  options: { status?: string[]; limit?: number } = {},
): Promise<DeadLetterDelivery[]> {
  const statuses = options.status ?? ['dead_letter'];
  const { data, error } = await client
    .from(TABLES.DOMAIN_EVENT_DELIVERIES)
    .select('id,domain_event_id,handler_name,status,attempts,max_attempts,last_error,next_attempt_at,updated_at')
    .eq('merchant_id', merchantId)
    .in('status', statuses)
    .order('updated_at', { ascending: false })
    .limit(options.limit ?? 100);
  if (error) throw new Error(`dlq_list_failed: ${error.message}`);
  return (data ?? []) as DeadLetterDelivery[];
}

async function loadWorkable(client: SupabaseClient, merchantId: string, deliveryId: string) {
  const { data, error } = await client
    .from(TABLES.DOMAIN_EVENT_DELIVERIES)
    .select('id,merchant_id,domain_event_id,handler_name,status')
    .eq('merchant_id', merchantId)
    .eq('id', deliveryId)
    .maybeSingle();
  if (error) throw new Error(`dlq_load_failed: ${error.message}`);
  return data as { id: string; domain_event_id: string; handler_name: string; status: string } | null;
}

export async function retryDeadLetterDelivery(client: SupabaseClient, merchantId: string, deliveryId: string) {
  const delivery = await loadWorkable(client, merchantId, deliveryId);
  if (!delivery) return { ok: false as const, reason: 'not_found' };
  if (!WORKABLE.includes(delivery.status)) return { ok: false as const, reason: 'not_workable' };
  const { error } = await client
    .from(TABLES.DOMAIN_EVENT_DELIVERIES)
    .update({ status: 'pending', attempts: 0, last_error: null, next_attempt_at: new Date().toISOString(), leased_by: null, leased_until: null })
    .eq('merchant_id', merchantId)
    .eq('id', deliveryId);
  if (error) throw new Error(`dlq_retry_failed: ${error.message}`);
  return { ok: true as const, status: 'pending' };
}

export async function ignoreDeadLetterDelivery(client: SupabaseClient, merchantId: string, deliveryId: string) {
  const delivery = await loadWorkable(client, merchantId, deliveryId);
  if (!delivery) return { ok: false as const, reason: 'not_found' };
  if (!WORKABLE.includes(delivery.status)) return { ok: false as const, reason: 'not_workable' };
  const { error } = await client
    .from(TABLES.DOMAIN_EVENT_DELIVERIES)
    .update({ status: 'ignored', leased_by: null, leased_until: null })
    .eq('merchant_id', merchantId)
    .eq('id', deliveryId);
  if (error) throw new Error(`dlq_ignore_failed: ${error.message}`);
  return { ok: true as const, status: 'ignored' };
}

export async function replayDeadLetterDelivery(client: SupabaseClient, merchantId: string, deliveryId: string) {
  const delivery = await loadWorkable(client, merchantId, deliveryId);
  if (!delivery) return { ok: false as const, reason: 'not_found' };
  if (!WORKABLE.includes(delivery.status)) return { ok: false as const, reason: 'not_workable' };
  const handler = DOMAIN_EVENT_HANDLERS[delivery.handler_name];
  if (!handler) return { ok: false as const, reason: 'unknown_handler' };

  const { data: event, error: eventError } = await client
    .from(TABLES.DOMAIN_EVENTS)
    .select('id,merchant_id,event_type,aggregate_type,aggregate_id,payload,occurred_at,recorded_at')
    .eq('merchant_id', merchantId)
    .eq('id', delivery.domain_event_id)
    .maybeSingle();
  if (eventError) throw new Error(`dlq_replay_event_read_failed: ${eventError.message}`);
  if (!event) return { ok: false as const, reason: 'event_not_found' };

  try {
    await handler(client, event as DomainEventRecord);
    const { error } = await client.rpc('complete_domain_event_delivery', { p_delivery_id: deliveryId });
    if (error) throw new Error(error.message);
    return { ok: true as const, status: 'completed' };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    await client.rpc('fail_domain_event_delivery', { p_delivery_id: deliveryId, p_error: message.slice(0, 1000), p_backoff_seconds: 30 });
    return { ok: false as const, reason: 'replay_failed', error: message };
  }
}

export async function runDeadLetterOp(
  client: SupabaseClient,
  merchantId: string,
  op: DeadLetterOp,
  deliveryId: string,
) {
  switch (op) {
    case 'retry': return retryDeadLetterDelivery(client, merchantId, deliveryId);
    case 'ignore': return ignoreDeadLetterDelivery(client, merchantId, deliveryId);
    case 'replay': return replayDeadLetterDelivery(client, merchantId, deliveryId);
  }
}
