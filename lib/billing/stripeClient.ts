import Stripe from 'stripe';
import { env } from '@/lib/utils/env';

let stripeClient: Stripe | null = null;

export function isStripeConfigured(): boolean {
  return Boolean(env.STRIPE_SECRET_KEY);
}

export function getStripeClient(): Stripe {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured.');
  }
  if (!stripeClient) {
    stripeClient = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-02-24.acacia',
      typescript: true,
    });
  }
  return stripeClient;
}

export function constructStripeEvent(payload: string | Buffer, signature: string): Stripe.Event {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured.');
  }
  const stripe = getStripeClient();
  return stripe.webhooks.constructEvent(payload, signature, env.STRIPE_WEBHOOK_SECRET);
}

export async function createBillingPortalSession(input: {
  customerId: string;
  returnUrl: string;
}): Promise<string> {
  const stripe = getStripeClient();
  const session = await stripe.billingPortal.sessions.create({
    customer: input.customerId,
    return_url: input.returnUrl,
  });
  return session.url;
}

export async function createSubscriptionCheckoutSession(input: {
  customerId?: string;
  customerEmail?: string;
  priceId: string;
  merchantId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<string> {
  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: input.customerId,
    customer_email: input.customerId ? undefined : input.customerEmail,
    line_items: [{ price: input.priceId, quantity: 1 }],
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    metadata: { merchant_id: input.merchantId },
    subscription_data: {
      metadata: { merchant_id: input.merchantId },
    },
  });
  if (!session.url) throw new Error('Checkout session missing URL');
  return session.url;
}

export async function createTopUpCheckoutSession(input: {
  customerId: string;
  priceId: string;
  merchantId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<string> {
  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer: input.customerId,
    line_items: [{ price: input.priceId, quantity: 1 }],
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    metadata: { merchant_id: input.merchantId, type: 'topup' },
  });
  if (!session.url) throw new Error('Checkout session missing URL');
  return session.url;
}

export async function scheduleSubscriptionDowngrade(input: {
  subscriptionId: string;
  newPriceId: string;
}): Promise<void> {
  const stripe = getStripeClient();
  const sub = await stripe.subscriptions.retrieve(input.subscriptionId);
  const itemId = sub.items.data[0]?.id;
  if (!itemId) throw new Error('Subscription has no items');

  await stripe.subscriptions.update(input.subscriptionId, {
    cancel_at_period_end: false,
    proration_behavior: 'none',
    items: [{ id: itemId, price: input.newPriceId }],
    billing_cycle_anchor: 'unchanged',
  });
}

export async function cancelSubscriptionAtPeriodEnd(subscriptionId: string): Promise<void> {
  const stripe = getStripeClient();
  await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
}

export async function clearSubscriptionCancellation(subscriptionId: string): Promise<void> {
  const stripe = getStripeClient();
  await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: false });
}

export async function upgradeSubscriptionImmediate(input: {
  subscriptionId: string;
  newPriceId: string;
}): Promise<void> {
  const stripe = getStripeClient();
  const sub = await stripe.subscriptions.retrieve(input.subscriptionId);
  const itemId = sub.items.data[0]?.id;
  if (!itemId) throw new Error('Subscription has no items');

  await stripe.subscriptions.update(input.subscriptionId, {
    cancel_at_period_end: false,
    proration_behavior: 'create_prorations',
    items: [{ id: itemId, price: input.newPriceId }],
  });
}
