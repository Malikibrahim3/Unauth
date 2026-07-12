import type { ContextUnlockType } from '@/lib/billing/contextCredits';
import type { MerchantSubscription } from '@/lib/billing/getMerchantTier';
import type { PlanId } from '@/lib/billing/plans';
import { can, type FeatureKey, type Tier } from '@/lib/billing/tiers';

export type AccessSuspensionReason = 'grace_period' | 'credit_exhausted' | 'plan_gated';

export type ContextAccessResult =
  | { allowed: true }
  | { allowed: false; reason: AccessSuspensionReason; message: string; upgradePlan?: PlanId };

const NETWORK_CONTEXT_TYPES: ContextUnlockType[] = ['full_context', 'api_enrichment'];
const CASE_REPORT_TYPES: ContextUnlockType[] = ['evidence_summary'];

/** Network + Case Report actions suspended during grace period regardless of plan. */
export function isContextTypeSuspended(
  subscription: MerchantSubscription,
  contextType: ContextUnlockType,
  creditsExhausted: boolean,
): ContextAccessResult {
  const isNetwork = NETWORK_CONTEXT_TYPES.includes(contextType);
  const isCaseReport = CASE_REPORT_TYPES.includes(contextType);

  if (subscription.status === 'grace_period' && (isNetwork || isCaseReport)) {
    return {
      allowed: false,
      reason: 'grace_period',
      message:
        'Your payment failed. Update billing to restore Network Checks and Case Reports. Store Checks are still available.',
    };
  }

  if (creditsExhausted && isNetwork) {
    return {
      allowed: false,
      reason: 'credit_exhausted',
      message:
        'Monthly network checks used up. Store Checks still available. Top up credits or upgrade to restore network context.',
    };
  }

  if (creditsExhausted && isCaseReport) {
    return {
      allowed: false,
      reason: 'credit_exhausted',
      message:
        'Monthly credits used up. Case Reports are paused until you top up or your allowance resets.',
    };
  }

  return { allowed: true };
}

/** Feature gating by plan — show upgrade prompt, never hard error for Free. */
export function checkPlanFeatureAccess(
  tier: Tier,
  feature: FeatureKey,
): ContextAccessResult {
  if (can(tier, feature)) return { allowed: true };

  const upgradePlan: PlanId =
    feature === 'lookup_api' || feature === 'quick_score_api' ? 'scale' : 'pro';

  return {
    allowed: false,
    reason: 'plan_gated',
    message: `This feature is available on ${upgradePlan === 'scale' ? 'Enterprise' : 'paid'} plans. Upgrade to unlock.`,
    upgradePlan,
  };
}

export function isPastDueOrLapsed(subscription: MerchantSubscription): boolean {
  return subscription.status === 'past_due';
}

export function gracePeriodDaysRemaining(gracePeriodEndsAt: string | null): number | null {
  if (!gracePeriodEndsAt) return null;
  const ms = new Date(gracePeriodEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}
