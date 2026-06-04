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

function normalizeScope(scope: string | null): string {
  return (scope ?? '').trim().toLowerCase();
}

export async function GET() {
  return NextResponse.json({ ok: true, service: 'bigcommerce-webhooks' });
}

// Service-role access is protected here by HMAC signature verification, not user auth.
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-bc-signature');

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

  if (!verifyBigCommerceWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
  }

  const supabase = createServiceClient();
  let idempotencyKey: string;
  try {
    const claim = await claimProcessedWebhook(supabase, {
      platform: 'bigcommerce',
      storeKey: storeHash,
      nativeWebhookId: deliveryId,
      topic: scope,
    });
    if (claim.duplicate) {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    idempotencyKey = claim.idempotencyKey;
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

    await completeProcessedWebhook(supabase, idempotencyKey, 'completed', null);
  } catch (err) {
    const message = err instanceof Error ? err.message.slice(0, 300) : 'webhook_processing_failed';
    await completeProcessedWebhook(supabase, idempotencyKey, 'failed', message);
    console.error('BigCommerce webhook processing failed', {
      deliveryId,
      scope,
      storeHash,
      message,
    });
  }

  return NextResponse.json({ ok: true });
}
