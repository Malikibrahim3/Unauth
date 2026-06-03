import {
  consumeContextCredits,
  getContextCreditCost,
  getContextCreditSnapshot,
  type ConsumeContextCreditsParams,
  type ContextCreditSnapshot,
  type ContextUnlockType,
} from '@/lib/billing/contextCredits';
import type { SupabaseClient } from '@supabase/supabase-js';

export type CreditPrecheckResult =
  | { ok: true; snapshot: ContextCreditSnapshot }
  | {
      ok: false;
      status: 402 | 403;
      snapshot: ContextCreditSnapshot;
      creditsRequired: number;
      error: string;
    };

export async function precheckContextCredits(
  supabase: SupabaseClient,
  merchantId: string,
  contextType: ContextUnlockType,
): Promise<CreditPrecheckResult> {
  const snapshot = await getContextCreditSnapshot(supabase, merchantId);
  const creditsRequired = getContextCreditCost(contextType);

  if (!snapshot.allowanceConfigured) {
    return {
      ok: false,
      status: 403,
      snapshot,
      creditsRequired,
      error:
        snapshot.tier === 'scale' || snapshot.tier === 'enterprise'
          ? 'Custom credit allowance required for this account. Contact support to configure monthly context credits.'
          : 'Context credit allowance is not configured for this account.',
    };
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

  return { ok: true, snapshot };
}

export async function spendContextCreditsAfterSuccess(
  supabase: SupabaseClient,
  params: ConsumeContextCreditsParams,
): Promise<
  | { ok: true; snapshot: ContextCreditSnapshot; creditsSpent: number }
  | { ok: false; snapshot: ContextCreditSnapshot; creditsRequired: number }
> {
  return consumeContextCredits(supabase, params);
}

export function creditFailureResponse(input: {
  contextType: ContextUnlockType;
  creditsRequired: number;
  remaining: number | null;
  error: string;
}): Record<string, unknown> {
  return {
    error: input.error,
    requiredCredits: input.creditsRequired,
    remainingCredits: input.remaining,
    contextType: input.contextType,
    disclaimer:
      'Unauth provides contextual information for merchant review. Unauth does not make refund, fulfilment, account, or customer eligibility decisions.',
  };
}
