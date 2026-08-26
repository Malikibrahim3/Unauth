/**
 * Canonical commercial catalogue.
 *
 * Pricing, Signup, Onboarding, Billing, entitlements, credit allowances, and
 * checkout all consume this file. Stripe price identifiers stay server-only
 * in `planStripeIds.ts`; a URL parameter never changes a subscription.
 */

export type PlanId = 'free' | 'pro' | 'growth' | 'scale';
export type Tier = 'free' | 'pro' | 'growth' | 'enterprise';

export type SubscriptionStatus =
  | 'active'
  | 'past_due'
  | 'grace_period'
  | 'cancelled'
  | 'free';

export type FeatureKey =
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
  | 'internal_notes'
  | 'lookup_api'
  | 'quick_score_api'
  | 'multi_store'
  | 'advanced_reports'
  | 'custom_limits'
  | 'sla'
  | 'security_review';

export interface TierLimits {
  contextCreditsPerMonth: number | 'custom';
  connectedStores: number | 'unlimited';
  seats: number | 'unlimited';
  historyDays: number | 'unlimited';
  apiCallsPerMonth: number | 'unlimited';
}

export interface PlanDefinition {
  planId: PlanId;
  tier: Tier;
  name: string;
  description: string;
  priceGbp: number | 'custom';
  creditsMonthly: number | 'custom';
  currency: 'GBP';
  stripePriceId: null;
  featured: boolean;
  ctaLabel: string;
  entitlements: Partial<Record<FeatureKey, true>>;
  limits: TierLimits;
  publicFeatures: readonly string[];
  publicExclusions: readonly string[];
}

const CORE_FEATURES = {
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
} as const satisfies Partial<Record<FeatureKey, true>>;

