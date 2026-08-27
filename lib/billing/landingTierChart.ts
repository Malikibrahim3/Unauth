/** Public projection of the canonical commercial catalogue in `plans.ts`. */
import {
  PLANS,
  PUBLIC_PLAN_IDS,
  TOP_UP_CREDITS,
  TOP_UP_PRICE_GBP,
  type PlanId,
} from '@/lib/billing/plans';

export const LANDING_BILLING_TRANSPARENCY =
  `Every plan has an explicit monthly allowance. One optional top-up adds ${TOP_UP_CREDITS} credits for £${TOP_UP_PRICE_GBP}. Credits are recorded only after successful catalogue operations; they never permit Unauth to make a merchant decision or submit a provider claim.`;

export type LandingTierKey = PlanId;

export interface LandingTierChartEntry {
  key: LandingTierKey;
  name: string;
  tagline: string;
  price: string;
  priceNote?: string;
  features: readonly string[];
  showOnPublicPricing: boolean;
}

export const LANDING_TIER_CHART: readonly LandingTierChartEntry[] = PUBLIC_PLAN_IDS.map((key) => {
  const plan = PLANS[key];
  return {
    key,
    name: plan.name,
    tagline: plan.description,
    price: plan.priceGbp === 'custom'
      ? 'Custom'
      : `£${plan.priceGbp.toLocaleString('en-GB')}/month`,
    priceNote: plan.creditsMonthly === 'custom'
      ? 'Allowance agreed before activation'
      : `${plan.creditsMonthly.toLocaleString('en-GB')} context credits / month`,
    features: plan.publicFeatures,
    showOnPublicPricing: true,
  };
});

export const LANDING_PRICING_TIERS = LANDING_TIER_CHART;

export const LANDING_FAQ_ALWAYS_FREE = {
  q: 'Will it always be free?',
  a: 'Free is the supervised entry plan. Higher-volume teams need a plan with the required credits, history limits, controls, and support.',
} as const;
