import { getMerchantSubscription } from '@/lib/billing/getMerchantTier';
import { resolveMonthlyCreditAllowance } from '@/lib/billing/resolveMonthlyCreditAllowance';
import type { Tier } from '@/lib/billing/tiers';
import { TABLES } from '@/lib/supabase/tables';
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
  /** False when scale/enterprise has no explicit monthly allowance configured. */
  allowanceConfigured: boolean;
  used: number;
  remaining: number | null;
  periodStart: string;
  periodEnd: string;
  overageAllowed: boolean;
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
};

export const PLAN_CONTEXT_CREDITS: Record<Tier, number | null> = {
  free: 50,
  pro: 1_000,
  growth: 5_000,
  scale: null,
  enterprise: null,
};

export const CONTEXT_CREDIT_COSTS: Record<ContextUnlockType, number> = {
  basic_context: 1,
  full_context: 2,
  evidence_summary: 3,
  /** Case-scoped API enrichment — Scale/custom workflows only. */
  api_enrichment: 2,
};

export const CONTEXT_UNLOCK_LABELS: Record<ContextUnlockType, string> = {
  basic_context: 'Basic context check',
  full_context: 'Full context check',
  evidence_summary: 'Evidence summary',
  api_enrichment: 'API enrichment',
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

  const { data, error } = await supabase
    .from(TABLES.CONTEXT_CREDIT_EVENTS as any)
    .select('credits_spent')
    .eq('merchant_id', merchantId)
    .gte('occurred_at', periodStart)
    .lt('occurred_at', periodEnd);

  if (error) {
    throw new Error(`context credit usage query failed: ${error.message}`);
  }

  const used = (data ?? []).reduce((sum, row) => sum + Number(row.credits_spent ?? 0), 0);

  return {
    tier,
    allowance,
    allowanceConfigured,
    used,
    remaining:
      allowanceConfigured && allowance != null ? Math.max(allowance - used, 0) : null,
    periodStart,
    periodEnd,
    overageAllowed: false,
  };
}

type ConsumeRpcRow = {
  ok: boolean;
  used: number;
  remaining: number | null;
  credits_required?: number;
  credits_spent?: number;
  error_code?: string;
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
      },
      creditsRequired: row.credits_required ?? creditsSpent,
    };
  }

  return {
    ok: true,
    snapshot: {
      ...snapshot,
      used: row.used,
      remaining: row.remaining,
    },
    creditsSpent: row.credits_spent ?? creditsSpent,
  };
}
