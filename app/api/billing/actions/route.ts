import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  applyPlanUpgrade,
  scheduleDowngrade,
} from '@/lib/billing/lifecycle';
import { getMerchantBillingState } from '@/lib/billing/merchantBilling';
import { getPlanStripePriceId } from '@/lib/billing/planStripeIds';
import {
  isDowngrade,
  isUpgrade,
  PLANS,
  type PlanId,
} from '@/lib/billing/plans';
import {
  cancelSubscriptionAtPeriodEnd,
  clearSubscriptionCancellation,
  createSubscriptionCheckoutSession,
  createTopUpCheckoutSession,
  createBillingPortalSession,
  isStripeConfigured,
  upgradeSubscriptionImmediate,
} from '@/lib/billing/stripeClient';
import { getAppUrl } from '@/lib/utils/appUrl';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { TABLES } from '@/lib/supabase/tables';
import { sendEmail } from '@/lib/email/send';
import { env } from '@/lib/utils/env';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  action: z.enum([
    'checkout',
    'topup',
    'portal',
    'upgrade',
    'downgrade',
    'cancel',
    'resume',
    'contact_scale',
  ]),
  planId: z.enum(['pro', 'growth', 'free']).optional(),
});

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user ?? null;
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const service = createServiceClient();
  const { denied, ctx } = await requirePermission(service, user.id, PERMISSIONS.MANAGE_SETTINGS);
  if (denied) return denied;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { action, planId } = parsed.data;
  const state = await getMerchantBillingState(service, ctx.merchantId);
  if (!state) return NextResponse.json({ error: 'Billing state not found' }, { status: 404 });

  const appUrl = getAppUrl();
  const returnPath = '/settings/billing';

  if (action === 'contact_scale') {
    const contactEmail = env.BILLING_CONTACT_EMAIL ?? 'hello@unauth.co';
    await sendEmail({
      to: contactEmail,
      subject: `Scale plan inquiry — merchant ${ctx.merchantId}`,
      html: `<p>Merchant ${ctx.merchantId} (${user.email}) requested Scale plan contact.</p>`,
      text: `Scale inquiry from ${user.email} merchant ${ctx.merchantId}`,
    });
    return NextResponse.json({ ok: true, message: 'We will contact you shortly.' });
  }

  if (!isStripeConfigured()) {
    const allowStripeBypass =
      env.VERCEL_ENV !== 'production' &&
      env.VERCEL_ENV !== 'preview' &&
      process.env.NODE_ENV !== 'production';
    if (!allowStripeBypass) {
      return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 });
    }
    if (action === 'upgrade' && planId) {
      await applyPlanUpgrade(service, ctx.merchantId, planId, { sendEmail: 'plan_upgraded' });
      return NextResponse.json({ ok: true, devMode: true, message: 'Plan upgraded (Stripe not configured).' });
    }
    if (action === 'downgrade' && planId) {
      const result = await scheduleDowngrade(service, ctx.merchantId, planId);
      return NextResponse.json({ ok: true, devMode: true, ...result });
    }
    if (action === 'topup') {
      const { grantTopUpCredits } = await import('@/lib/billing/lifecycle');
      await grantTopUpCredits(service, ctx.merchantId, null);
      return NextResponse.json({ ok: true, devMode: true, message: '200 credits added (Stripe not configured).' });
    }
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 });
  }

  switch (action) {
    case 'checkout': {
      if (!planId) return NextResponse.json({ error: 'planId required' }, { status: 400 });
      const priceId = getPlanStripePriceId(planId);
      if (!priceId) return NextResponse.json({ error: 'Plan not available for checkout' }, { status: 400 });
      const url = await createSubscriptionCheckoutSession({
        customerId: state.subscription.stripeCustomerId ?? undefined,
        customerEmail: state.subscription.stripeCustomerId ? undefined : user.email,
        priceId,
        merchantId: ctx.merchantId,
        successUrl: `${appUrl}${returnPath}?checkout=success`,
        cancelUrl: `${appUrl}${returnPath}?checkout=cancelled`,
      });
      return NextResponse.json({ url });
    }
    case 'topup': {
      const priceId = env.STRIPE_PRICE_TOPUP ?? null;
      if (!priceId || !state.subscription.stripeCustomerId) {
        return NextResponse.json({ error: 'Top-up unavailable' }, { status: 400 });
      }
      const url = await createTopUpCheckoutSession({
        customerId: state.subscription.stripeCustomerId,
        priceId,
        merchantId: ctx.merchantId,
        successUrl: `${appUrl}${returnPath}?topup=success`,
        cancelUrl: `${appUrl}${returnPath}?topup=cancelled`,
      });
      return NextResponse.json({ url });
    }
    case 'portal': {
      if (!state.subscription.stripeCustomerId) {
        return NextResponse.json({ error: 'No Stripe customer on file' }, { status: 400 });
      }
      const url = await createBillingPortalSession({
        customerId: state.subscription.stripeCustomerId,
        returnUrl: `${appUrl}${returnPath}`,
      });
      return NextResponse.json({ url });
    }
    case 'upgrade': {
      if (!planId) return NextResponse.json({ error: 'planId required' }, { status: 400 });
      if (!isUpgrade(state.subscription.planId, planId)) {
        return NextResponse.json({ error: 'Not an upgrade' }, { status: 400 });
      }
      if (state.subscription.downgradeToPlanId) {
        await service
          .from(TABLES.MERCHANT_SUBSCRIPTIONS)
          .update({ downgrade_to_plan_id: null, updated_at: new Date().toISOString() })
          .eq('merchant_id', ctx.merchantId);
      }
      const priceId = getPlanStripePriceId(planId as PlanId);
      if (state.subscription.stripeSubscriptionId && priceId) {
        await upgradeSubscriptionImmediate({
          subscriptionId: state.subscription.stripeSubscriptionId,
          newPriceId: priceId,
        });
      } else if (priceId) {
        const url = await createSubscriptionCheckoutSession({
          customerEmail: user.email,
          priceId,
          merchantId: ctx.merchantId,
          successUrl: `${appUrl}${returnPath}?checkout=success`,
          cancelUrl: `${appUrl}${returnPath}?checkout=cancelled`,
        });
        return NextResponse.json({ url });
      }
      await applyPlanUpgrade(service, ctx.merchantId, planId, { sendEmail: 'plan_upgraded' });
      return NextResponse.json({ ok: true, message: 'Plan upgraded.' });
    }
    case 'downgrade': {
      if (!planId) return NextResponse.json({ error: 'planId required' }, { status: 400 });
      if (!isDowngrade(state.subscription.planId, planId)) {
        return NextResponse.json({ error: 'Not a downgrade' }, { status: 400 });
      }
      const result = await scheduleDowngrade(service, ctx.merchantId, planId);
      return NextResponse.json({ ok: true, ...result });
    }
    case 'cancel': {
      if (state.subscription.stripeSubscriptionId) {
        await cancelSubscriptionAtPeriodEnd(state.subscription.stripeSubscriptionId);
      }
      await service
        .from(TABLES.MERCHANT_SUBSCRIPTIONS)
        .update({
          cancel_at_period_end: true,
          downgrade_to_plan_id: 'free',
          updated_at: new Date().toISOString(),
        })
        .eq('merchant_id', ctx.merchantId);
      return NextResponse.json({
        ok: true,
        message: `Your ${PLANS[state.subscription.planId].name} plan stays active until ${state.subscription.currentPeriodEnd ?? 'period end'}.`,
        effectiveDate: state.subscription.currentPeriodEnd,
      });
    }
    case 'resume': {
      if (state.subscription.stripeSubscriptionId) {
        await clearSubscriptionCancellation(state.subscription.stripeSubscriptionId);
      }
      await service
        .from(TABLES.MERCHANT_SUBSCRIPTIONS)
        .update({
          cancel_at_period_end: false,
          downgrade_to_plan_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq('merchant_id', ctx.merchantId);
      return NextResponse.json({ ok: true });
    }
    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }
}
