import { normalizeTier } from '@/lib/billing/normalizeTier';
import { effectiveTier, type Tier } from '@/lib/billing/tiers';
import { DEV_TIER_COOKIE, getDevPreviewFromCookieValue } from '@/lib/product/devPreview';
import { TABLES } from '@/lib/supabase/tables';
import type { SupabaseClient } from '@supabase/supabase-js';

export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled';

export interface MerchantSubscription {
  merchantId: string;
  /** Subscribed tier from DB — used for credits and allowances (never dev-gated to free). */
  tier: Tier;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string | null;
  providerRef: string | null;
  /** Explicit monthly context credits for scale/enterprise; null when not set. */
  contextCreditsMonthly: number | null;
}

const ACTIVE_STATUSES: SubscriptionStatus[] = ['active', 'trialing'];

/**
 * Returns the merchant's effective billing tier (after {@link effectiveTier} / `BILLING_ACTIVE`).
 * Dev-preview cookie override applies in non-production before the gate.
 *
 * Feature access must use {@link can} and {@link limit} — never branch on feature flags by
 * comparing this string to `'pro'` / `'growth'` without those helpers.
 */
export async function getMerchantTier(
  supabase: SupabaseClient,
  merchantId: string,
): Promise<Tier> {
  const resolved = await resolveMerchantTierRaw(supabase, merchantId);
  return effectiveTier(resolved);
}

async function resolveMerchantTierRaw(
  supabase: SupabaseClient,
  merchantId: string,
): Promise<Tier> {
  if (process.env.VERCEL_ENV !== 'production') {
    try {
      const { cookies } = await import('next/headers');
      const raw = (await cookies()).get(DEV_TIER_COOKIE)?.value;
      const preview = getDevPreviewFromCookieValue(raw);
      if (preview) return preview.tier;
    } catch {
      // cookies() throws outside request context — fall through to DB.
    }
  }

  const { data, error } = await supabase
    .from(TABLES.SUBSCRIPTIONS)
    .select('tier, status, current_period_start, current_period_end, provider_ref')
    .eq('merchant_id', merchantId)
    .in('status', ACTIVE_STATUSES)
    .order('current_period_start', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return 'free';
  }

  return normalizeTier(data.tier);
}

export async function getMerchantSubscription(
  supabase: SupabaseClient,
  merchantId: string,
): Promise<MerchantSubscription | null> {
  const { data, error } = await supabase
    .from(TABLES.SUBSCRIPTIONS)
    .select(
      'tier, status, current_period_start, current_period_end, provider_ref, context_credits_monthly',
    )
    .eq('merchant_id', merchantId)
    .in('status', ACTIVE_STATUSES)
    .order('current_period_start', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as {
    tier: string;
    status: string;
    current_period_start: string;
    current_period_end: string | null;
    provider_ref: string | null;
    context_credits_monthly: number | null;
  };

  return {
    merchantId,
    tier: normalizeTier(row.tier),
    status: row.status as SubscriptionStatus,
    currentPeriodStart: row.current_period_start,
    currentPeriodEnd: row.current_period_end,
    providerRef: row.provider_ref,
    contextCreditsMonthly:
      row.context_credits_monthly != null ? Number(row.context_credits_monthly) : null,
  };
}

/** Subscribed tier for credits/allowances — same as {@link getMerchantSubscription}.tier. */
export async function getSubscribedMerchantTier(
  supabase: SupabaseClient,
  merchantId: string,
): Promise<Tier> {
  const subscription = await getMerchantSubscription(supabase, merchantId);
  return subscription?.tier ?? 'free';
}
