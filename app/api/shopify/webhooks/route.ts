import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { verifyShopifyWebhookHmac } from '@/lib/shopify/webhooks';
import { enforceRateLimit, getClientIp, limitFromEnv, rateLimitKey } from '@/lib/ratelimit';
import { claimProcessedWebhook, completeProcessedWebhook } from '@/lib/commerce/processedWebhookHandler';
import { processShopifyWebhook } from '@/lib/shopify/ingest';
import { readBoundedWebhookBody, WebhookBodyError } from '@/lib/webhooks/body';

function safeWebhookErrorCode(error: unknown): string {
  if (!(error instanceof Error)) return 'webhook_processing_failed';
  return error.message.split(':', 1)[0].replace(/[^a-z0-9_-]/gi, '_').slice(0, 80)
    || 'webhook_processing_failed';
}

function shopifyObjectVersion(
  topic: string,
  payload: Record<string, unknown>,
): { objectKey: string; eventVersion: number } | null {
  if (!topic.startsWith('orders/')) return null;
  const id = payload.id;
  const timestamp = payload.updated_at ?? payload.created_at;
  const eventVersion = typeof timestamp === 'string' ? Date.parse(timestamp) : Number.NaN;
  if ((typeof id !== 'string' && typeof id !== 'number') || !Number.isFinite(eventVersion)) {
    return null;
  }
  return { objectKey: `order:${String(id)}`, eventVersion };
}

export async function processWebhook(
  rawBody: string,
  shopDomain: string,
  topic: string,
  supabaseClient?: ReturnType<typeof createServiceClient>,
) {
  return processShopifyWebhook({ rawBody, shopDomain, topic, supabaseClient });
}

export async function POST(request: NextRequest) {
  const hmac = request.headers.get('x-shopify-hmac-sha256');
  const shopDomain = request.headers.get('x-shopify-shop-domain');
  const topic = request.headers.get('x-shopify-topic');
  const webhookId = request.headers.get('x-shopify-webhook-id');

  let rawBody: string;
  try {
    rawBody = await readBoundedWebhookBody(request);
  } catch (error) {
    if (error instanceof WebhookBodyError) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }
    throw error;
  }
  if (!verifyShopifyWebhookHmac(rawBody, hmac)) {
    return NextResponse.json({ error: 'Invalid HMAC signature' }, { status: 401 });
  }
  if (!shopDomain || !topic || !webhookId) {
    return NextResponse.json({ error: 'Missing webhook headers' }, { status: 400 });
  }
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const objectVersion = shopifyObjectVersion(topic, payload);
  const limited = await enforceRateLimit(
    rateLimitKey('webhook', 'shopify', shopDomain ?? getClientIp(request.headers)),
    limitFromEnv('SHOPIFY_WEBHOOK_RATE_LIMIT', 1000, 60),
  );
  if (limited) return limited;

  const supabase = createServiceClient();
  let idempotencyKey: string;
  let claimToken: string;
  try {
    const claim = await claimProcessedWebhook(supabase, {
      platform: 'shopify',
      storeKey: shopDomain,
      nativeWebhookId: webhookId,
      topic,
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
    if (claim.stale) return NextResponse.json({ ok: true, ignored: 'stale_event' });
    if (claim.duplicate) return NextResponse.json({ ok: true, duplicate: true });
    idempotencyKey = claim.idempotencyKey;
    claimToken = claim.claimToken;
  } catch (error) {
    console.error('Shopify webhook claim failed', {
      webhookId,
      topic,
      shopDomain,
      category: safeWebhookErrorCode(error),
    });
    return NextResponse.json({ error: 'Failed to claim webhook' }, { status: 500 });
  }

  try {
    await processWebhook(rawBody, shopDomain, topic, supabase);
    await completeProcessedWebhook(supabase, idempotencyKey, claimToken, 'completed', null);
  } catch (error) {
    const category = safeWebhookErrorCode(error);
    await completeProcessedWebhook(supabase, idempotencyKey, claimToken, 'failed', category);
    console.error('Shopify webhook processing failed', { webhookId, topic, shopDomain, category });
    return NextResponse.json({ error: 'webhook_processing_failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
