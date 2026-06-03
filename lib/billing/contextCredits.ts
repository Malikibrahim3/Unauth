import { getCreditUsageBand, type CreditUsageBand } from '@/lib/billing/creditUsage';
import { getMerchantBillingState } from '@/lib/billing/merchantBilling';
import { getMerchantSubscription } from '@/lib/billing/getMerchantTier';
import { resolveMonthlyCreditAllowance } from '@/lib/billing/resolveMonthlyCreditAllowance';
import { maybeSendUsageWarningEmail } from '@/lib/billing/lifecycle';
import type { Tier } from '@/lib/billing/tiers';
import { TIER_CONFIG } from '@/lib/billing/tiers';
import type { SupabaseClient } from '@supabase/supabase-js';

export type ContextUnlockType =
  | 'basic_context'
  | 'full_context'
  | 'evidence_summary'
  | 'api_enrichment';

export type ContextUnlockReason =
  | 'item_not_received'
  | 'damaged_item'
  | 'chargeback_dispute'
  | 'return_abuse_review'
  | 'delivery_dispute'
  | 'other';

export type ContextCreditSnapshot = {
  tier: Tier;
  allowance: number | null;
  allowanceConfigured: boolean;
  used: number;
  remaining: number | null;
  monthlyRemaining: number;
  topupRemaining: number;
  periodStart: string;
  periodEnd: string;
  overageAllowed: boolean;
  usageBand: CreditUsageBand;
  usageRatio: number | null;
  subscriptionStatus: string;
};

export type ConsumeContextCreditsParams = {
  merchantId: string;
  userId?: string | null;
  contextType: ContextUnlockType;
  claimId?: string | null;
  ticketRef?: string | null;
  orderRef?: string | null;
  customerRef?: string | null;
  reason?: ContextUnlockReason | null;
  metadata?: Record<string, unknown>;
  allowSoftCap?: boolean;
};

function planCreditsFromTierConfig(tier: Tier): number | null {
  const value = TIER_CONFIG[tier].limits.contextCreditsPerMonth;
  return typeof value === 'number' ? value : null;
}

export const PLAN_CONTEXT_CREDITS: Record<Tier, number | null> = {
  free: planCreditsFromTierConfig('free'),
  pro: planCreditsFromTierConfig('pro'),
  growth: planCreditsFromTierConfig('growth'),
  scale: planCreditsFromTierConfig('scale'),
  enterprise: planCreditsFromTierConfig('enterprise'),
};

export const CONTEXT_CREDIT_COSTS: Record<ContextUnlockType, number> = {
  basic_context: 1,
  full_context: 2,
  evidence_summary: 3,
  api_enrichment: 2,
};

export const CONTEXT_UNLOCK_LABELS: Record<ContextUnlockType, string> = {
  basic_context: 'Store Check',
  full_context: 'Network Check',
  evidence_summary: 'Case Report',
  api_enrichment: 'API enrichment',
};

export const CONTEXT_UNLOCK_CTA_LABELS: Record<ContextUnlockType, string> = {
  basic_context: 'View Store Check — 1 credit',
  full_context: 'View Network Check — 2 credits',
  evidence_summary: 'Generate Case Report — 3 credits',
  api_enrichment: 'View API enrichment — 2 credits',
};

export const CONTEXT_REASON_LABELS: Record<ContextUnlockReason, string> = {
  item_not_received: 'Item not received claim',
  damaged_item: 'Damaged item claim',
  chargeback_dispute: 'Chargeback dispute',
  return_abuse_review: 'Return abuse review',
  delivery_dispute: 'Delivery dispute',
  other: 'Other',
};

function startOfCurrentMonthUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
}

function endOfCurrentMonthUtc(start: Date): Date {
  return new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1, 0, 0, 0, 0));
}

export function getContextCreditCost(contextType: ContextUnlockType): number {
  return CONTEXT_CREDIT_COSTS[contextType];
}

