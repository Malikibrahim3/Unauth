/**
 * Domain-event handler contract. Handlers are deterministic projections invoked
 * once per (domain_event_id, handler_name) delivery. They must be idempotent:
 * re-running a delivery for the same event must not double-apply side effects.
 *
 * See ARCHITECTURE.md §6.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export type DomainEventRecord = {
  id: string;
  merchant_id: string;
  event_type: string;
  aggregate_type: string;
  aggregate_id: string | null;
  payload: Record<string, unknown> | null;
  actor_type?: string | null;
  actor_id?: string | null;
  correlation_id?: string | null;
  idempotency_key?: string;
  occurred_at: string | null;
  recorded_at: string | null;
};

export type HandlerResult = { applied: boolean; detail?: string };

export type DomainEventHandler = (
  client: SupabaseClient,
  event: DomainEventRecord,
) => Promise<HandlerResult>;
