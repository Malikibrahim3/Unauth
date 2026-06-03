import {
  getPlanCreditsMonthly,
  normalizePlanId,
  type PlanId,
  type SubscriptionStatus,
} from '@/lib/billing/plans';
import { normalizeTier, type Tier } from '@/lib/billing/normalizeTier';
import { TABLES } from '@/lib/supabase/tables';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface MerchantSubscriptionRow {
  id: string;
  merchantId: string;
  planId: PlanId;
  status: SubscriptionStatus;
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
  currentPeriodStart: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  downgradeToPlanId: PlanId | null;
  gracePeriodEndsAt: string | null;
  contextCreditsMonthly: number | null;
}

export interface MerchantCreditsRow {
  merchantId: string;
  monthlyCreditsRemaining: number;
  topupCreditsRemaining: number;
  cycleResetAt: string;
  lastResetAt: string | null;
  usageWarningSentAt: string | null;
}

export interface MerchantBillingState {
  subscription: MerchantSubscriptionRow;
  credits: MerchantCreditsRow;
  tier: Tier;
  monthlyAllowance: number | null;
  totalRemaining: number;
  usedThisCycle: number;
}

const LIVE_STATUSES: SubscriptionStatus[] = ['active', 'grace_period', 'past_due', 'free'];

type SubDbRow = {
  id: string;
  merchant_id: string;
  plan_id: string;
  status: string;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  current_period_start: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  downgrade_to_plan_id: string | null;
  grace_period_ends_at: string | null;
  context_credits_monthly: number | null;
};

type CreditsDbRow = {
  merchant_id: string;
  monthly_credits_remaining: number;
  topup_credits_remaining: number;
  cycle_reset_at: string;
  last_reset_at: string | null;
  usage_warning_sent_at: string | null;
};

function mapSubscription(row: SubDbRow): MerchantSubscriptionRow {
  return {
    id: row.id,
    merchantId: row.merchant_id,
    planId: normalizePlanId(row.plan_id),
    status: row.status as SubscriptionStatus,
    stripeSubscriptionId: row.stripe_subscription_id,
    stripeCustomerId: row.stripe_customer_id,
    currentPeriodStart: row.current_period_start,
    currentPeriodEnd: row.current_period_end,
    cancelAtPeriodEnd: row.cancel_at_period_end,
    downgradeToPlanId: row.downgrade_to_plan_id ? normalizePlanId(row.downgrade_to_plan_id) : null,
    gracePeriodEndsAt: row.grace_period_ends_at,
    contextCreditsMonthly:
      row.context_credits_monthly != null ? Number(row.context_credits_monthly) : null,
  };
}

function mapCredits(row: CreditsDbRow): MerchantCreditsRow {
  return {
    merchantId: row.merchant_id,
    monthlyCreditsRemaining: Number(row.monthly_credits_remaining),
    topupCreditsRemaining: Number(row.topup_credits_remaining),
    cycleResetAt: row.cycle_reset_at,
    lastResetAt: row.last_reset_at,
    usageWarningSentAt: row.usage_warning_sent_at,
  };
}

export async function getMerchantSubscriptionRow(
  supabase: SupabaseClient,
  merchantId: string,
): Promise<MerchantSubscriptionRow | null> {
  const { data, error } = await supabase
    .from(TABLES.MERCHANT_SUBSCRIPTIONS)
    .select(
      'id, merchant_id, plan_id, status, stripe_subscription_id, stripe_customer_id, current_period_start, current_period_end, cancel_at_period_end, downgrade_to_plan_id, grace_period_ends_at, context_credits_monthly',
    )
    .eq('merchant_id', merchantId)
    .in('status', LIVE_STATUSES)
    .order('current_period_start', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return mapSubscription(data as SubDbRow);
}

export async function getMerchantCreditsRow(
  supabase: SupabaseClient,
  merchantId: string,
): Promise<MerchantCreditsRow | null> {
  const { data, error } = await supabase
    .from(TABLES.MERCHANT_CREDITS)
    .select(
      'merchant_id, monthly_credits_remaining, topup_credits_remaining, cycle_reset_at, last_reset_at, usage_warning_sent_at',
    )
    .eq('merchant_id', merchantId)
    .maybeSingle();

  if (error || !data) return null;
  return mapCredits(data as CreditsDbRow);
}

export async function getMerchantBillingState(
  supabase: SupabaseClient,
  merchantId: string,
): Promise<MerchantBillingState | null> {
  const subscription = await getMerchantSubscriptionRow(supabase, merchantId);
  if (!subscription) return null;

  const credits = await getMerchantCreditsRow(supabase, merchantId);
  if (!credits) return null;

  const tier = normalizeTier(subscription.planId) as Tier;
  const monthlyAllowance = getPlanCreditsMonthly(
    subscription.planId,
    subscription.contextCreditsMonthly,
  );
  const totalRemaining = credits.monthlyCreditsRemaining + credits.topupCreditsRemaining;
  const usedThisCycle =
    monthlyAllowance != null ? Math.max(monthlyAllowance - credits.monthlyCreditsRemaining, 0) : 0;

  return {
    subscription,
    credits,
    tier,
    monthlyAllowance,
    totalRemaining,
    usedThisCycle,
  };
}

export async function getMerchantOwnerEmail(
  supabase: SupabaseClient,
  merchantId: string,
): Promise<string | null> {
  const { data: merchant } = await supabase
    .from(TABLES.MERCHANTS)
    .select('user_id')
    .eq('id', merchantId)
    .maybeSingle();

  const userId = (merchant as { user_id?: string } | null)?.user_id;
  if (!userId) return null;

  const { data: userData, error } = await supabase.auth.admin.getUserById(userId);
  if (error || !userData?.user?.email) return null;
  return userData.user.email;
}

export async function logBillingEvent(
  supabase: SupabaseClient,
  input: {
    merchantId?: string | null;
    eventType: string;
    stripeEventId?: string | null;
    payload?: Record<string, unknown>;
  },
): Promise<{ duplicate: boolean }> {
  if (input.stripeEventId) {
    const { data: existing } = await supabase
      .from(TABLES.BILLING_EVENTS_LOG)
      .select('id')
      .eq('stripe_event_id', input.stripeEventId)
      .maybeSingle();

    if (existing) return { duplicate: true };
  }

  const { error } = await supabase.from(TABLES.BILLING_EVENTS_LOG).insert({
    merchant_id: input.merchantId ?? null,
    event_type: input.eventType,
    stripe_event_id: input.stripeEventId ?? null,
    payload: input.payload ?? {},
  });

  if (error?.code === '23505') return { duplicate: true };
  if (error) throw new Error(`billing event log failed: ${error.message}`);
  return { duplicate: false };
}
