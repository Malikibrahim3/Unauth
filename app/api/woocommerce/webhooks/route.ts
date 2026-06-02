import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { decryptWooCommerceCredentials } from '@/lib/commerce/credentialCrypto';
import {
  claimProcessedWebhook,
  completeProcessedWebhook,
} from '@/lib/commerce/processedWebhookHandler';
import { storeKeyFromWebhookSource } from '@/lib/commerce/woocommerce/normalizeStoreUrl';
import { processWooCommerceOrderWebhook } from '@/lib/commerce/woocommerce/processOrderWebhook';
import { processWooCommerceRefundWebhook } from '@/lib/commerce/woocommerce/processRefundWebhook';
import { loadWooCommerceCredentialsForStore } from '@/lib/commerce/woocommerce/settingsConnection';
import { verifyWooCommerceWebhookSignature } from '@/lib/commerce/woocommerce/verifyWebhookSignature';
import { enforceRateLimit, getClientIp, limitFromEnv, rateLimitKey } from '@/lib/ratelimit';

function normalizeTopic(topic: string | null): string {
  return (topic ?? '').trim().toLowerCase();
}

export async function GET() {
  return NextResponse.json({ ok: true, service: 'woocommerce-webhooks' });
}

export async function POST(request: NextRequest) {
  const webhookSource = request.headers.get('x-wc-webhook-source');
  const topic = normalizeTopic(request.headers.get('x-wc-webhook-topic'));
  const webhookId = request.headers.get('x-wc-webhook-id');
  const signature = request.headers.get('x-wc-webhook-signature');

  const storeKey = webhookSource ? storeKeyFromWebhookSource(webhookSource) : null;
  const limited = await enforceRateLimit(
    rateLimitKey('webhook', 'woocommerce', storeKey ?? getClientIp(request.headers)),
    limitFromEnv('WOOCOMMERCE_WEBHOOK_RATE_LIMIT', 1000, 60),
  );
  if (limited) return limited;

  if (!storeKey || !topic || !webhookId) {
    return NextResponse.json({ error: 'Missing webhook headers' }, { status: 400 });
  }

  const rawBody = await request.text();
  const supabase = createServiceClient();

  const credentialRow = await loadWooCommerceCredentialsForStore(supabase, storeKey);
  if (!credentialRow) {
    return NextResponse.json({ error: 'Store not connected' }, { status: 404 });
  }

  let consumerSecret: string;
  try {
    const credentials = decryptWooCommerceCredentials(credentialRow.credentials_encrypted);
    consumerSecret = credentials.consumer_secret;
  } catch {
    return NextResponse.json({ error: 'Invalid store credentials' }, { status: 500 });
  }

  if (!verifyWooCommerceWebhookSignature(rawBody, signature, consumerSecret)) {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
  }

  let idempotencyKey: string;
  try {
    const claim = await claimProcessedWebhook(supabase, {
      platform: 'woocommerce',
      storeKey,
      nativeWebhookId: webhookId,
      topic,
    });
    if (claim.duplicate) {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    idempotencyKey = claim.idempotencyKey;
  } catch {
    return NextResponse.json({ error: 'Failed to claim webhook' }, { status: 500 });
  }

  try {
    const payload = JSON.parse(rawBody) as Record<string, unknown>;

    if (topic === 'order.created' || topic === 'order.updated') {
      await processWooCommerceOrderWebhook({
        supabase,
        storeKey,
        payload: payload as Parameters<typeof processWooCommerceOrderWebhook>[0]['payload'],
      });
    } else if (topic === 'order.refunded') {
      const order =
        payload && typeof payload === 'object' && 'order' in payload
          ? (payload.order as Parameters<typeof processWooCommerceRefundWebhook>[0]['order'])
          : null;
      const refunds = Array.isArray(payload.refunds) ? payload.refunds : [];
      if (refunds.length > 0) {
        for (const refund of refunds) {
          await processWooCommerceRefundWebhook({
            supabase,
            storeKey,
            refund: refund as Parameters<typeof processWooCommerceRefundWebhook>[0]['refund'],
            order,
          });
        }
      } else {
        await processWooCommerceRefundWebhook({
          supabase,
          storeKey,
          refund: payload as Parameters<typeof processWooCommerceRefundWebhook>[0]['refund'],
          order,
        });
      }
    }

    await completeProcessedWebhook(supabase, idempotencyKey, 'completed', null);
  } catch (err) {
    const message = err instanceof Error ? err.message.slice(0, 300) : 'webhook_processing_failed';
    await completeProcessedWebhook(supabase, idempotencyKey, 'failed', message);
    console.error('WooCommerce webhook processing failed', {
      webhookId,
      topic,
      storeKey,
      message,
    });
  }

  return NextResponse.json({ ok: true });
}
