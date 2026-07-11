/** Domain-event delivery dispatcher backed by the leased delivery ledger. */
import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';
import { caseProjection } from '@/lib/events/handlers/caseProjection';
import { financialProjection } from '@/lib/events/handlers/financialProjection';
import { notificationProjection } from '@/lib/events/handlers/notificationProjection';
import type { DomainEventHandler, DomainEventRecord } from '@/lib/events/handlers/types';

export const DOMAIN_EVENT_HANDLERS: Record<string, DomainEventHandler> = {
  caseProjection,
  financialProjection,
  notificationProjection,
};

type Delivery = { id: string; domain_event_id: string; handler_name: string };

export async function runDomainEventHandler(
  client: SupabaseClient,
  handlerName: string,
  options: { limit?: number; workerId?: string; leaseSeconds?: number } = {},
): Promise<{ processed: number; failed: number }> {
  const handler = DOMAIN_EVENT_HANDLERS[handlerName];
  if (!handler) throw new Error(`unknown_domain_event_handler: ${handlerName}`);
  const { data: deliveries, error } = await client.rpc('claim_domain_event_deliveries', {
    p_handler_name: handlerName,
    p_limit: options.limit ?? 20,
    p_worker_id: options.workerId ?? 'domain-event-cron',
    p_lease_seconds: options.leaseSeconds ?? 60,
  });
  if (error) throw new Error(`claim_domain_event_deliveries_failed: ${error.message}`);

  let processed = 0;
  let failed = 0;
  for (const delivery of ((deliveries ?? []) as Delivery[])) {
    try {
      const { data: event, error: eventError } = await client
        .from(TABLES.DOMAIN_EVENTS)
        .select('id,merchant_id,event_type,aggregate_type,aggregate_id,payload,occurred_at,recorded_at')
        .eq('id', delivery.domain_event_id)
        .maybeSingle();
      if (eventError) throw new Error(`domain_event_read_failed: ${eventError.message}`);
      if (!event) throw new Error('domain_event_not_found');
      await handler(client, event as DomainEventRecord);
      const { error: completeError } = await client.rpc('complete_domain_event_delivery', {
        p_delivery_id: delivery.id,
      });
      if (completeError) throw new Error(`complete_domain_event_delivery_failed: ${completeError.message}`);
      processed += 1;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      await client.rpc('fail_domain_event_delivery', {
        p_delivery_id: delivery.id,
        p_error: message.slice(0, 1000),
        p_backoff_seconds: 30,
      });
      failed += 1;
    }
  }
  return { processed, failed };
}

export async function runDomainEventHandlers(
  client: SupabaseClient,
  options: { limitPerHandler?: number; workerId?: string } = {},
): Promise<Record<string, { processed: number; failed: number }>> {
  const result: Record<string, { processed: number; failed: number }> = {};
  for (const handlerName of Object.keys(DOMAIN_EVENT_HANDLERS)) {
    result[handlerName] = await runDomainEventHandler(client, handlerName, {
      limit: options.limitPerHandler,
      workerId: options.workerId,
    });
  }
  return result;
}
