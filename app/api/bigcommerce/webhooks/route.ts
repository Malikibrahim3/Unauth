import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import {
  claimProcessedWebhook,
  completeProcessedWebhook,
} from '@/lib/commerce/processedWebhookHandler';
import { storeHashFromWebhookProducer } from '@/lib/commerce/bigcommerce/normalizeStoreHash';
import { processBigCommerceOrderWebhook } from '@/lib/commerce/bigcommerce/processOrderWebhook';
import { processBigCommerceRefundWebhook } from '@/lib/commerce/bigcommerce/processRefundWebhook';
import { processBigCommerceAppUninstalled } from '@/lib/commerce/bigcommerce/processAppUninstalled';
import { verifyBigCommerceWebhookSignature } from '@/lib/commerce/bigcommerce/verifyWebhookSignature';
import { enforceRateLimit, getClientIp, limitFromEnv, rateLimitKey } from '@/lib/ratelimit';
import { readBoundedWebhookBody, WebhookBodyError } from '@/lib/webhooks/body';

function normalizeScope(scope: string | null): string {
  return (scope ?? '').trim().toLowerCase();
}

function bigCommerceObjectVersion(
  scope: string,
  payload: Record<string, unknown>,
): { objectKey: string; eventVersion: number } | null {
  if (scope !== 'store/order/created' && scope !== 'store/order/updated') return null;
  const data = payload.data && typeof payload.data === 'object'
    ? payload.data as Record<string, unknown>
    : null;
  const id = data?.id;
  const createdAt = payload.created_at;
  if ((typeof id !== 'string' && typeof id !== 'number') || typeof createdAt !== 'number') return null;
  const eventVersion = createdAt * 1000;
  return Number.isSafeInteger(eventVersion)
    ? { objectKey: `order:${String(id)}`, eventVersion }
    : null;
}

export async function GET() {
  return NextResponse.json({ ok: true, service: 'bigcommerce-webhooks' });
}

// Service-role access is protected here by HMAC signature verification, not user auth.
export async function POST(request: NextRequest) {
  let rawBody: string;
  try {
    rawBody = await readBoundedWebhookBody(request);
  } catch (error) {
    if (error instanceof WebhookBodyError) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }
    throw error;
  }

  if (!verifyBigCommerceWebhookSignature(rawBody, request.headers)) {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
  }

  let webhookPayload: Record<string, unknown>;
  try {
    webhookPayload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const producer = typeof webhookPayload.producer === 'string' ? webhookPayload.producer : null;
  const storeHash = storeHashFromWebhookProducer(producer);
  const scope = normalizeScope(
    typeof webhookPayload.scope === 'string' ? webhookPayload.scope : null,
  );
  const deliveryId =
    typeof webhookPayload.hash === 'string'
      ? webhookPayload.hash
      : typeof webhookPayload.created_at === 'number'
        ? String(webhookPayload.created_at)
        : null;

  const limited = await enforceRateLimit(
    rateLimitKey('webhook', 'bigcommerce', storeHash ?? getClientIp(request.headers)),
    limitFromEnv('BIGCOMMERCE_WEBHOOK_RATE_LIMIT', 1000, 60),
  );
  if (limited) return limited;

  if (!storeHash || !scope || !deliveryId) {
    return NextResponse.json({ error: 'Missing webhook fields' }, { status: 400 });
  }

  const supabase = createServiceClient();
  let idempotencyKey: string;
  let claimToken: string;
  const objectVersion = bigCommerceObjectVersion(scope, webhookPayload);
  try {
    const claim = await claimProcessedWebhook(supabase, {
      platform: 'bigcommerce',
      storeKey: storeHash,
      nativeWebhookId: deliveryId,
      topic: scope,
      rawBody,
      ...(objectVersion ?? {}),
    });
    if (claim.conflict) {
      return NextResponse.json({ error: 'idempotency_payload_conflict' }, { status: 409 });
    }
    if (claim.retry) {
      return NextResponse.json(
        { error: 'webhook_object_in_progress' },
        { status: 503, headers: { 'retry-after': '1' } },
      );
    }
    if (claim.stale) {
      return NextResponse.json({ ok: true, ignored: 'stale_event' });
    }
    if (claim.duplicate) {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    idempotencyKey = claim.idempotencyKey;
    claimToken = claim.claimToken;
  } catch {
    return NextResponse.json({ error: 'Failed to claim webhook' }, { status: 500 });
  }

  try {
    if (scope === 'store/order/created' || scope === 'store/order/updated') {
      await processBigCommerceOrderWebhook({
        supabase,
        storeHash,
        webhookPayload,
      });
    } else if (scope === 'store/order/refund/created') {
      await processBigCommerceRefundWebhook({
        supabase,
        storeHash,
        webhookPayload,
      });
    } else if (scope === 'store/app/uninstalled') {
      await processBigCommerceAppUninstalled(supabase, storeHash);
    }

    await completeProcessedWebhook(supabase, idempotencyKey, claimToken, 'completed', null);
  } catch (err) {
    const message = err instanceof Error ? err.message.slice(0, 300) : 'webhook_processing_failed';
    await completeProcessedWebhook(supabase, idempotencyKey, claimToken, 'failed', message);
    console.error('BigCommerce webhook processing failed', {
      deliveryId,
      scope,
      storeHash,
      message,
    });
    return NextResponse.json({ error: 'webhook_processing_failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
