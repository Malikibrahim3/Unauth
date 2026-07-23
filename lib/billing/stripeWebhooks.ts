import type Stripe from 'stripe';
import {
  applyPlanUpgrade,
  downgradeToFreeAfterLapse,
  executeScheduledDowngrade,
  grantTopUpCredits,
  handleCancellationToFree,
  initiateGracePeriod,
  logBillingEvent,
  resetCreditsOnCycleRenewal,
  resolvePlanFromStripePrice,
  restoreAfterPaymentRecovery,
} from '@/lib/billing/lifecycle';
import {
  getMerchantBillingState,
  getMerchantSubscriptionRow,
} from '@/lib/billing/merchantBilling';
import { TABLES } from '@/lib/supabase/tables';
import type { SupabaseClient } from '@supabase/supabase-js';

function merchantIdFromMetadata(obj: { metadata?: Stripe.Metadata | null }): string | null {
  const id = obj.metadata?.merchant_id;
  return typeof id === 'string' && id.length > 0 ? id : null;
}

async function resolveMerchantFromStripe(
  supabase: SupabaseClient,
  input: {
    merchantId?: string | null;
    customerId?: string | null;
    subscriptionId?: string | null;
  },
): Promise<string | null> {
  if (input.merchantId) return input.merchantId;

  if (input.subscriptionId) {
    const { data } = await supabase
      .from(TABLES.MERCHANT_SUBSCRIPTIONS)
      .select('merchant_id')
      .eq('stripe_subscription_id', input.subscriptionId)
      .maybeSingle();
    if (data) return (data as { merchant_id: string }).merchant_id;
  }

  if (input.customerId) {
    const { data } = await supabase
      .from(TABLES.MERCHANT_SUBSCRIPTIONS)
      .select('merchant_id')
      .eq('stripe_customer_id', input.customerId)
      .maybeSingle();
    if (data) return (data as { merchant_id: string }).merchant_id;
  }

  return null;
}

