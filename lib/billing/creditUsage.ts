import type { ContextCreditSnapshot, ContextUnlockType } from '@/lib/billing/contextCredits';
import { canSelfServeTopUp, TOP_UP_CREDITS, TOP_UP_PRICE_GBP, type PlanId } from '@/lib/billing/plans';
import type { Tier } from '@/lib/billing/tiers';

/** Warn in widget / app when this share of the monthly allowance is consumed. */
export const CREDIT_USAGE_WARNING_RATIO = 0.8;

export type CreditUsageBand = 'normal' | 'warning' | 'exhausted';

export type ContextCreditTopUpOffer = {
  tier: Tier;
  priceGbp: number;
  credits: number;
  label: string;
  settingsPath: string;
};

export const PRO_CONTEXT_CREDIT_TOP_UP: ContextCreditTopUpOffer = {
  tier: 'pro',
  priceGbp: TOP_UP_PRICE_GBP,
  credits: TOP_UP_CREDITS,
  label: `£${TOP_UP_PRICE_GBP} for ${TOP_UP_CREDITS} credits`,
  settingsPath: '/settings/billing',
};

export function getCreditUsageBand(snapshot: ContextCreditSnapshot): CreditUsageBand {
  if (!snapshot.allowanceConfigured || snapshot.allowance == null) return 'normal';

  const totalPool = snapshot.allowance + snapshot.topupRemaining;
  if (totalPool <= 0) return snapshot.remaining === 0 ? 'exhausted' : 'normal';

  const consumed = snapshot.allowance - snapshot.monthlyRemaining;
  const totalRemaining = snapshot.monthlyRemaining + snapshot.topupRemaining;

  if (totalRemaining === 0) return 'exhausted';
  const usedRatio = consumed / totalPool;
  if (usedRatio >= CREDIT_USAGE_WARNING_RATIO) return 'warning';
  return 'normal';
}

export function getContextCreditTopUpOffer(tier: Tier): ContextCreditTopUpOffer | null {
  const planId = tier as PlanId;
  if (!canSelfServeTopUp(planId)) return null;
  return {
    ...PRO_CONTEXT_CREDIT_TOP_UP,
    tier,
  };
}

export type CreditUsageWidgetFields = {
  credit_usage_banner: string;
  credit_topup_label: string;
  credit_topup_url: string;
  credit_usage_dismissible: boolean;
};

export function buildCreditUsageWidgetFields(
  snapshot: ContextCreditSnapshot,
  appBaseUrl: string,
): CreditUsageWidgetFields | null {
  const band = getCreditUsageBand(snapshot);
  if (band === 'normal') return null;

  const base = appBaseUrl.replace(/\/$/, '');
  const topUp = getContextCreditTopUpOffer(snapshot.tier);
  const topUpUrl = topUp ? `${base}${topUp.settingsPath}?action=topup` : `${base}/#pricing`;
  const topUpLabel = topUp?.label ?? 'View upgrade options';

  if (band === 'warning') {
    const totalPool = (snapshot.allowance ?? 1) + snapshot.topupRemaining;
    const consumed = (snapshot.allowance ?? 0) - snapshot.monthlyRemaining;
    const pct = Math.round((consumed / Math.max(totalPool, 1)) * 100);
    return {
      credit_usage_banner: `You've used ${pct}% of your monthly checks. Top up or upgrade to avoid interruption.`,
      credit_topup_label: topUpLabel,
      credit_topup_url: topUpUrl,
      credit_usage_dismissible: true,
    };
  }

  return {
    credit_usage_banner:
      'Monthly network checks used up. Store Checks still available. Top up credits or upgrade plan to restore network context.',
    credit_topup_label: topUpLabel,
    credit_topup_url: topUpUrl,
    credit_usage_dismissible: false,
  };
}

export const NETWORK_PAUSED_AT_CAP_MESSAGE =
  'Network context is paused until you add a top-up or your monthly credits reset. Showing store context only.';

export type CreditPrecheckMode =
  | { kind: 'standard' }
  | { kind: 'soft_cap_basic' }
  | { kind: 'network_paused_fallback'; requested: ContextUnlockType };

export function resolveCreditPrecheckMode(
  snapshot: ContextCreditSnapshot,
  contextType: ContextUnlockType,
): CreditPrecheckMode {
  const band = getCreditUsageBand(snapshot);
  if (band !== 'exhausted') return { kind: 'standard' };

  if (contextType === 'full_context' || contextType === 'api_enrichment') {
    return { kind: 'network_paused_fallback', requested: contextType };
  }
  if (contextType === 'basic_context') {
    return { kind: 'soft_cap_basic' };
  }
  return { kind: 'standard' };
}
