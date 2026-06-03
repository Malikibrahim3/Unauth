import { NextRequest, NextResponse } from 'next/server';
import { handleStripeWebhookEvent } from '@/lib/billing/stripeWebhooks';
import { constructStripeEvent, isStripeConfigured } from '@/lib/billing/stripeClient';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 });
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  const payload = await req.text();

  let event;
  try {
    event = constructStripeEvent(payload, signature);
  } catch {
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
  }

  const supabase = createAdminClient();

  try {
    await handleStripeWebhookEvent(supabase, event);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[stripe webhook]', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