export async function getContextCreditSnapshot(
  supabase: SupabaseClient,
  merchantId: string,
): Promise<ContextCreditSnapshot> {
  const subscription = await getMerchantSubscription(supabase, merchantId);
  const billing = await getMerchantBillingState(supabase, merchantId);
  const tier = subscription?.tier ?? 'free';
  const resolved = resolveMonthlyCreditAllowance(
    tier,
    subscription?.contextCreditsMonthly ?? null,
  );
  const allowanceConfigured = resolved.ok;
  const allowance = resolved.ok ? resolved.allowance : null;
  const periodStart = subscription?.currentPeriodStart ?? startOfCurrentMonthUtc().toISOString();
  const periodEnd =
    subscription?.currentPeriodEnd ??
    endOfCurrentMonthUtc(new Date(periodStart)).toISOString();

  const monthlyRemaining = billing?.credits.monthlyCreditsRemaining ?? allowance ?? 0;
  const topupRemaining = billing?.credits.topupCreditsRemaining ?? 0;
  const totalRemaining = monthlyRemaining + topupRemaining;
  const used =
    allowanceConfigured && allowance != null
      ? Math.max(allowance - monthlyRemaining, 0)
      : billing?.usedThisCycle ?? 0;
  const remaining = allowanceConfigured ? totalRemaining : null;
  const usageRatio =
    allowanceConfigured && allowance != null && allowance > 0
      ? (used + topupRemaining > 0 ? used / (allowance + topupRemaining) : used / allowance)
      : null;

  const snapshot: ContextCreditSnapshot = {
    tier,
    allowance,
    allowanceConfigured,
    used,
    remaining,
    monthlyRemaining,
    topupRemaining,
    periodStart,
    periodEnd,
    overageAllowed: true,
    usageRatio,
    usageBand: 'normal',
    subscriptionStatus: subscription?.status ?? 'free',
  };
  snapshot.usageBand = getCreditUsageBand(snapshot);

  return snapshot;
}

type ConsumeRpcRow = {
  ok: boolean;
  used: number;
  remaining: number | null;
  monthly_remaining?: number;
  topup_remaining?: number;
  credits_required?: number;
  credits_spent?: number;
  error_code?: string;
  soft_cap?: boolean;
};

export async function consumeContextCredits(
  supabase: SupabaseClient,
  params: ConsumeContextCreditsParams,
): Promise<
  | { ok: true; snapshot: ContextCreditSnapshot; creditsSpent: number }
  | { ok: false; snapshot: ContextCreditSnapshot; creditsRequired: number }
> {
  const snapshot = await getContextCreditSnapshot(supabase, params.merchantId);
  const creditsSpent = getContextCreditCost(params.contextType);

  if (!snapshot.allowanceConfigured || snapshot.allowance == null) {
    return {
      ok: false,
      snapshot,
      creditsRequired: creditsSpent,
    };
  }

  const { data: rpcData, error: rpcError } = await supabase.rpc(
    'consume_context_credits_if_available' as never,
    {
      p_merchant_id: params.merchantId,
      p_user_id: params.userId ?? null,
      p_plan_tier: snapshot.tier,
      p_context_type: params.contextType,
      p_credits_to_spend: creditsSpent,
      p_period_start: snapshot.periodStart,
      p_period_end: snapshot.periodEnd,
      p_monthly_allowance: snapshot.allowance as number,
      p_claim_id: params.claimId ?? null,
      p_ticket_ref: params.ticketRef ?? null,
      p_order_ref: params.orderRef ?? null,
      p_customer_ref: params.customerRef ?? null,
      p_reason: params.reason ?? null,
      p_metadata: {
        ...(params.metadata ?? {}),
        request_source:
          typeof params.metadata?.request_source === 'string'
            ? params.metadata.request_source
            : 'app',
      },
      p_allow_soft_cap: params.allowSoftCap === true,
    },
  );

  if (rpcError) {
    throw new Error(`context credit consume RPC failed: ${rpcError.message}`);
  }

  const row = rpcData as ConsumeRpcRow;

  if (!row.ok) {
    return {
      ok: false,
      snapshot: {
        ...snapshot,
        used: row.used,
        remaining: row.remaining,
        monthlyRemaining: row.monthly_remaining ?? snapshot.monthlyRemaining,
        topupRemaining: row.topup_remaining ?? snapshot.topupRemaining,
      },
      creditsRequired: row.credits_required ?? creditsSpent,
    };
  }

  const updatedSnapshot = {
    ...snapshot,
    used: row.used,
    remaining: row.remaining,
    monthlyRemaining: row.monthly_remaining ?? snapshot.monthlyRemaining,
    topupRemaining: row.topup_remaining ?? snapshot.topupRemaining,
  };
  updatedSnapshot.usageBand = getCreditUsageBand(updatedSnapshot);

  if (updatedSnapshot.usageBand === 'warning') {
    void maybeSendUsageWarningEmail(supabase, params.merchantId).catch(() => {});
  }

  return {
    ok: true,
    snapshot: updatedSnapshot,
    creditsSpent: row.credits_spent ?? creditsSpent,
  };
}
