/**
 * Authenticated ingestion inbox.
 *
 * Every inbound event (provider webhook, canonical webhook, API, CSV row batch)
 * is enqueued here BEFORE any case/rule/recovery logic runs. Idempotency is the
 * unique `(merchant_id, idempotency_key)` constraint on `ingestion_events`, so
 * the enqueue is atomic: exactly one caller inserts the row, every duplicate
 * detects the existing row. A same-key event with a different payload hash is a
 * conflict (surfaced, not silently overwritten).
 *
 * Reads are service-role only (raw payloads are never merchant-readable).
 *
 * See ARCHITECTURE.md §2.1 / §7.1.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';
import { TABLES } from '@/lib/supabase/tables';

export type EnqueueIngestionInput = {
  merchantId: string;
  connectionId?: string | null;
  sourceSystem: string;
  sourceAccountRef?: string | null;
  providerEventId?: string | null;
  eventType?: string | null;
  /** Stable idempotency key: `(source system/account, event id)` derived. */
  idempotencyKey: string;
  /** Raw payload — hashed for conflict detection; stored inline or by ref. */
  payload?: unknown;
  payloadRef?: string | null;
  retentionDeadline?: string | null;
};

export type EnqueueResult =
  | { status: 'enqueued'; ingestionEventId: string; duplicate: false }
  | { status: 'duplicate'; ingestionEventId: string; duplicate: true }
  | { status: 'conflict'; ingestionEventId: string; duplicate: true; reason: 'idempotency_payload_conflict' };

export function hashPayload(payload: unknown): string {
  return createHash('sha256').update(JSON.stringify(payload ?? null)).digest('hex');
}

/**
 * Atomically enqueue an ingestion event. Returns:
 *  - `enqueued` when this call inserted the row;
 *  - `duplicate` when an identical event already exists (same payload hash);
 *  - `conflict` when the key was reused with a different payload hash.
 */
export async function enqueueIngestionEvent(
  client: SupabaseClient,
  input: EnqueueIngestionInput,
): Promise<EnqueueResult> {
  const payloadHash = hashPayload(input.payload);
  const row = {
    merchant_id: input.merchantId,
    connection_id: input.connectionId ?? null,
    source_system: input.sourceSystem,
    source_account_ref: input.sourceAccountRef ?? null,
    provider_event_id: input.providerEventId ?? null,
    event_type: input.eventType ?? null,
    idempotency_key: input.idempotencyKey,
    payload_hash: payloadHash,
    payload_ref: input.payloadRef ?? null,
    payload: input.payload ?? null,
    retention_deadline: input.retentionDeadline ?? null,
  };

  // Atomic idempotent insert: exactly one caller wins; duplicates get no row.
  const { data: inserted, error } = await client
    .from(TABLES.INGESTION_EVENTS)
    .insert(row)
    .select('id')
    .maybeSingle();

  if (!error && inserted) {
    return { status: 'enqueued', ingestionEventId: (inserted as { id: string }).id, duplicate: false };
  }

  // Unique-violation (23505) or a returned-null means the row already exists.
  const isUnique = (error as { code?: string } | null)?.code === '23505';
  if (error && !isUnique) {
    throw new Error(`ingestion_enqueue_failed: ${error.message}`);
  }

  const { data: existing, error: readErr } = await client
    .from(TABLES.INGESTION_EVENTS)
    .select('id, payload_hash')
    .eq('merchant_id', input.merchantId)
    .eq('idempotency_key', input.idempotencyKey)
    .maybeSingle();
  if (readErr || !existing) {
    throw new Error(`ingestion_enqueue_conflict_read_failed: ${readErr?.message ?? 'not found'}`);
  }

  const existingRow = existing as { id: string; payload_hash: string };
  if (existingRow.payload_hash !== payloadHash) {
    return {
      status: 'conflict',
      ingestionEventId: existingRow.id,
      duplicate: true,
      reason: 'idempotency_payload_conflict',
    };
  }
  return { status: 'duplicate', ingestionEventId: existingRow.id, duplicate: true };
}
