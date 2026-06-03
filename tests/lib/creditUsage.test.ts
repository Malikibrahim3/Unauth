import {
  buildCreditUsageWidgetFields,
  getCreditUsageBand,
  resolveCreditPrecheckMode,
} from '@/lib/billing/creditUsage';
import type { ContextCreditSnapshot } from '@/lib/billing/contextCredits';

function snapshot(partial: Partial<ContextCreditSnapshot>): ContextCreditSnapshot {
  const monthlyRemaining = partial.monthlyRemaining ?? partial.remaining ?? 100;
  const topupRemaining = partial.topupRemaining ?? 0;
  const allowance = partial.allowance ?? 100;
  const used = partial.used ?? allowance - monthlyRemaining;
  return {
    tier: 'pro',
    allowance,
    allowanceConfigured: true,
    used,
    remaining: partial.remaining ?? monthlyRemaining + topupRemaining,
    monthlyRemaining,
    topupRemaining,
    periodStart: '2026-06-01T00:00:00.000Z',
    periodEnd: '2026-07-01T00:00:00.000Z',
    overageAllowed: true,
    usageBand: 'normal',
    usageRatio: 0,
    subscriptionStatus: 'active',
    ...partial,
  };
}

describe('creditUsage', () => {
  it('flags warning at 80% usage', () => {
    const s = snapshot({ used: 80, monthlyRemaining: 20, remaining: 20, usageRatio: 0.8 });
    expect(getCreditUsageBand(s)).toBe('warning');
    const fields = buildCreditUsageWidgetFields(s, 'https://app.example.com');
    expect(fields?.credit_usage_banner).toMatch(/80%/);
  });

  it('uses network paused fallback when exhausted on full check', () => {
    const s = snapshot({ used: 100, monthlyRemaining: 0, topupRemaining: 0, remaining: 0, usageRatio: 1, usageBand: 'exhausted' });
    expect(getCreditUsageBand(s)).toBe('exhausted');
    expect(resolveCreditPrecheckMode(s, 'full_context')).toEqual({
      kind: 'network_paused_fallback',
      requested: 'full_context',
    });
    expect(resolveCreditPrecheckMode(s, 'basic_context')).toEqual({ kind: 'soft_cap_basic' });
  });
});
