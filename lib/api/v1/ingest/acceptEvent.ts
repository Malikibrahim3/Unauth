/**
 * Accept a validated canonical event: derive its idempotency key, enqueue it to
 * the ingestion inbox atomically, and return a transport-neutral result. The
 * route only validates and enqueues — it never runs case/rule/recovery logic
 * synchronously (that is the domain-event worker's job).
 *
 * See ARCHITECTURE.md §7.1.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { enqueueIngestionEvent } from '@/lib/connectors/ingestionInbox';
import type { EventEnvelope } from '@/lib/api/v1/ingest/eventSchema';

export type AcceptEventResult =
  | { status: 202; body: { ingestion_event_id: string; duplicate: boolean; status_url: string } }
  | { status: 409; body: { error: 'idempotency_payload_conflict'; ingestion_event_id: string } };

/** Idempotency key: (source system/account, event id) — merchant scope is added by the inbox. */
export function buildEventIdempotencyKey(envelope: EventEnvelope): string {
  return `${envelope.source.system}:${envelope.source.account_id ?? ''}:${envelope.id}`;
}

export async function acceptEvent(
  client: SupabaseClient,
  merchantId: string,
  envelope: EventEnvelope,
): Promise<AcceptEventResult> {
  const idempotencyKey = buildEventIdempotencyKey(envelope);

  const result = await enqueueIngestionEvent(client, {
    merchantId,
    sourceSystem: envelope.source.system,
    sourceAccountRef: envelope.source.account_id ?? null,
    providerEventId: envelope.id,
    eventType: envelope.type,
    idempotencyKey,
    payload: envelope,
  });

  if (result.status === 'conflict') {
    // Surface the conflict as an integration-health issue; never overwrite.
    await client.from('ingestion_field_errors').insert({
      merchant_id: merchantId,
      ingestion_event_id: result.ingestionEventId,
      field: 'idempotency_key',
      code: 'idempotency_payload_conflict',
      severity: 'error',
      message: `Event ${idempotencyKey} was re-sent with a different payload.`,
    });
    return { status: 409, body: { error: 'idempotency_payload_conflict', ingestion_event_id: result.ingestionEventId } };
  }

  return {
    status: 202,
    body: {
      ingestion_event_id: result.ingestionEventId,
      duplicate: result.duplicate,
      status_url: `/api/v1/ingest/events/${result.ingestionEventId}`,
    },
  };
}
