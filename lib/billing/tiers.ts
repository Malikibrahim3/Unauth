// ============================================================
// CANONICAL TIER MODEL — single source of truth.
// All access control in the app MUST derive from this file.
// Do NOT hardcode tier strings or feature checks elsewhere.
// ============================================================

let productionBillingConfigWarned = false;

/**
 * Whether paid tier feature gates apply (dev preview only when `BILLING_ACTIVE` is not true).
 * Production always enforces subscribed tiers from `subscriptions` regardless of this flag.
 */
export function isBillingActive(): boolean {
  if (process.env.VERCEL_ENV === 'production') {
    if (process.env.BILLING_ACTIVE !== 'true' && !productionBillingConfigWarned) {
      productionBillingConfigWarned = true;
      console.warn(
        '[billing] BILLING_ACTIVE is not set to true in production. Tier gates still use subscription rows; set BILLING_ACTIVE=true for explicit billing mode.',
      );
    }
    return true;
  }
  return process.env.BILLING_ACTIVE === 'true';
}

export type Tier = 'free' | 'pro' | 'growth' | 'scale' | 'enterprise';

export type FeatureKey =
  // --- Core product surface (available across plans) ---
  | 'own_store_analytics'
  | 'chargeback_analytics'
  | 'evidence_export_raw'
  | 'repeat_claimer_own_store'
  | 'store_reports'
  | 'context_checks'
  | 'evidence_pack_workflow'
  | 'helpdesk_widget'
  | 'claims_queue'
  | 'customer_dossier'
  | 'customer_search'
  | 'watchlist'
  | 'internal_notes'
  | 'network_signal_enrichment'
  | 'identity_graph'
  | 'lookup_api'
  | 'quick_score_api'
  | 'multi_store'
  | 'csv_backfill_full'
  | 'advanced_reports'
  // --- Scale / Enterprise ---
  | 'custom_limits'
  | 'sla'
  | 'security_review'
  | 'signal_licensing_api';

export interface TierLimits {
  contextCreditsPerMonth: number | 'custom';
  connectedStores: number | 'unlimited';
  seats: number | 'unlimited';
  historyDays: number | 'unlimited';
  apiCallsPerMonth: number | 'unlimited';
}

export interface TierEntitlements {
  tier: Tier;
  label: string;
  tagline: string;
  priceMonthlyUsd: number | 'custom';
  features: Partial<Record<FeatureKey, true>>;
  limits: TierLimits;
}

export const TIER_ORDER: Record<Tier, number> = {
  free: 0,
  pro: 1,
  growth: 2,
  scale: 3,
  enterprise: 4,
};

