import { env } from '@/lib/utils/env';
import {
  getMerchantBillingState,
  getMerchantOwnerEmail,
  logBillingEvent,
} from '@/lib/billing/merchantBilling';
import { getTopUpStripePriceId } from '@/lib/billing/planStripeIds';
import {
  GRACE_PERIOD_DAYS,
  getPlanCreditsMonthly,
  isDowngrade,
  isUpgrade,
  PLANS,
  TOP_UP_CREDITS,
  TOP_UP_PRICE_GBP,
  type PlanId,
} from '@/lib/billing/plans';
import { TABLES } from '@/lib/supabase/tables';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  sendBillingEmail,
  type BillingEmailKind,
} from '@/lib/email/billingNotifications';

function addDays(iso: string | Date, days: number): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

function prorateCredits(
  fullAllowance: number,
  periodStart: string,
  periodEnd: string,
): number {
  const start = new Date(periodStart).getTime();
  const end = new Date(periodEnd).getTime();
  const now = Date.now();
  const totalMs = Math.max(end - start, 1);
  const remainingMs = Math.max(end - now, 0);
  return Math.floor((fullAllowance * remainingMs) / totalMs);
}

export function computeUpgradeCredits(input: {
  oldPlanId: PlanId;
  newPlanId: PlanId;
  monthlyCreditsRemaining: number;
  oldCustomAllowance?: number | null;
  newCustomAllowance?: number | null;
}): number {
  const oldAllowance =
    getPlanCreditsMonthly(input.oldPlanId, input.oldCustomAllowance) ?? 0;
  const newAllowance =
    getPlanCreditsMonthly(input.newPlanId, input.newCustomAllowance) ?? 0;
  const consumed = Math.max(oldAllowance - input.monthlyCreditsRemaining, 0);
  return Math.max(newAllowance - consumed, 0);
}

