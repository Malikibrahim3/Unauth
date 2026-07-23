import type { SupabaseClient } from '@supabase/supabase-js';
import {
  claimProcessedWebhook,
  completeProcessedWebhook,
} from '@/lib/commerce/processedWebhookHandler';

const MAX_IDEMPOTENCY_KEY_LENGTH = 255;

export type ApiIngestClaim =
  | {
      state: 'claimed';
      idempotencyKey: string;
      claimToken: string;
    }
  | {
      state: 'response';
      status: number;
      body: unknown;
      retryAfterSeconds?: number;
    };

export function normalizeApiIdempotencyKey(value: string | null): string | null {
  const normalized = value?.trim() ?? '';
  if (!normalized || normalized.length > MAX_IDEMPOTENCY_KEY_LENGTH) return null;
  return normalized;
}

function storedResponse(value: unknown): { status: number; body: unknown } | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  if (!Number.isInteger(record.status) || Number(record.status) < 200 || Number(record.status) > 599) {
    return null;
  }
  if (!Object.prototype.hasOwnProperty.call(record, 'body')) return null;
  return { status: Number(record.status), body: record.body };
}

/**
 * Claim one API-key-authenticated entity request before it mutates domain
 * state. The merchant and resource are part of the composite key, while the
 * exact raw-body hash prevents a caller from reusing a key with new content.
 */
export async function claimApiIngestRequest(
  client: SupabaseClient,
  input: {
    merchantId: string;
    resource: 'case' | 'customer' | 'order';
    idempotencyKey: string;
    rawBody: string;
  },
): Promise<ApiIngestClaim> {
  const claim = await claimProcessedWebhook(client, {
    platform: 'canonical-api',
    storeKey: input.merchantId,
    nativeWebhookId: `${input.resource}:${input.idempotencyKey}`,
    topic: `api.v1.${input.resource}`,
    rawBody: input.rawBody,
  });

  if (claim.status === 'claimed') {
    return {
      state: 'claimed',
      idempotencyKey: claim.idempotencyKey,
      claimToken: claim.claimToken,
    };
  }
  if (claim.status === 'duplicate') {
    const replay = storedResponse(claim.result);
    return replay
      ? { state: 'response', ...replay }
      : { state: 'response', status: 200, body: { duplicate: true } };
  }
  if (claim.status === 'conflict') {
    return {
      state: 'response',
      status: 409,
      body: { error: 'idempotency_payload_conflict' },
    };
  }
  if (claim.retry) {
    return {
      state: 'response',
      status: 503,
      body: { error: 'request_in_progress' },
      retryAfterSeconds: 2,
    };
  }

  return {
    state: 'response',
    status: 409,
    body: { error: 'stale_request' },
  };
}

export async function completeApiIngestRequest(
  client: SupabaseClient,
  claim: Extract<ApiIngestClaim, { state: 'claimed' }>,
  response: { status: number; body: unknown },
): Promise<void> {
  await completeProcessedWebhook(
    client,
    claim.idempotencyKey,
    claim.claimToken,
    'completed',
    null,
    response,
  );
}

export async function failApiIngestRequest(
  client: SupabaseClient,
  claim: Extract<ApiIngestClaim, { state: 'claimed' }>,
  error: unknown,
): Promise<void> {
  const message = error instanceof Error ? error.message : 'api_ingest_failed';
  await completeProcessedWebhook(
    client,
    claim.idempotencyKey,
    claim.claimToken,
    'failed',
    message,
  );
}