export const TIER_CONFIG: Record<Tier, TierEntitlements> = {
  free: {
    tier: 'free',
    label: 'Free',
    tagline: 'Network participation with baseline access scaled to what you contribute',
    priceMonthlyUsd: 0,
    features: {
      own_store_analytics: true,
      chargeback_analytics: true,
      repeat_claimer_own_store: true,
      store_reports: true,
      context_checks: true,
      evidence_pack_workflow: true,
      helpdesk_widget: true,
      claims_queue: true,
      customer_dossier: true,
      customer_search: true,
      internal_notes: true,
      network_signal_enrichment: true,
    },
    limits: {
      contextCreditsPerMonth: 100,
      connectedStores: 1,
      seats: 1,
      historyDays: 30,
      apiCallsPerMonth: 0,
    },
  },
  pro: {
    tier: 'pro',
    label: 'Pro',
    tagline: 'Single-store claim review with six months of network history',
    priceMonthlyUsd: 99,
    features: {
      own_store_analytics: true,
      chargeback_analytics: true,
      evidence_export_raw: true,
      repeat_claimer_own_store: true,
      store_reports: true,
      context_checks: true,
      evidence_pack_workflow: true,
      helpdesk_widget: true,
      claims_queue: true,
      customer_dossier: true,
      customer_search: true,
      internal_notes: true,
      network_signal_enrichment: true,
    },
    limits: {
      contextCreditsPerMonth: 1_000,
      connectedStores: 1,
      seats: 5,
      historyDays: 180,
      apiCallsPerMonth: 0,
    },
  },
  growth: {
    tier: 'growth',
    label: 'Growth',
    tagline: 'Multi-store operations with two years of network history and aggregate reporting',
    priceMonthlyUsd: 399,
    features: {
      own_store_analytics: true,
      chargeback_analytics: true,
      evidence_export_raw: true,
      repeat_claimer_own_store: true,
      store_reports: true,
      context_checks: true,
      evidence_pack_workflow: true,
      helpdesk_widget: true,
      claims_queue: true,
      customer_dossier: true,
      customer_search: true,
      internal_notes: true,
      network_signal_enrichment: true,
      identity_graph: true,
      multi_store: true,
      csv_backfill_full: true,
      advanced_reports: true,
    },
    limits: {
      contextCreditsPerMonth: 5_000,
      connectedStores: 5,
      seats: 15,
      historyDays: 730,
      apiCallsPerMonth: 0,
    },
  },
  scale: {
    tier: 'scale',
    label: 'Scale',
    tagline: 'Embedded context infrastructure for high-volume teams',
    priceMonthlyUsd: 'custom',
    features: {
      own_store_analytics: true,
      chargeback_analytics: true,
      evidence_export_raw: true,
      repeat_claimer_own_store: true,
      store_reports: true,
      context_checks: true,
      evidence_pack_workflow: true,
      helpdesk_widget: true,
      claims_queue: true,
      customer_dossier: true,
      customer_search: true,
      internal_notes: true,
      network_signal_enrichment: true,
      identity_graph: true,
      lookup_api: true,
      quick_score_api: true,
      multi_store: true,
      csv_backfill_full: true,
      advanced_reports: true,
      custom_limits: true,
      sla: true,
      security_review: true,
    },
    limits: {
      contextCreditsPerMonth: 'custom',
      connectedStores: 'unlimited',
      seats: 'unlimited',
      historyDays: 'unlimited',
      apiCallsPerMonth: 'unlimited',
    },
  },
  enterprise: {
    tier: 'enterprise',
    label: 'Enterprise / API',
    tagline: 'License the cross-rail signal',
    priceMonthlyUsd: 'custom',
    features: {
      signal_licensing_api: true,
      lookup_api: true,
      quick_score_api: true,
      custom_limits: true,
      sla: true,
      security_review: true,
    },
    limits: {
      contextCreditsPerMonth: 'custom',
      connectedStores: 'unlimited',
      seats: 'unlimited',
      historyDays: 'unlimited',
      apiCallsPerMonth: 'unlimited',
    },
  },
};

/**
 * Subscription / preview tier → tier used for gating and display.
 * When billing is inactive, every merchant resolves as `free`.
 */
export function effectiveTier(tier: Tier): Tier {
  return isBillingActive() ? tier : 'free';
}

/** Single entitlement check. Use everywhere. */
export function can(tier: Tier, feature: FeatureKey): boolean {
  return TIER_CONFIG[effectiveTier(tier)].features[feature] === true;
}

export function limit<K extends keyof TierLimits>(tier: Tier, key: K): TierLimits[K] {
  return TIER_CONFIG[effectiveTier(tier)].limits[key];
}

export function tierLabel(tier: Tier): string {
  return TIER_CONFIG[tier].label;
}

/** Lowest tier that includes `feature`, for upgrade messaging. */
export function minimumTierForFeature(feature: FeatureKey): Tier {
  const ordered: Tier[] = ['free', 'pro', 'growth', 'scale', 'enterprise'];
  for (const tier of ordered) {
    if (can(tier, feature)) return tier;
  }
  return 'enterprise';
}
