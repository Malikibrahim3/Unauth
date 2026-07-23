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
import { readBoundedWebhookBody, WebhookBodyError } from '@/lib/webhooks/body';

function normalizeTopic(topic: string | null): string {
  return (topic ?? '').trim().toLowerCase();
}

function wooCommerceObjectVersion(
  topic: string,
  payload: Record<string, unknown>,
): { objectKey: string; eventVersion: number } | null {
  if (topic !== 'order.created' && topic !== 'order.updated') return null;
  const id = payload.id;
  const rawTimestamp = payload.date_modified_gmt ?? payload.date_modified ?? payload.date_created_gmt ?? payload.date_created;
  if (typeof id !== 'string' && typeof id !== 'number') return null;
  if (typeof rawTimestamp !== 'string' || !rawTimestamp.trim()) return null;
  const timestamp = /(?:z|[+-]\d\d:\d\d)$/i.test(rawTimestamp)
    ? rawTimestamp
    : `${rawTimestamp}Z`;
  const eventVersion = Date.parse(timestamp);
  return Number.isFinite(eventVersion)
    ? { objectKey: `order:${String(id)}`, eventVersion }
    : null;
}

export async function GET() {
  return NextResponse.json({ ok: true, service: 'woocommerce-webhooks' });
}

// Service-role access is protected here by HMAC signature verification, not user auth.
export async function POST(request: NextRequest) {
  const webhookSource = request.headers.get('x-wc-webhook-source');
  const topic = normalizeTopic(request.headers.get('x-wc-webhook-topic'));
  const deliveryId = request.headers.get('x-wc-webhook-delivery-id');
  const signature = request.headers.get('x-wc-webhook-signature');

  const storeKey = webhookSource ? storeKeyFromWebhookSource(webhookSource) : null;
  if (!storeKey || !topic || !deliveryId) {
    return NextResponse.json({ error: 'Missing webhook headers' }, { status: 400 });
  }

  let rawBody: string;
  try {
    rawBody = await readBoundedWebhookBody(request);
  } catch (error) {
    if (error instanceof WebhookBodyError) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }
    throw error;
  }
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
  const limited = await enforceRateLimit(
    rateLimitKey('webhook', 'woocommerce', storeKey ?? getClientIp(request.headers)),
    limitFromEnv('WOOCOMMERCE_WEBHOOK_RATE_LIMIT', 1000, 60),
  );
  if (limited) return limited;

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  let idempotencyKey: string;
  let claimToken: string;
  const objectVersion = wooCommerceObjectVersion(topic, payload);
  try {
    const claim = await claimProcessedWebhook(supabase, {
      platform: 'woocommerce',
      storeKey,
      nativeWebhookId: deliveryId,
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

    await completeProcessedWebhook(supabase, idempotencyKey, claimToken, 'completed', null);
  } catch (err) {
    const message = err instanceof Error ? err.message.slice(0, 300) : 'webhook_processing_failed';
    await completeProcessedWebhook(supabase, idempotencyKey, claimToken, 'failed', message);
    console.error('WooCommerce webhook processing failed', {
      deliveryId,
      topic,
      storeKey,
      message,
    });
    return NextResponse.json({ error: 'webhook_processing_failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
