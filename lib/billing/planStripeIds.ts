import { env } from '@/lib/utils/env';
import type { PlanId } from '@/lib/billing/plans';

/** Stripe price IDs from env — server-only; do not import from client components. */
export function getPlanStripePriceId(planId: PlanId): string | null {
  switch (planId) {
    case 'pro':
      return env.STRIPE_PRICE_PRO ?? null;
    case 'growth':
      return env.STRIPE_PRICE_GROWTH ?? null;
    default:
      return null;
  }
}

export function getTopUpStripePriceId(): string | null {
  return env.STRIPE_PRICE_TOPUP ?? null;
}
