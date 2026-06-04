/** Canonical plan identifiers — must match `plans` table and Stripe products. */
export type PlanId = 'free' | 'pro' | 'growth' | 'scale';

export type SubscriptionStatus =
  | 'active'
  | 'past_due'
  | 'grace_period'
  | 'cancelled'
  | 'free';

export interface PlanDefinition {
  planId: PlanId;
  name: string;
  priceGbp: number | 'custom';
  creditsMonthly: number | 'custom';
  stripePriceId: string | null;
}

/** Hard-coded plan catalog. Stripe price IDs: `lib/billing/planStripeIds.ts` (server-only). */
export const PLANS: Record<PlanId, PlanDefinition> = {
  free: {
    planId: 'free',
    name: 'Free',
    priceGbp: 0,
    creditsMonthly: 100,
    stripePriceId: null,
  },
  pro: {
    planId: 'pro',
    name: 'Pro',
    priceGbp: 99,
    creditsMonthly: 1000,
    stripePriceId: null,
  },
  growth: {
    planId: 'growth',
    name: 'Growth',
    priceGbp: 399,
    creditsMonthly: 5000,
    stripePriceId: null,
  },
  scale: {
    planId: 'scale',
    name: 'Scale',
    priceGbp: 'custom',
    creditsMonthly: 'custom',
    stripePriceId: null,
  },
};

export const TOP_UP_CREDITS = 200;
export const TOP_UP_PRICE_GBP = 15;
export const GRACE_PERIOD_DAYS = 7;
export const CREDIT_USAGE_WARNING_RATIO = 0.8;

export function getPlanCreditsMonthly(planId: PlanId, customAllowance?: number | null): number | null {
  const plan = PLANS[planId];
  if (plan.creditsMonthly === 'custom') {
    return customAllowance ?? null;
  }
  return plan.creditsMonthly;
}

export function isPaidPlan(planId: PlanId): boolean {
  return planId !== 'free';
}

export function canSelfServeTopUp(planId: PlanId): boolean {
  return planId === 'pro' || planId === 'growth' || planId === 'scale';
}

export function planTierOrder(planId: PlanId): number {
  const order: Record<PlanId, number> = { free: 0, pro: 1, growth: 2, scale: 3 };
  return order[planId];
}

export function isUpgrade(from: PlanId, to: PlanId): boolean {
  return planTierOrder(to) > planTierOrder(from);
}

export function isDowngrade(from: PlanId, to: PlanId): boolean {
  return planTierOrder(to) < planTierOrder(from);
}

/** Map legacy tier strings to plan IDs. */
export function normalizePlanId(raw: string): PlanId {
  if (raw === 'enterprise') return 'scale';
  if (raw === 'free' || raw === 'pro' || raw === 'growth' || raw === 'scale') return raw;
  return 'free';
}
