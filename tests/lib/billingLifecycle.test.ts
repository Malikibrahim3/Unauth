import {
  GRACE_PERIOD_DAYS,
  PLANS,
  TOP_UP_CREDITS,
  TOP_UP_PRICE_GBP,
  isUpgrade,
  isDowngrade,
  canSelfServeTopUp,
} from '@/lib/billing/plans';
import { computeUpgradeCredits } from '@/lib/billing/lifecycle';
import { getCreditUsageBand } from '@/lib/billing/creditUsage';
import type { ContextCreditSnapshot } from '@/lib/billing/contextCredits';
import { isContextTypeSuspended } from '@/lib/billing/subscriptionAccess';
import type { MerchantSubscription } from '@/lib/billing/getMerchantTier';

describe('billing plans', () => {
  it('defines canonical plan credits', () => {
    expect(PLANS.free.creditsMonthly).toBe(100);
    expect(PLANS.pro.creditsMonthly).toBe(1000);
    expect(PLANS.growth.creditsMonthly).toBe(5000);
  });

  it('top-up constants match spec', () => {
    expect(TOP_UP_CREDITS).toBe(200);
    expect(TOP_UP_PRICE_GBP).toBe(15);
  });

  it('grace period is 7 days', () => {
    expect(GRACE_PERIOD_DAYS).toBe(7);
  });

  it('detects upgrades and downgrades', () => {
    expect(isUpgrade('free', 'pro')).toBe(true);
    expect(isDowngrade('growth', 'pro')).toBe(true);
    expect(isUpgrade('pro', 'free')).toBe(false);
  });

  it('allows top-up on pro+ only', () => {
    expect(canSelfServeTopUp('free')).toBe(false);
    expect(canSelfServeTopUp('pro')).toBe(true);
    expect(canSelfServeTopUp('growth')).toBe(true);
    expect(canSelfServeTopUp('scale')).toBe(true);
  });
});

describe('computeUpgradeCredits', () => {
  it('tops up to new allowance minus consumed', () => {
    const credits = computeUpgradeCredits({
      oldPlanId: 'free',
      newPlanId: 'pro',
      monthlyCreditsRemaining: 60,
    });
    expect(credits).toBe(960);
  });

  it('prorates credits on upgrade after consumption', () => {
    const credits = computeUpgradeCredits({
      oldPlanId: 'pro',
      newPlanId: 'growth',
      monthlyCreditsRemaining: 0,
    });
    expect(credits).toBe(4000);
  });
});

function makeSnapshot(overrides: Partial<ContextCreditSnapshot>): ContextCreditSnapshot {
  return {
    tier: 'pro',
    allowance: 1000,
    allowanceConfigured: true,
    used: 800,
    remaining: 200,
    monthlyRemaining: 200,
    topupRemaining: 0,
    periodStart: '2026-06-01T00:00:00.000Z',
    periodEnd: '2026-07-01T00:00:00.000Z',
    overageAllowed: true,
    usageBand: 'normal',
    usageRatio: 0.8,
    subscriptionStatus: 'active',
    ...overrides,
  };
}

describe('credit usage bands', () => {
  it('warns at 80%', () => {
    const band = getCreditUsageBand(makeSnapshot({ used: 800, monthlyRemaining: 200 }));
    expect(band).toBe('warning');
  });

  it('exhausted when no credits left', () => {
    const band = getCreditUsageBand(makeSnapshot({ used: 1000, monthlyRemaining: 0, topupRemaining: 0, remaining: 0 }));
    expect(band).toBe('exhausted');
  });
});

describe('subscription access suspension', () => {
  const baseSub: MerchantSubscription = {
    merchantId: 'm1',
    tier: 'pro',
    planId: 'pro',
    status: 'grace_period',
    currentPeriodStart: '2026-06-01T00:00:00.000Z',
    currentPeriodEnd: '2026-07-01T00:00:00.000Z',
    stripeSubscriptionId: 'sub_1',
    stripeCustomerId: 'cus_1',
    cancelAtPeriodEnd: false,
    downgradeToPlanId: null,
    gracePeriodEndsAt: '2026-06-08T00:00:00.000Z',
    providerRef: 'sub_1',
    contextCreditsMonthly: null,
  };

  it('suspends network checks in grace period', () => {
    const result = isContextTypeSuspended(baseSub, 'full_context', false);
    expect(result.allowed).toBe(false);
  });

  it('allows store checks in grace period', () => {
    const result = isContextTypeSuspended(baseSub, 'basic_context', false);
    expect(result.allowed).toBe(true);
  });

  it('suspends network when credits exhausted', () => {
    const result = isContextTypeSuspended(
      { ...baseSub, status: 'active' },
      'full_context',
      true,
    );
    expect(result.allowed).toBe(false);
  });
});
