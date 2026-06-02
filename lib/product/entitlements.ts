import type { ProductTier } from '@/lib/product/tiers';
import { TIER_LABELS, TIER_ORDER } from '@/lib/product/tiers';

export type Entitlement =
  | 'EVIDENCE_PACKS'
  | 'STORE_SYNC'
  | 'CSV_IMPORT_LIMITED'
  | 'CSV_IMPORT_FULL'
  | 'CE3_READINESS_CHECK'
  | 'CUSTOMER_SEARCH'
  | 'CUSTOMER_DOSSIER'
  | 'CLAIM_REVIEW_QUEUE'
  | 'HELPDESK_WIDGET'
  | 'WATCHLIST'
  | 'REPORTS_ADVANCED'
  | 'LIVE_LOOKUP_API'
  | 'QUICK_SCORE'
  | 'NETWORK_GRAPH'
  | 'CHECKOUT_CONTROLS'
  | 'SIGNAL_API';

export interface EntitlementMeta {
  label: string;
  requiredTier: ProductTier;
  availability: 'live' | 'future';
}

const FREE_ENTITLEMENTS = [
  'EVIDENCE_PACKS',
  'STORE_SYNC',
  'CSV_IMPORT_LIMITED',
  'CE3_READINESS_CHECK',
] as const satisfies readonly Entitlement[];

const PRO_ENTITLEMENTS = [
  'CUSTOMER_SEARCH',
  'CUSTOMER_DOSSIER',
  'CLAIM_REVIEW_QUEUE',
  'HELPDESK_WIDGET',
  'WATCHLIST',
  'REPORTS_ADVANCED',
] as const satisfies readonly Entitlement[];

const ADVANCED_ENTITLEMENTS = [
  'CSV_IMPORT_FULL',
  'LIVE_LOOKUP_API',
  'QUICK_SCORE',
  'NETWORK_GRAPH',
  'CHECKOUT_CONTROLS',
] as const satisfies readonly Entitlement[];

const ENTERPRISE_ENTITLEMENTS = ['SIGNAL_API'] as const satisfies readonly Entitlement[];

const TIER_ENTITLEMENTS: Record<ProductTier, readonly Entitlement[]> = {
  free: FREE_ENTITLEMENTS,
  pro: [...FREE_ENTITLEMENTS, ...PRO_ENTITLEMENTS],
  advanced: [...FREE_ENTITLEMENTS, ...PRO_ENTITLEMENTS, ...ADVANCED_ENTITLEMENTS],
  enterprise: [
    ...FREE_ENTITLEMENTS,
    ...PRO_ENTITLEMENTS,
    ...ADVANCED_ENTITLEMENTS,
    ...ENTERPRISE_ENTITLEMENTS,
  ],
};

export const ENTITLEMENT_META: Record<Entitlement, EntitlementMeta> = {
  EVIDENCE_PACKS: { label: 'Evidence packs', requiredTier: 'free', availability: 'live' },
  STORE_SYNC: { label: 'Store sync', requiredTier: 'free', availability: 'live' },
  CSV_IMPORT_LIMITED: { label: 'CSV import (limited)', requiredTier: 'free', availability: 'live' },
  CE3_READINESS_CHECK: { label: 'CE 3.0 readiness checks', requiredTier: 'free', availability: 'live' },
  CUSTOMER_SEARCH: { label: 'Customer search', requiredTier: 'pro', availability: 'live' },
  CUSTOMER_DOSSIER: { label: 'Customer dossiers', requiredTier: 'pro', availability: 'live' },
  CLAIM_REVIEW_QUEUE: { label: 'Claim review queue', requiredTier: 'pro', availability: 'live' },
  HELPDESK_WIDGET: { label: 'Helpdesk widgets', requiredTier: 'pro', availability: 'live' },
  WATCHLIST: { label: 'Watchlist', requiredTier: 'pro', availability: 'live' },
  REPORTS_ADVANCED: { label: 'Advanced reports', requiredTier: 'pro', availability: 'live' },
  CSV_IMPORT_FULL: { label: 'CSV import (full)', requiredTier: 'advanced', availability: 'live' },
  LIVE_LOOKUP_API: { label: 'Live lookup API', requiredTier: 'advanced', availability: 'live' },
  QUICK_SCORE: { label: 'Quick score', requiredTier: 'advanced', availability: 'live' },
  NETWORK_GRAPH: { label: 'Network graph', requiredTier: 'advanced', availability: 'live' },
  CHECKOUT_CONTROLS: {
    label: 'Checkout controls',
    requiredTier: 'advanced',
    availability: 'future',
  },
  SIGNAL_API: { label: 'Signal API', requiredTier: 'enterprise', availability: 'live' },
};

export function getPlanEntitlements(plan: ProductTier): Entitlement[] {
  return [...TIER_ENTITLEMENTS[plan]];
}

export function hasEntitlement(plan: ProductTier, entitlement: Entitlement): boolean {
  return TIER_ENTITLEMENTS[plan].includes(entitlement);
}

export function getRequiredTierForEntitlement(entitlement: Entitlement): ProductTier {
  return ENTITLEMENT_META[entitlement].requiredTier;
}

export function getFeatureAccessLabel(entitlement: Entitlement): string {
  const meta = ENTITLEMENT_META[entitlement];
  const tierLabel = TIER_LABELS[meta.requiredTier];
  if (meta.availability === 'future') {
    return `${tierLabel} · Future`;
  }
  return tierLabel;
}

export function isFeatureCommerciallyGated(entitlement: Entitlement): boolean {
  return getRequiredTierForEntitlement(entitlement) !== 'free';
}

export { parseProductGateEnv } from '@/lib/product/envFlags';
export { shouldEnforceProductGates } from '@/lib/product/gates';
