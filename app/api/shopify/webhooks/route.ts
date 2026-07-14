import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { verifyShopifyWebhookHmac } from '@/lib/shopify/webhooks';
import { enforceRateLimit, getClientIp, limitFromEnv, rateLimitKey } from '@/lib/ratelimit';
import { claimProcessedWebhook, completeProcessedWebhook } from '@/lib/commerce/processedWebhookHandler';
import { processShopifyWebhook } from '@/lib/shopify/ingest';

function safeWebhookErrorCode(error: unknown): string {
  if (!(error instanceof Error)) return 'webhook_processing_failed';
  return error.message.split(':', 1)[0].replace(/[^a-z0-9_-]/gi, '_').slice(0, 80)
    || 'webhook_processing_failed';
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
  const limited = await enforceRateLimit(
    rateLimitKey('webhook', 'shopify', shopDomain ?? getClientIp(request.headers)),
    limitFromEnv('SHOPIFY_WEBHOOK_RATE_LIMIT', 1000, 60),
  );
  if (limited) return limited;

  const rawBody = await request.text();
  if (!verifyShopifyWebhookHmac(rawBody, hmac)) {
    return NextResponse.json({ error: 'Invalid HMAC signature' }, { status: 401 });
  }
  if (!shopDomain || !topic || !webhookId) {
    return NextResponse.json({ error: 'Missing webhook headers' }, { status: 400 });
  }

  const supabase = createServiceClient();
  let idempotencyKey: string;
  try {
    const claim = await claimProcessedWebhook(supabase, {
      platform: 'shopify',
      storeKey: shopDomain,
      nativeWebhookId: webhookId,
      topic,
    });
    if (claim.duplicate) return NextResponse.json({ ok: true, duplicate: true });
    idempotencyKey = claim.idempotencyKey;
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
    await completeProcessedWebhook(supabase, idempotencyKey, 'completed', null);
  } catch (error) {
    const category = safeWebhookErrorCode(error);
    await completeProcessedWebhook(supabase, idempotencyKey, 'failed', category);
    console.error('Shopify webhook processing failed', { webhookId, topic, shopDomain, category });
    return NextResponse.json({ error: 'webhook_processing_failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