export async function applyPlanUpgrade(
  supabase: SupabaseClient,
  merchantId: string,
  newPlanId: PlanId,
  options?: {
    customCreditsMonthly?: number | null;
    sendEmail?: BillingEmailKind;
  },
): Promise<void> {
  const state = await getMerchantBillingState(supabase, merchantId);
  if (!state) throw new Error('Merchant billing state not found');

  const oldPlanId = state.subscription.planId;
  const newCredits = computeUpgradeCredits({
    oldPlanId,
    newPlanId,
    monthlyCreditsRemaining: state.credits.monthlyCreditsRemaining,
    oldCustomAllowance: state.subscription.contextCreditsMonthly,
    newCustomAllowance: options?.customCreditsMonthly ?? state.subscription.contextCreditsMonthly,
  });

  await supabase
    .from(TABLES.MERCHANT_SUBSCRIPTIONS)
    .update({
      plan_id: newPlanId,
      status: 'active',
      downgrade_to_plan_id: null,
      grace_period_ends_at: null,
      cancel_at_period_end: false,
      context_credits_monthly: options?.customCreditsMonthly ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', state.subscription.id);

  await supabase.rpc('set_merchant_monthly_credits' as never, {
    p_merchant_id: merchantId,
    p_monthly_credits: newCredits,
  });

  if (options?.sendEmail) {
    const email = await getMerchantOwnerEmail(supabase, merchantId);
    if (email) {
      await sendBillingEmail(options.sendEmail, {
        to: email,
        planName: PLANS[newPlanId].name,
      });
    }
  }
}

export async function scheduleDowngrade(
  supabase: SupabaseClient,
  merchantId: string,
  targetPlanId: PlanId,
): Promise<{ effectiveDate: string | null }> {
  const state = await getMerchantBillingState(supabase, merchantId);
  if (!state) throw new Error('Merchant billing state not found');

  await supabase
    .from(TABLES.MERCHANT_SUBSCRIPTIONS)
    .update({
      cancel_at_period_end: false,
      downgrade_to_plan_id: targetPlanId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', state.subscription.id);

  const email = await getMerchantOwnerEmail(supabase, merchantId);
  if (email) {
    await sendBillingEmail('downgrade_scheduled', {
      to: email,
      planName: PLANS[targetPlanId].name,
      effectiveDate: state.subscription.currentPeriodEnd,
    });
  }

  return { effectiveDate: state.subscription.currentPeriodEnd };
}

export async function executeScheduledDowngrade(
  supabase: SupabaseClient,
  merchantId: string,
): Promise<void> {
  const state = await getMerchantBillingState(supabase, merchantId);
  if (!state?.subscription.downgradeToPlanId) return;

  const targetPlanId = state.subscription.downgradeToPlanId;
  const allowance = getPlanCreditsMonthly(targetPlanId, null) ?? 100;

  await supabase
    .from(TABLES.MERCHANT_SUBSCRIPTIONS)
    .update({
      plan_id: targetPlanId,
      status: targetPlanId === 'free' ? 'free' : 'active',
      downgrade_to_plan_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', state.subscription.id);

  await supabase.rpc('reset_merchant_monthly_credits' as never, {
    p_merchant_id: merchantId,
    p_monthly_allowance: allowance,
    p_cycle_reset_at: state.subscription.currentPeriodEnd ?? new Date().toISOString(),
  });

  const email = await getMerchantOwnerEmail(supabase, merchantId);
  if (email) {
    await sendBillingEmail('downgrade_executed', {
      to: email,
      planName: PLANS[targetPlanId].name,
    });
  }
}

export async function initiateGracePeriod(
  supabase: SupabaseClient,
  merchantId: string,
): Promise<void> {
  const graceEnds = addDays(new Date(), GRACE_PERIOD_DAYS);

  await supabase
    .from(TABLES.MERCHANT_SUBSCRIPTIONS)
    .update({
      status: 'grace_period',
      grace_period_ends_at: graceEnds,
      updated_at: new Date().toISOString(),
    })
    .eq('merchant_id', merchantId)
    .in('status', ['active', 'grace_period']);

  const email = await getMerchantOwnerEmail(supabase, merchantId);
  if (email) {
    await sendBillingEmail('payment_failed', {
      to: email,
      gracePeriodEndsAt: graceEnds,
    });
  }
}

export async function downgradeToFreeAfterLapse(
  supabase: SupabaseClient,
  merchantId: string,
): Promise<void> {
  const state = await getMerchantBillingState(supabase, merchantId);
  if (!state) return;

  await supabase
    .from(TABLES.MERCHANT_SUBSCRIPTIONS)
    .update({
      plan_id: 'free',
      status: 'past_due',
      stripe_subscription_id: null,
      downgrade_to_plan_id: null,
      grace_period_ends_at: null,
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', state.subscription.id);

  await supabase.rpc('reset_merchant_monthly_credits' as never, {
    p_merchant_id: merchantId,
    p_monthly_allowance: 100,
    p_cycle_reset_at: new Date().toISOString(),
  });

  const email = await getMerchantOwnerEmail(supabase, merchantId);
  if (email) {
    await sendBillingEmail('downgraded_to_free', { to: email });
  }
}

export async function restoreAfterPaymentRecovery(
  supabase: SupabaseClient,
  merchantId: string,
  planId: PlanId,
  periodStart: string,
  periodEnd: string,
): Promise<void> {
  const allowance = getPlanCreditsMonthly(planId, null) ?? 100;
  const prorated = prorateCredits(allowance, periodStart, periodEnd);

  await supabase
    .from(TABLES.MERCHANT_SUBSCRIPTIONS)
    .update({
      plan_id: planId,
      status: 'active',
      grace_period_ends_at: null,
      current_period_start: periodStart,
      current_period_end: periodEnd,
      updated_at: new Date().toISOString(),
    })
    .eq('merchant_id', merchantId);

  await supabase.rpc('set_merchant_monthly_credits' as never, {
    p_merchant_id: merchantId,
    p_monthly_credits: prorated,
  });

  const email = await getMerchantOwnerEmail(supabase, merchantId);
  if (email) {
    await sendBillingEmail('access_restored', {
      to: email,
      planName: PLANS[planId].name,
    });
  }
}

export async function handleCancellationToFree(
  supabase: SupabaseClient,
  merchantId: string,
): Promise<void> {
  await supabase
    .from(TABLES.MERCHANT_SUBSCRIPTIONS)
    .update({
      plan_id: 'free',
      status: 'free',
      stripe_subscription_id: null,
      cancel_at_period_end: false,
      downgrade_to_plan_id: null,
      grace_period_ends_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('merchant_id', merchantId);

  await supabase.rpc('reset_merchant_monthly_credits' as never, {
    p_merchant_id: merchantId,
    p_monthly_allowance: 100,
    p_cycle_reset_at: new Date().toISOString(),
  });

  const email = await getMerchantOwnerEmail(supabase, merchantId);
  if (email) {
    await sendBillingEmail('cancellation_confirmed', { to: email });
  }
}

export async function resetCreditsOnCycleRenewal(
  supabase: SupabaseClient,
  merchantId: string,
  planId: PlanId,
  periodEnd: string,
  customAllowance?: number | null,
): Promise<void> {
  const state = await getMerchantBillingState(supabase, merchantId);
  const allowance = getPlanCreditsMonthly(planId, customAllowance) ?? 100;
  const hadWarning = Boolean(state?.credits.usageWarningSentAt);

  await supabase.rpc('reset_merchant_monthly_credits' as never, {
    p_merchant_id: merchantId,
    p_monthly_allowance: allowance,
    p_cycle_reset_at: periodEnd,
  });

  if (hadWarning) {
    const email = await getMerchantOwnerEmail(supabase, merchantId);
    if (email) {
      await sendBillingEmail('credit_reset', {
        to: email,
        creditsMonthly: allowance,
      });
    }
  }
}

export async function grantTopUpCredits(
  supabase: SupabaseClient,
  merchantId: string,
  paymentIntentId?: string | null,
): Promise<{ duplicate: boolean }> {
  const { data, error } = await supabase.rpc('add_merchant_topup_credits' as never, {
    p_merchant_id: merchantId,
    p_credits: TOP_UP_CREDITS,
    p_amount_gbp: TOP_UP_PRICE_GBP,
    p_stripe_payment_intent_id: paymentIntentId ?? null,
  });

  if (error) throw new Error(`top-up grant failed: ${error.message}`);
  const row = data as { duplicate?: boolean };
  return { duplicate: row.duplicate === true };
}

export async function maybeSendUsageWarningEmail(
  supabase: SupabaseClient,
  merchantId: string,
): Promise<void> {
  const state = await getMerchantBillingState(supabase, merchantId);
  if (!state?.monthlyAllowance) return;

  const totalPool = state.monthlyAllowance + state.credits.topupCreditsRemaining;
  const consumed = state.monthlyAllowance - state.credits.monthlyCreditsRemaining;
  const ratio = totalPool > 0 ? consumed / totalPool : 0;

  if (ratio < 0.8 || state.credits.usageWarningSentAt) return;

  await supabase
    .from(TABLES.MERCHANT_CREDITS)
    .update({ usage_warning_sent_at: new Date().toISOString() })
    .eq('merchant_id', merchantId);

  const email = await getMerchantOwnerEmail(supabase, merchantId);
  if (email) {
    await sendBillingEmail('usage_warning_80', {
      to: email,
      usagePercent: Math.round(ratio * 100),
    });
  }
}

export async function resolvePlanFromStripePrice(priceId: string): Promise<PlanId | null> {
  if (env.STRIPE_PRICE_PRO && priceId === env.STRIPE_PRICE_PRO) return 'pro';
  if (env.STRIPE_PRICE_GROWTH && priceId === env.STRIPE_PRICE_GROWTH) return 'growth';
  return null;
}

export function isTopUpPrice(priceId: string): boolean {
  const topUp = getTopUpStripePriceId();
  return Boolean(topUp && priceId === topUp);
}

export {
  isUpgrade,
  isDowngrade,
  logBillingEvent,
};
