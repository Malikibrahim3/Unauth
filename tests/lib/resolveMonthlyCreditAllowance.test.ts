import { PLAN_CONTEXT_CREDITS } from '@/lib/billing/contextCredits';
import { resolveMonthlyCreditAllowance } from '@/lib/billing/resolveMonthlyCreditAllowance';

describe('resolveMonthlyCreditAllowance', () => {
  it('resolves standard plan allowances', () => {
    expect(resolveMonthlyCreditAllowance('free', null)).toEqual({ ok: true, allowance: PLAN_CONTEXT_CREDITS.free });
    expect(resolveMonthlyCreditAllowance('pro', null)).toEqual({ ok: true, allowance: PLAN_CONTEXT_CREDITS.pro });
    expect(resolveMonthlyCreditAllowance('growth', null)).toEqual({ ok: true, allowance: PLAN_CONTEXT_CREDITS.growth });
  });

  it('requires explicit allowance for enterprise', () => {
    expect(resolveMonthlyCreditAllowance('enterprise', null).ok).toBe(false);
    expect(resolveMonthlyCreditAllowance('enterprise', undefined).ok).toBe(false);
    expect(resolveMonthlyCreditAllowance('enterprise', 12_000)).toEqual({
      ok: true,
      allowance: 12_000,
    });
  });
});
