import {
  consumeContextCredits,
  getContextCreditCost,
  getContextCreditSnapshot,
  type ConsumeContextCreditsParams,
  type ContextCreditSnapshot,
  type ContextUnlockType,
} from '@/lib/billing/contextCredits';
import { getMerchantSubscription } from '@/lib/billing/getMerchantTier';
import {
  NETWORK_PAUSED_AT_CAP_MESSAGE,
  resolveCreditPrecheckMode,
  type CreditPrecheckMode,
} from '@/lib/billing/creditUsage';
import {
  checkPlanFeatureAccess,
  isContextTypeSuspended,
} from '@/lib/billing/subscriptionAccess';
import type { SupabaseClient } from '@supabase/supabase-js';

export type CreditPrecheckResult =
  | { ok: true; snapshot: ContextCreditSnapshot; mode: CreditPrecheckMode }
  | {
      ok: false;
      status: 402 | 403;
      snapshot: ContextCreditSnapshot;
      creditsRequired: number;
      error: string;
      upgradePrompt?: boolean;
    };

const SCALE_ALLOWANCE_MESSAGE =
  'Dedicated monthly volume is agreed at onboarding for this account. Contact support to configure your context credit allowance.';

export async function precheckContextCredits(
  supabase: SupabaseClient,
  merchantId: string,
  contextType: ContextUnlockType,
): Promise<CreditPrecheckResult> {
  const snapshot = await getContextCreditSnapshot(supabase, merchantId);
  const creditsRequired = getContextCreditCost(contextType);
  const creditsExhausted = snapshot.usageBand === 'exhausted';

  if (!snapshot.allowanceConfigured) {
    return {
      ok: false,
      status: 403,
      snapshot,
      creditsRequired,
      error:
        snapshot.tier === 'enterprise'
          ? SCALE_ALLOWANCE_MESSAGE
          : 'Context credit allowance is not configured for this account.',
    };
  }

  if (contextType === 'evidence_summary') {
    const featureCheck = checkPlanFeatureAccess(snapshot.tier, 'evidence_export_raw');
    if (!featureCheck.allowed) {
      return {
        ok: false,
        status: 403,
        snapshot,
        creditsRequired,
        error: featureCheck.message,
        upgradePrompt: true,
      };
    }
  }

  const mode = resolveCreditPrecheckMode(snapshot, contextType);

  if (mode.kind === 'network_paused_fallback' || mode.kind === 'soft_cap_basic') {
    return { ok: true, snapshot, mode };
  }

  if (snapshot.remaining != null && creditsRequired > snapshot.remaining) {
    return {
      ok: false,
      status: 402,
      snapshot,
      creditsRequired,
      error: 'Not enough context credits remaining for this review.',
    };
  }

  const subscription = await getMerchantSubscription(supabase, merchantId);
  if (subscription) {
    const suspension = isContextTypeSuspended(subscription, contextType, creditsExhausted);
    if (!suspension.allowed) {
      return {
        ok: false,
        status: 402,
        snapshot,
        creditsRequired,
        error: suspension.message,
        upgradePrompt: suspension.reason === 'plan_gated',
      };
    }
  }

  return { ok: true, snapshot, mode: { kind: 'standard' } };
}

export async function spendContextCreditsAfterSuccess(
  supabase: SupabaseClient,
  params: ConsumeContextCreditsParams,
): Promise<
  | { ok: true; snapshot: ContextCreditSnapshot; creditsSpent: number; duplicate: boolean; receiptId: string }
  | { ok: false; snapshot: ContextCreditSnapshot; creditsRequired: number }
> {
  return consumeContextCredits(supabase, params);
}

export function creditFailureResponse(input: {
  contextType: ContextUnlockType;
  creditsRequired: number;
  remaining: number | null;
  error: string;
  upgradePrompt?: boolean;
}): Record<string, unknown> {
  return {
    error: input.error,
    requiredCredits: input.creditsRequired,
    remainingCredits: input.remaining,
    contextType: input.contextType,
    upgradePrompt: input.upgradePrompt === true,
    disclaimer:
      'Unauth provides contextual information for merchant review. Unauth does not make refund, fulfilment, account, or customer eligibility decisions.',
  };
}

export { NETWORK_PAUSED_AT_CAP_MESSAGE };
