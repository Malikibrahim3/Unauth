import type { SupabaseClient } from '@supabase/supabase-js';
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
 * `claim_processed_webhook` RPC (INSERT ... ON CONFLICT DO UPDATE ... WHERE
 * status <> 'completed') so two concurrent deliveries of the same webhook cannot
 * both proceed — the previous read-then-upsert flow had that TOCTOU race.
 * Returns `duplicate: true` only when the webhook was already completed.
 */
export async function claimProcessedWebhook(
  supabase: SupabaseClient,
  input: {
    platform: string;
    storeKey: string;
    nativeWebhookId: string;
    topic: string;
  },
): Promise<{ duplicate: boolean; idempotencyKey: string }> {
  const idempotencyKey = buildWebhookIdempotencyKey(
    input.platform,
    input.storeKey,
    input.nativeWebhookId,
  );

  const { data, error } = await supabase.rpc('claim_processed_webhook', {
    p_key: idempotencyKey,
    p_provider: input.platform,
    p_store_key: input.storeKey,
    p_topic: input.topic,
  });

  if (error) {
    throw new Error(`processed_webhook_claim_failed: ${error.message}`);
  }

  return { duplicate: data === true, idempotencyKey };
}

export async function completeProcessedWebhook(
  supabase: SupabaseClient,
  idempotencyKey: string,
  status: 'completed' | 'failed',
  lastError: string | null,
): Promise<void> {
  const { error } = await supabase
    .from(TABLES.PROCESSED_WEBHOOKS)
    .update({
      status,
      last_error: lastError,
      updated_at: new Date().toISOString(),
    })
    .eq('idempotency_key', idempotencyKey);

  if (error) {
    throw new Error(`processed_webhook_complete_failed: ${error.message}`);
  }
}
