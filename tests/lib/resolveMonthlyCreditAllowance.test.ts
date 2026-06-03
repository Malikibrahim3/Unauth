import { resolveMonthlyCreditAllowance } from '@/lib/billing/resolveMonthlyCreditAllowance';

describe('resolveMonthlyCreditAllowance', () => {
  it('resolves standard plan allowances', () => {
    expect(resolveMonthlyCreditAllowance('free', null)).toEqual({ ok: true, allowance: 50 });
    expect(resolveMonthlyCreditAllowance('pro', null)).toEqual({ ok: true, allowance: 1000 });
    expect(resolveMonthlyCreditAllowance('growth', null)).toEqual({ ok: true, allowance: 5000 });
  });

  it('requires explicit allowance for scale and enterprise', () => {
    expect(resolveMonthlyCreditAllowance('scale', null).ok).toBe(false);
    expect(resolveMonthlyCreditAllowance('enterprise', undefined).ok).toBe(false);
    expect(resolveMonthlyCreditAllowance('scale', 12_000)).toEqual({
      ok: true,
      allowance: 12_000,
    });
  });
});
