import type { Tier } from '@/lib/billing/tiers';
import { PLAN_CONTEXT_CREDITS } from '@/lib/billing/contextCredits';

export type MonthlyAllowanceError = 'scale_allowance_required' | 'enterprise_allowance_required';

export type ResolvedMonthlyAllowance =
  | { ok: true; allowance: number }
  | { ok: false; error: MonthlyAllowanceError };

/**
 * Resolves monthly context credit allowance for a merchant.
 * Scale/enterprise require an explicit `contextCreditsMonthly` override — never unlimited.
 */
export function resolveMonthlyCreditAllowance(
  tier: Tier,
  contextCreditsMonthly: number | null | undefined,
): ResolvedMonthlyAllowance {
  if (tier === 'scale') {
    if (contextCreditsMonthly == null || contextCreditsMonthly < 1) {
      return { ok: false, error: 'scale_allowance_required' };
    }
    return { ok: true, allowance: contextCreditsMonthly };
  }

  if (tier === 'enterprise') {
    if (contextCreditsMonthly == null || contextCreditsMonthly < 1) {
      return { ok: false, error: 'enterprise_allowance_required' };
    }
    return { ok: true, allowance: contextCreditsMonthly };
  }

  const allowance = PLAN_CONTEXT_CREDITS[tier];
  if (allowance == null) {
    return { ok: false, error: 'scale_allowance_required' };
  }

  return { ok: true, allowance };
}