/** Canonical plan catalogue. Prices are monthly GBP amounts excluding VAT. */
export const PLANS: Record<PlanId, PlanDefinition> = {
  free: {
    planId: 'free',
    tier: 'free',
    name: 'Free',
    description: 'A supervised workspace for evaluating the product with one small team.',
    priceGbp: 0,
    creditsMonthly: 100,
    currency: 'GBP',
    stripePriceId: null,
    featured: false,
    ctaLabel: 'Start on Free',
    entitlements: { ...CORE_FEATURES },
    limits: {
      contextCreditsPerMonth: 100,
      connectedStores: 1,
      seats: 1,
      historyDays: 30,
      apiCallsPerMonth: 0,
    },
    publicFeatures: [
      '1 user and 1 connected commerce store',
      'Cases, evidence, recommendations, and merchant decisions',
      '100 context credits each month',
    ],
    publicExclusions: [
      'Retention terms require pilot approval',
      'Evidence export beyond an enabled case pack',
      'Multi-store reporting',
      'API access',
    ],
  },
  pro: {
    planId: 'pro',
    tier: 'pro',
    name: 'Pro',
    description: 'For one operating team reviewing cases with a larger monthly context allowance.',
    priceGbp: 249,
    creditsMonthly: 1_000,
    currency: 'GBP',
    stripePriceId: null,
    featured: true,
    ctaLabel: 'Choose Pro',
    entitlements: { ...CORE_FEATURES, evidence_export_raw: true },
    limits: {
      contextCreditsPerMonth: 1_000,
      connectedStores: 1,
      seats: 5,
      historyDays: 180,
      apiCallsPerMonth: 0,
    },
    publicFeatures: [
      '5 users and 1 connected commerce store',
      'Everything in Free',
      'Case evidence-package export where the control is enabled',
      '1,000 context credits each month',
    ],
    publicExclusions: ['Retention terms require pilot approval', 'Multi-store reporting', 'API access'],
  },
  growth: {
    planId: 'growth',
    tier: 'growth',
    name: 'Growth',
    description: 'For multi-store teams operating recovery, reconciliation, and advanced reporting.',
    priceGbp: 599,
    creditsMonthly: 5_000,
    currency: 'GBP',
    stripePriceId: null,
    featured: false,
    ctaLabel: 'Choose Growth',
    entitlements: {
      ...CORE_FEATURES,
      evidence_export_raw: true,
      multi_store: true,
      advanced_reports: true,
    },
    limits: {
      contextCreditsPerMonth: 5_000,
      connectedStores: 5,
      seats: 15,
      historyDays: 730,
      apiCallsPerMonth: 0,
    },
    publicFeatures: [
      '15 users and up to 5 connected commerce stores',
      'Everything in Pro',
      'Recovery and reconciliation workspaces',
      'Advanced on-demand reports',
      '5,000 context credits each month',
    ],
    publicExclusions: [
      'Retention terms require pilot approval',
      'Machine API access',
      'Scheduled report delivery',
    ],
  },
  scale: {
    planId: 'scale',
    tier: 'enterprise',
    name: 'Enterprise',
    description: 'For merchants that need a reviewed commercial proposal and agreed operating limits.',
    priceGbp: 'custom',
    creditsMonthly: 'custom',
    currency: 'GBP',
    stripePriceId: null,
    featured: false,
    ctaLabel: 'Contact the account team',
    entitlements: {
      ...CORE_FEATURES,
      evidence_export_raw: true,
      lookup_api: true,
      quick_score_api: true,
      multi_store: true,
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
    publicFeatures: [
      'Agreed users, stores, and credit allowance',
      'Everything in Growth',
      'Security and service-level terms agreed before activation',
      'Scoped machine API with a per-key request limit',
    ],
    publicExclusions: [
      'Retention is unavailable until a pilot schedule is approved',
    ],
  },
};

export const PUBLIC_PLAN_IDS: readonly PlanId[] = ['free', 'pro', 'growth', 'scale'];

/** Temporary inbound-link aliases only. New UI must emit canonical PlanIds. */
export const PLAN_COMPATIBILITY_ALIASES: Readonly<Record<string, PlanId>> = {
  unauth: 'free',
  starter: 'pro',
  operating: 'growth',
  ledger: 'scale',
  enterprise: 'scale',
};

export type BillableEventId =
  | 'context.basic'
  | 'context.full'
  | 'evidence.summary'
  | 'api.enrichment';

export type BillableEventDefinition = {
  id: BillableEventId;
  label: string;
  credits: number;
  performedByRuntime: true;
  chargingRule: string;
};

/** Only successful runtime work in this catalogue may consume usage credits. */
export const BILLABLE_EVENTS: Record<BillableEventId, BillableEventDefinition> = {
  'context.basic': {
    id: 'context.basic',
    label: 'Store context check',
    credits: 1,
    performedByRuntime: true,
    chargingRule: 'After one successful merchant-scoped store context result.',
  },
  'context.full': {
    id: 'context.full',
    label: 'Network context check',
    credits: 2,
    performedByRuntime: true,
    chargingRule: 'After one successful entitled network context result; currently gated off.',
  },
  'evidence.summary': {
    id: 'evidence.summary',
    label: 'Generate a case evidence report',
    credits: 3,
    performedByRuntime: true,
    chargingRule: 'After the report record and its available artifact have been created.',
  },
  'api.enrichment': {
    id: 'api.enrichment',
    label: 'API context enrichment',
    credits: 2,
    performedByRuntime: true,
    chargingRule: 'After one successful entitled API context response.',
  },
};

export const TOP_UP_CREDITS = 200;
export const TOP_UP_PRICE_GBP = 15;
export const GRACE_PERIOD_DAYS = 7;
export const CREDIT_USAGE_WARNING_RATIO = 0.8;

export function parseRequestedPlanId(raw: string | null | undefined): PlanId | null {
  if (!raw) return null;
  const normalized = raw.trim().toLowerCase();
  if (PUBLIC_PLAN_IDS.includes(normalized as PlanId)) return normalized as PlanId;
  return PLAN_COMPATIBILITY_ALIASES[normalized] ?? null;
}

/** Stored legacy values ratchet safely to Free when unknown. */
export function normalizePlanId(raw: string): PlanId {
  return parseRequestedPlanId(raw) ?? 'free';
}

export function getPlanCreditsMonthly(planId: PlanId, customAllowance?: number | null): number | null {
  const plan = PLANS[planId];
  if (plan.creditsMonthly === 'custom') return customAllowance ?? null;
  return plan.creditsMonthly;
}

export function planSelectionCredits(planId: PlanId): string {
  const credits = PLANS[planId].creditsMonthly;
  return credits === 'custom' ? 'custom' : String(credits);
}

export function isPaidPlan(planId: PlanId): boolean {
  return planId !== 'free';
}

export function canSelfServeTopUp(planId: PlanId): boolean {
  return planId === 'pro' || planId === 'growth' || planId === 'scale';
}

export function planTierOrder(planId: PlanId): number {
  const order: Record<PlanId, number> = { free: 0, pro: 1, growth: 2, scale: 3 };
  return order[planId];
}

export function isUpgrade(from: PlanId, to: PlanId): boolean {
  return planTierOrder(to) > planTierOrder(from);
}

export function isDowngrade(from: PlanId, to: PlanId): boolean {
  return planTierOrder(to) < planTierOrder(from);
}
