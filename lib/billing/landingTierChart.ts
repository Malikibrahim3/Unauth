/**
 * Definitive public tier chart — marketing copy and feature lists for the landing page.
 * Entitlements in {@link ./tiers} must stay aligned; feature bullets here are the merchant-facing source of truth.
 */

export const LANDING_BILLING_TRANSPARENCY =
  'Every plan includes the Unauth widget, store context, evidence checklists, merchant rules, and recovery workflow. Usage is controlled by monthly context credits, and raw customer data stays merchant-scoped.';

export type LandingTierKey = 'unauth' | 'pro' | 'growth' | 'scale' | 'enterprise';

export interface LandingTierChartEntry {
  key: LandingTierKey;
  /** Public name — reflects the live plan structure. */
  name: string;
  tagline: string;
  price: string;
  priceNote?: string;
  foundingNote?: string;
  features: readonly string[];
  /** Shown on the public pricing grid (Enterprise withheld until design partners). */
  showOnPublicPricing: boolean;
}

export const LANDING_TIER_CHART: readonly LandingTierChartEntry[] = [
  {
    key: 'unauth',
    name: 'Free',
    tagline: 'Baseline payout-control access for occasional case review',
    price: '£0/month',
    priceNote: '100 context credits / month',
    features: [
      '100 context credits / month',
      'Widget and helpdesk presence',
      'Store context, evidence checklist, and payout case history via credits',
      'Limited history depth',
      'Limited evidence exports',
      'No API / bulk workflows',
    ],
    showOnPublicPricing: true,
  },
  {
    key: 'pro',
    name: 'Pro',
    tagline: 'Single-store payout review with six months of case history',
    price: '£99/month',
    priceNote: '1,000 context credits / month',
    features: [
      '1,000 context credits / month',
      'Deeper store context, payout rules, and evidence review',
      'Case Reports and standard exports',
      'Six months of case history',
      'Top-up: £15 for 200 credits (self-serve)',
    ],
    showOnPublicPricing: true,
  },
  {
    key: 'growth',
    name: 'Growth',
    tagline: 'Multi-store payout operations with two years of case history and aggregate reporting',
    price: '£399/month',
    priceNote: '5,000 context credits / month',
    features: [
      '5,000 context credits / month',
      'High-volume claim review',
      'Multi-store support (standard)',
      'Twenty-four months of case history',
      'Advanced aggregate reporting',
      'Priority support',
    ],
    showOnPublicPricing: true,
  },
  {
    key: 'scale',
    name: 'Scale',
    tagline: 'Embedded context infrastructure for high-volume teams',
    price: 'Custom',
    features: [
      'Dedicated monthly volume agreed at onboarding',
      'Case-scoped API / bulk workflows where enabled',
      'Security review and onboarding',
      'Custom reporting and integrations',
    ],
    showOnPublicPricing: true,
  },
  {
    key: 'enterprise',
    name: 'Enterprise / API',
    tagline: 'PSPs, BNPLs, 3PLs, carriers, and dispute partners',
    price: 'Custom',
    features: [
      'Case-scoped payout and recovery API',
      'Aggregate payout and recovery analytics',
      'Per-query pricing',
    ],
    showOnPublicPricing: false,
  },
] as const;

export const LANDING_PRICING_TIERS = LANDING_TIER_CHART.filter((t) => t.showOnPublicPricing);

export const LANDING_FAQ_ALWAYS_FREE = {
  q: 'Will it always be free?',
  a: 'Free remains a real entry point for occasional payout-case review, but higher-volume teams will need more monthly context credits, history, controls, and support.',
} as const;
