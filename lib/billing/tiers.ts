// Tier compatibility facade. Commercial values and entitlements are derived
// from the single plan catalogue in `plans.ts`.
import {
  PLANS,
  type FeatureKey,
  type Tier,
  type TierLimits,
} from '@/lib/billing/plans';

export type { FeatureKey, Tier, TierLimits } from '@/lib/billing/plans';

let productionBillingConfigWarned = false;

export function isBillingActive(): boolean {
  if (process.env.VERCEL_ENV === 'production') {
    if (process.env.BILLING_ACTIVE !== 'true' && !productionBillingConfigWarned) {
      productionBillingConfigWarned = true;
      console.warn(
        '[billing] BILLING_ACTIVE is not set to true in production. Tier gates still use subscription rows; set BILLING_ACTIVE=true for explicit billing mode.',
      );
    }
    return true;
  }
  return process.env.BILLING_ACTIVE === 'true';
}

export interface TierEntitlements {
  tier: Tier;
  label: string;
  tagline: string;
  priceMonthlyGbp: number | 'custom';
  features: Partial<Record<FeatureKey, true>>;
  limits: TierLimits;
}

export const TIER_ORDER: Record<Tier, number> = {
  free: 0,
  pro: 1,
  growth: 2,
  enterprise: 3,
};

export const TIER_CONFIG: Record<Tier, TierEntitlements> = {
  free: {
    tier: 'free',
    label: PLANS.free.name,
    tagline: PLANS.free.description,
    priceMonthlyGbp: PLANS.free.priceGbp,
    features: PLANS.free.entitlements,
    limits: PLANS.free.limits,
  },
  pro: {
    tier: 'pro',
    label: PLANS.pro.name,
    tagline: PLANS.pro.description,
    priceMonthlyGbp: PLANS.pro.priceGbp,
    features: PLANS.pro.entitlements,
    limits: PLANS.pro.limits,
  },
  growth: {
    tier: 'growth',
    label: PLANS.growth.name,
    tagline: PLANS.growth.description,
    priceMonthlyGbp: PLANS.growth.priceGbp,
    features: PLANS.growth.entitlements,
    limits: PLANS.growth.limits,
  },
  enterprise: {
    tier: 'enterprise',
    label: PLANS.scale.name,
    tagline: PLANS.scale.description,
    priceMonthlyGbp: PLANS.scale.priceGbp,
    features: PLANS.scale.entitlements,
    limits: PLANS.scale.limits,
  },
};

export function effectiveTier(tier: Tier): Tier {
  return isBillingActive() ? tier : 'free';
}

export function can(tier: Tier, feature: FeatureKey): boolean {
  return TIER_CONFIG[effectiveTier(tier)].features[feature] === true;
}

export function limit<K extends keyof TierLimits>(tier: Tier, key: K): TierLimits[K] {
  return TIER_CONFIG[effectiveTier(tier)].limits[key];
}

export function tierLabel(tier: Tier): string {
  return TIER_CONFIG[tier].label;
}

export function minimumTierForFeature(feature: FeatureKey): Tier {
  const ordered: Tier[] = ['free', 'pro', 'growth', 'enterprise'];
  for (const tier of ordered) {
    if (can(tier, feature)) return tier;
  }
  return 'enterprise';
}
