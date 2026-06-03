import {
  effectiveTier,
  isBillingActive,
  TIER_CONFIG,
} from '@/lib/billing/tiers';
import { resolveMonthlyCreditAllowance } from '@/lib/billing/resolveMonthlyCreditAllowance';
import { PLAN_CONTEXT_CREDITS } from '@/lib/billing/contextCredits';

describe('billing activation', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
  });

  it('uses subscribed tier for credit allowances independent of BILLING_ACTIVE in dev', () => {
    const proAllowance = resolveMonthlyCreditAllowance('pro', null);
    expect(proAllowance).toEqual({ ok: true, allowance: PLAN_CONTEXT_CREDITS.pro });
    const freeAllowance = resolveMonthlyCreditAllowance('free', null);
    expect(freeAllowance).toEqual({ ok: true, allowance: 50 });
  });

  it('does not grant unlimited credits to scale without explicit allowance', () => {
    const scale = resolveMonthlyCreditAllowance('scale', null);
    expect(scale.ok).toBe(false);
    if (!scale.ok) {
      expect(scale.error).toBe('scale_allowance_required');
    }
    const configured = resolveMonthlyCreditAllowance('scale', 25_000);
    expect(configured).toEqual({ ok: true, allowance: 25_000 });
  });

  it('gates feature flags to free in non-production when BILLING_ACTIVE is false', () => {
    process.env.VERCEL_ENV = 'development';
    delete process.env.BILLING_ACTIVE;
    jest.isolateModules(() => {
      const { effectiveTier: eff, isBillingActive: active } = require('@/lib/billing/tiers');
      expect(active()).toBe(false);
      expect(eff('growth')).toBe('free');
    });
  });

  it('enforces subscribed tiers for feature gates in production even if BILLING_ACTIVE is unset', () => {
    process.env.VERCEL_ENV = 'production';
    delete process.env.BILLING_ACTIVE;
    jest.isolateModules(() => {
      const { effectiveTier: eff, isBillingActive: active } = require('@/lib/billing/tiers');
      expect(active()).toBe(true);
      expect(eff('growth')).toBe('growth');
      expect(TIER_CONFIG.growth.features.advanced_reports).toBe(true);
    });
  });
});

describe('subscribed vs gated entitlements', () => {
  it('evidence export follows tier config on subscribed tier, not dev gate', () => {
    expect(TIER_CONFIG.pro.features.evidence_export_raw).toBe(true);
    expect(TIER_CONFIG.free.features.evidence_export_raw).toBeUndefined();
  });
});
