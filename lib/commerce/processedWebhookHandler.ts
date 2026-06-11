import type { SupabaseClient } from '@supabase/supabase-js';
import { buildWebhookIdempotencyKey } from '@/lib/commerce/webhookIdempotency';

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
    .from('processed_webhooks' as never)
    .select('idempotency_key, status, attempts')
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();

  if (error) {
    throw new Error(`processed_webhook_read_failed: ${error.message}`);
  }

  return (data as ProcessedWebhookRow | null) ?? null;
}

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

  const existing = await readProcessedWebhook(supabase, idempotencyKey);
  if (existing?.status === 'completed') {
    return { duplicate: true, idempotencyKey };
  }

  const nextAttempts = Number(existing?.attempts ?? 0) + 1;
  const now = new Date().toISOString();
  const { error: claimError } = await supabase.from('processed_webhooks' as never).upsert(
    {
      idempotency_key: idempotencyKey,
      provider: input.platform,
      store_key: input.storeKey,
      status: 'processing',
      attempts: nextAttempts,
      last_error: null,
      topic: input.topic,
      updated_at: now,
    } as never,
    { onConflict: 'idempotency_key' },
  );

  if (claimError) {
    throw new Error(`processed_webhook_claim_failed: ${claimError.message}`);
  }

  return { duplicate: false, idempotencyKey };
}

export async function completeProcessedWebhook(
  supabase: SupabaseClient,
  idempotencyKey: string,
  status: 'completed' | 'failed',
  lastError: string | null,
): Promise<void> {
  const { error } = await supabase
    .from('processed_webhooks' as never)
    .update({
      status,
      last_error: lastError,
      updated_at: new Date().toISOString(),
    } as never)
    .eq('idempotency_key', idempotencyKey);

  if (error) {
    throw new Error(`processed_webhook_complete_failed: ${error.message}`);
  }
}
