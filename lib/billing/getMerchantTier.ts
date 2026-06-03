import { getMerchantSubscriptionRow } from '@/lib/billing/merchantBilling';
import { normalizePlanId, type SubscriptionStatus } from '@/lib/billing/plans';
import { normalizeTier } from '@/lib/billing/normalizeTier';
import { effectiveTier, type Tier } from '@/lib/billing/tiers';
import { DEV_TIER_COOKIE, getDevPreviewFromCookieValue } from '@/lib/product/devPreview';
import type { SupabaseClient } from '@supabase/supabase-js';

export type { SubscriptionStatus };

export interface MerchantSubscription {
  merchantId: string;
  /** Subscribed tier from DB — used for credits and allowances (never dev-gated to free). */
  tier: Tier;
  planId: ReturnType<typeof normalizePlanId>;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string | null;
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
  cancelAtPeriodEnd: boolean;
  downgradeToPlanId: ReturnType<typeof normalizePlanId> | null;
  gracePeriodEndsAt: string | null;
  providerRef: string | null;
  contextCreditsMonthly: number | null;
}

const ACTIVE_STATUSES: SubscriptionStatus[] = ['active', 'grace_period', 'past_due', 'free'];

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

  const row = await getMerchantSubscriptionRow(supabase, merchantId);
  if (!row) return 'free';
  return normalizeTier(row.planId);
}

function mapToLegacySubscription(
  merchantId: string,
  row: NonNullable<Awaited<ReturnType<typeof getMerchantSubscriptionRow>>>,
): MerchantSubscription {
  return {
    merchantId,
    tier: normalizeTier(row.planId),
    planId: row.planId,
    status: row.status,
    currentPeriodStart: row.currentPeriodStart,
    currentPeriodEnd: row.currentPeriodEnd,
    stripeSubscriptionId: row.stripeSubscriptionId,
    stripeCustomerId: row.stripeCustomerId,
    cancelAtPeriodEnd: row.cancelAtPeriodEnd,
    downgradeToPlanId: row.downgradeToPlanId,
    gracePeriodEndsAt: row.gracePeriodEndsAt,
    providerRef: row.stripeSubscriptionId,
    contextCreditsMonthly: row.contextCreditsMonthly,
  };
}

export async function getMerchantSubscription(
  supabase: SupabaseClient,
  merchantId: string,
): Promise<MerchantSubscription | null> {
  const row = await getMerchantSubscriptionRow(supabase, merchantId);
  if (!row || !ACTIVE_STATUSES.includes(row.status)) return null;
  return mapToLegacySubscription(merchantId, row);
}

export async function getSubscribedMerchantTier(
  supabase: SupabaseClient,
  merchantId: string,
): Promise<Tier> {
  const subscription = await getMerchantSubscription(supabase, merchantId);
  return subscription?.tier ?? 'free';
}
