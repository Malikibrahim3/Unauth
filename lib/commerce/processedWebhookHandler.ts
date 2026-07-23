import type { SupabaseClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';
import { buildWebhookIdempotencyKey } from '@/lib/commerce/webhookIdempotency';
import { TABLES } from '@/lib/supabase/tables';

export type ProcessedWebhookRow = {
  idempotency_key: string;
  status: string;
  attempts: number;
};

export async function readProcessedWebhook(
  supabase: SupabaseClient,
  idempotencyKey: string,
): Promise<ProcessedWebhookRow | null> {
  const { data, error } = await supabase
    .from(TABLES.PROCESSED_WEBHOOKS)
    .select('idempotency_key, status, attempts')
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();

  if (error) {
    throw new Error(`processed_webhook_read_failed: ${error.message}`);
  }

  return (data as ProcessedWebhookRow | null) ?? null;
}

/**
 * Atomically claim a webhook for processing. Uses the single-statement
 * `claim_processed_webhook` RPC. The claim is payload-aware, leased and fenced:
 * concurrent callers cannot both proceed, modified payload reuse is surfaced as
 * a conflict, failed/expired work may be retried, and stale workers cannot mark a
 * newer claim complete.
 */
export async function claimProcessedWebhook(
  supabase: SupabaseClient,
  input: {
    platform: string;
    storeKey: string;
    nativeWebhookId: string;
    topic: string;
    rawBody: string | Uint8Array;
    objectKey?: string | null;
    eventVersion?: number | null;
  },
): Promise<
  | {
      status: 'claimed';
      duplicate: false;
      conflict: false;
      retry: false;
      stale: false;
      idempotencyKey: string;
      claimToken: string;
    }
  | {
      status: 'duplicate';
      duplicate: true;
      conflict: false;
      retry: false;
      stale: false;
      idempotencyKey: string;
      result: unknown;
    }
  | {
      status: 'conflict';
      duplicate: false;
      conflict: true;
      retry: false;
      stale: false;
      idempotencyKey: string;
    }
  | {
      status: 'in_progress' | 'busy';
      duplicate: false;
      conflict: false;
      retry: true;
      stale: false;
      idempotencyKey: string;
    }
  | {
      status: 'stale';
      duplicate: false;
      conflict: false;
      retry: false;
      stale: true;
      idempotencyKey: string;
    }
> {
  const idempotencyKey = buildWebhookIdempotencyKey(
    input.platform,
    input.storeKey,
    input.nativeWebhookId,
  );
  const payloadHash = createHash('sha256').update(input.rawBody).digest('hex');

  const { data, error } = await supabase.rpc('claim_processed_webhook', {
    p_key: idempotencyKey,
    p_provider: input.platform,
    p_store_key: input.storeKey,
    p_topic: input.topic,
    p_payload_hash: payloadHash,
    p_lease_seconds: 300,
    p_object_key: input.objectKey ?? null,
    p_event_version: input.eventVersion ?? null,
  });

  if (error) {
    throw new Error(`processed_webhook_claim_failed: ${error.message}`);
  }

  const result = data as { status?: unknown; claim_token?: unknown; result?: unknown } | null;
  if (result?.status === 'claimed' && typeof result.claim_token === 'string') {
    return {
      status: 'claimed',
      duplicate: false,
      conflict: false,
      retry: false,
      stale: false,
      idempotencyKey,
      claimToken: result.claim_token,
    };
  }
  if (result?.status === 'duplicate') {
    return {
      status: result.status,
      duplicate: true,
      conflict: false,
      retry: false,
      stale: false,
      idempotencyKey,
      result: result.result ?? null,
    };
  }
  if (result?.status === 'conflict') {
    return {
      status: 'conflict',
      duplicate: false,
      conflict: true,
      retry: false,
      stale: false,
      idempotencyKey,
    };
  }
  if (result?.status === 'in_progress' || result?.status === 'busy') {
    return {
      status: result.status,
      duplicate: false,
      conflict: false,
      retry: true,
      stale: false,
      idempotencyKey,
    };
  }
  if (result?.status === 'stale') {
    return {
      status: 'stale',
      duplicate: false,
      conflict: false,
      retry: false,
      stale: true,
      idempotencyKey,
    };
  }
  throw new Error('processed_webhook_claim_failed: invalid RPC response');
}

export async function completeProcessedWebhook(
  supabase: SupabaseClient,
  idempotencyKey: string,
  claimToken: string,
  status: 'completed' | 'failed',
  lastError: string | null,
  resultPayload: unknown = null,
): Promise<void> {
  const { data, error } = await supabase.rpc('complete_processed_webhook', {
    p_key: idempotencyKey,
    p_claim_token: claimToken,
    p_status: status,
    p_last_error: lastError,
    p_result: resultPayload,
  });

  if (error) {
    throw new Error(`processed_webhook_complete_failed: ${error.message}`);
  }
  if (data !== true) {
    throw new Error('processed_webhook_complete_failed: stale claim token');
  }
}
