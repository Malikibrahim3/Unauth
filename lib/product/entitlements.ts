import {
  ENTITLEMENT_TO_FEATURE,
  hasEntitlementForTier,
  requiredTierForEntitlement,
} from '@/lib/billing/entitlementBridge';
import { can, tierLabel, type Tier } from '@/lib/billing/tiers';
import type { Entitlement, EntitlementMeta } from '@/lib/product/entitlements.types';

export type { Entitlement, EntitlementMeta } from '@/lib/product/entitlements.types';
export { can, limit, type FeatureKey, type Tier } from '@/lib/billing/tiers';

export const ENTITLEMENT_META: Record<Entitlement, EntitlementMeta> = {
  EVIDENCE_PACKS: { label: 'Evidence & Defence', availability: 'live' },
  STORE_SYNC: { label: 'Store sync', availability: 'live' },
  CE3_READINESS_CHECK: { label: 'Chargeback evidence readiness', availability: 'live' },
  CUSTOMER_SEARCH: { label: 'Customer search', availability: 'live' },
  CUSTOMER_DOSSIER: { label: 'Customer dossiers', availability: 'live' },
  CLAIM_REVIEW_QUEUE: { label: 'Payout control', availability: 'live' },
  HELPDESK_WIDGET: { label: 'Helpdesk widgets', availability: 'live' },
  REPORTS_ADVANCED: { label: 'Advanced reports', availability: 'live' },
  LIVE_LOOKUP_API: { label: 'Live lookup API', availability: 'live' },
  QUICK_SCORE: { label: 'Quick score', availability: 'live' },
};

const ALL_ENTITLEMENTS = Object.keys(ENTITLEMENT_META) as Entitlement[];

export function getPlanEntitlements(plan: Tier): Entitlement[] {
  return ALL_ENTITLEMENTS.filter((entitlement) => hasEntitlement(plan, entitlement));
}

export function hasEntitlement(plan: Tier, entitlement: Entitlement): boolean {
  return hasEntitlementForTier(plan, entitlement);
}

export function getRequiredTierForEntitlement(entitlement: Entitlement): Tier {
  return requiredTierForEntitlement(entitlement);
}

export function getFeatureAccessLabel(entitlement: Entitlement): string {
  const meta = ENTITLEMENT_META[entitlement];
  const required = tierLabel(getRequiredTierForEntitlement(entitlement));
  if (meta.availability === 'future') {
    return `${required} · Future`;
  }
  return required;
}

export function isFeatureCommerciallyGated(entitlement: Entitlement): boolean {
  return !can('free', ENTITLEMENT_TO_FEATURE[entitlement]);
}

export { parseProductGateEnv } from '@/lib/product/envFlags';