async function syncSubscriptionPeriod(
  supabase: SupabaseClient,
  merchantId: string,
  subscription: Stripe.Subscription,
): Promise<void> {
  const priceId = subscription.items.data[0]?.price?.id;
  const planId = priceId ? await resolvePlanFromStripePrice(priceId) : null;

  await supabase
    .from(TABLES.MERCHANT_SUBSCRIPTIONS)
    .update({
      stripe_subscription_id: subscription.id,
      stripe_customer_id:
        typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer?.id ?? null,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      ...(planId ? { plan_id: planId } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('merchant_id', merchantId);
}

export async function handleStripeWebhookEvent(
  supabase: SupabaseClient,
  event: Stripe.Event,
): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(supabase, event.data.object as Stripe.Checkout.Session);
      break;
    case 'payment_intent.succeeded':
      await handlePaymentIntentSucceeded(supabase, event.data.object as Stripe.PaymentIntent);
      break;
    case 'invoice.payment_succeeded':
      await handleInvoicePaymentSucceeded(supabase, event.data.object as Stripe.Invoice);
      break;
    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(supabase, event.data.object as Stripe.Invoice);
      break;
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(supabase, event.data.object as Stripe.Subscription);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(supabase, event.data.object as Stripe.Subscription);
      break;
    default:
      break;
  }

  // Route-level leased claims own execution idempotency. Record the billing
  // event only after its effects succeed so a partial failure remains retryable.
  await logBillingEvent(supabase, {
    eventType: event.type,
    stripeEventId: event.id,
    payload: event.data.object as unknown as Record<string, unknown>,
  });
}

async function handleCheckoutCompleted(
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session,
): Promise<void> {
  const merchantId = merchantIdFromMetadata(session);
  if (!merchantId) return;

  if (session.mode === 'payment' && session.metadata?.type === 'topup') {
    const pi =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id;
    await grantTopUpCredits(supabase, merchantId, pi ?? null);
    return;
  }

  if (session.mode === 'subscription' && session.subscription) {
    const subId =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription.id;
    const customerId =
      typeof session.customer === 'string' ? session.customer : session.customer?.id;

    await supabase
      .from(TABLES.MERCHANT_SUBSCRIPTIONS)
      .update({
        stripe_subscription_id: subId,
        stripe_customer_id: customerId ?? null,
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('merchant_id', merchantId);
  }
}

async function handlePaymentIntentSucceeded(
  supabase: SupabaseClient,
  intent: Stripe.PaymentIntent,
): Promise<void> {
  if (intent.metadata?.type !== 'topup') return;
  const merchantId = merchantIdFromMetadata(intent);
  if (!merchantId) return;
  await grantTopUpCredits(supabase, merchantId, intent.id);
}

async function handleInvoicePaymentSucceeded(
  supabase: SupabaseClient,
  invoice: Stripe.Invoice,
): Promise<void> {
  const subscriptionId =
    typeof invoice.subscription === 'string'
      ? invoice.subscription
      : invoice.subscription?.id ?? null;
  const customerId =
    typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id ?? null;

  const merchantId = await resolveMerchantFromStripe(supabase, {
    merchantId: invoice.metadata?.merchant_id ?? null,
    customerId,
    subscriptionId,
  });
  if (!merchantId) return;

  const state = await getMerchantBillingState(supabase, merchantId);
  if (!state) return;

  const linePriceId = invoice.lines.data[0]?.price?.id;
  const newPlanId = linePriceId ? await resolvePlanFromStripePrice(linePriceId) : null;

  if (state.subscription.status === 'grace_period' || state.subscription.status === 'past_due') {
    const periodStart = invoice.period_start
      ? new Date(invoice.period_start * 1000).toISOString()
      : state.subscription.currentPeriodStart;
    const periodEnd = invoice.period_end
      ? new Date(invoice.period_end * 1000).toISOString()
      : state.subscription.currentPeriodEnd ?? periodStart;

    await restoreAfterPaymentRecovery(
      supabase,
      merchantId,
      newPlanId ?? state.subscription.planId,
      periodStart,
      periodEnd,
    );
    return;
  }

  if (state.subscription.downgradeToPlanId && newPlanId) {
    await executeScheduledDowngrade(supabase, merchantId);
    return;
  }

  if (newPlanId && newPlanId !== state.subscription.planId) {
    const upgrading =
      ['free', 'pro', 'growth', 'scale'].indexOf(newPlanId) >
      ['free', 'pro', 'growth', 'scale'].indexOf(state.subscription.planId);
    if (upgrading) {
      await applyPlanUpgrade(supabase, merchantId, newPlanId, {
        sendEmail: 'plan_upgraded',
      });
    }
  }

  if (invoice.billing_reason === 'subscription_cycle') {
    await resetCreditsOnCycleRenewal(
      supabase,
      merchantId,
      newPlanId ?? state.subscription.planId,
      invoice.period_end
        ? new Date(invoice.period_end * 1000).toISOString()
        : new Date().toISOString(),
    );
  }
}

async function handleInvoicePaymentFailed(
  supabase: SupabaseClient,
  invoice: Stripe.Invoice,
): Promise<void> {
  const subscriptionId =
    typeof invoice.subscription === 'string'
      ? invoice.subscription
      : invoice.subscription?.id ?? null;
  const customerId =
    typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id ?? null;

  const merchantId = await resolveMerchantFromStripe(supabase, {
    customerId,
    subscriptionId,
  });
  if (!merchantId) return;

  const state = await getMerchantSubscriptionRow(supabase, merchantId);
  if (!state) return;

  if (state.status === 'grace_period') {
    const graceEnded =
      state.gracePeriodEndsAt && new Date(state.gracePeriodEndsAt).getTime() <= Date.now();
    if (graceEnded) {
      await downgradeToFreeAfterLapse(supabase, merchantId);
    }
    return;
  }

  if (state.status === 'active') {
    await initiateGracePeriod(supabase, merchantId);
  }
}

async function handleSubscriptionUpdated(
  supabase: SupabaseClient,
  subscription: Stripe.Subscription,
): Promise<void> {
  const merchantId = await resolveMerchantFromStripe(supabase, {
    merchantId: merchantIdFromMetadata(subscription),
    subscriptionId: subscription.id,
    customerId:
      typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer?.id,
  });
  if (!merchantId) return;

  await syncSubscriptionPeriod(supabase, merchantId, subscription);

  const state = await getMerchantBillingState(supabase, merchantId);
  if (!state?.subscription.downgradeToPlanId) return;

  const periodEndMs = subscription.current_period_end * 1000;
  if (Date.now() >= periodEndMs) {
    await executeScheduledDowngrade(supabase, merchantId);
  }
}

async function handleSubscriptionDeleted(
  supabase: SupabaseClient,
  subscription: Stripe.Subscription,
): Promise<void> {
  const merchantId = await resolveMerchantFromStripe(supabase, {
    merchantId: merchantIdFromMetadata(subscription),
    subscriptionId: subscription.id,
  });
  if (!merchantId) return;

  await handleCancellationToFree(supabase, merchantId);
}

export async function processExpiredGracePeriods(supabase: SupabaseClient): Promise<number> {
  const now = new Date().toISOString();
  const { data: rows } = await supabase
    .from(TABLES.MERCHANT_SUBSCRIPTIONS)
    .select('merchant_id')
    .eq('status', 'grace_period')
    .lte('grace_period_ends_at', now);

  let count = 0;
  for (const row of rows ?? []) {
    await downgradeToFreeAfterLapse(supabase, (row as { merchant_id: string }).merchant_id);
    count += 1;
  }
  return count;
}

export async function sendGracePeriodReminders(supabase: SupabaseClient): Promise<number> {
  const dayFive = new Date();
  dayFive.setUTCDate(dayFive.getUTCDate() - 5);
  const windowStart = dayFive.toISOString();

  const { data: rows } = await supabase
    .from(TABLES.MERCHANT_SUBSCRIPTIONS)
    .select('merchant_id, grace_period_ends_at')
    .eq('status', 'grace_period')
    .lte('updated_at', windowStart);

  const { sendBillingEmail } = await import('@/lib/email/billingNotifications');
  const { getMerchantOwnerEmail } = await import('@/lib/billing/merchantBilling');

  let count = 0;
  for (const row of rows ?? []) {
    const typed = row as { merchant_id: string; grace_period_ends_at: string | null };
    const email = await getMerchantOwnerEmail(supabase, typed.merchant_id);
    if (!email) continue;
    await sendBillingEmail('grace_reminder', {
      to: email,
      gracePeriodEndsAt: typed.grace_period_ends_at ?? undefined,
    });
    count += 1;
  }
  return count;
}
