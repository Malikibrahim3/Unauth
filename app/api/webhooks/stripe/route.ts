import { NextRequest, NextResponse } from 'next/server';
import { handleStripeWebhookEvent } from '@/lib/billing/stripeWebhooks';
import { constructStripeEvent, isStripeConfigured } from '@/lib/billing/stripeClient';
import { createAdminClient } from '@/lib/supabase/server';
import { claimProcessedWebhook, completeProcessedWebhook } from '@/lib/commerce/processedWebhookHandler';
import { readBoundedWebhookBody, WebhookBodyError } from '@/lib/webhooks/body';

export const dynamic = 'force-dynamic';

function stripeObjectVersion(event: {
  type: string;
  created: number;
  data: { object: unknown };
}): { objectKey: string; eventVersion: number } | null {
  const object = event.data.object && typeof event.data.object === 'object'
    ? event.data.object as Record<string, unknown>
    : null;
  if (!object || !Number.isSafeInteger(event.created)) return null;

  let subscriptionId: string | null = null;
  if (event.type.startsWith('customer.subscription.')) {
    subscriptionId = typeof object.id === 'string' ? object.id : null;
  } else if (event.type.startsWith('invoice.')) {
    const subscription = object.subscription;
    subscriptionId = typeof subscription === 'string'
      ? subscription
      : subscription && typeof subscription === 'object' && typeof (subscription as { id?: unknown }).id === 'string'
        ? (subscription as { id: string }).id
        : null;
  } else if (event.type === 'checkout.session.completed' && object.mode === 'subscription') {
    const subscription = object.subscription;
    subscriptionId = typeof subscription === 'string'
      ? subscription
      : subscription && typeof subscription === 'object' && typeof (subscription as { id?: unknown }).id === 'string'
        ? (subscription as { id: string }).id
        : null;
  }

  const eventVersion = event.created * 1000;
  return subscriptionId && Number.isSafeInteger(eventVersion)
    ? { objectKey: `subscription:${subscriptionId}`, eventVersion }
    : null;
}

export async function POST(req: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 });
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let payload: string;
  try {
    payload = await readBoundedWebhookBody(req);
  } catch (error) {
    if (error instanceof WebhookBodyError) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }
    throw error;
  }

  let event;
  try {
    event = constructStripeEvent(payload, signature);
  } catch {
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
  }

  const supabase = createAdminClient();
  let idempotencyKey: string;
  let claimToken: string;

  try {
    const claim = await claimProcessedWebhook(supabase, {
      platform: 'stripe',
      storeKey: event.account ?? 'platform',
      nativeWebhookId: event.id,
      topic: event.type,
      rawBody: payload,
      ...(stripeObjectVersion(event) ?? {}),
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
      return NextResponse.json({ received: true, ignored: 'stale_event' });
    }
    if (claim.duplicate) {
      return NextResponse.json({ received: true, duplicate: true });
    }
    idempotencyKey = claim.idempotencyKey;
    claimToken = claim.claimToken;
  } catch (error) {
    console.error('[stripe webhook claim]', error);
    return NextResponse.json({ error: 'Webhook claim failed' }, { status: 500 });
  }

  try {
    await handleStripeWebhookEvent(supabase, event);
    await completeProcessedWebhook(supabase, idempotencyKey, claimToken, 'completed', null);
    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 300) : 'stripe_webhook_failed';
    await completeProcessedWebhook(supabase, idempotencyKey, claimToken, 'failed', message);
    console.error('[stripe webhook]', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
