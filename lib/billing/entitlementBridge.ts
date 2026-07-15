import type { FeatureKey, Tier } from '@/lib/billing/tiers';
import { can, minimumTierForFeature } from '@/lib/billing/tiers';
import { normalizeTier } from '@/lib/billing/normalizeTier';
import type { Entitlement } from '@/lib/product/entitlements.types';

/** Maps legacy UI entitlements to canonical feature keys. */
export const ENTITLEMENT_TO_FEATURE: Record<Entitlement, FeatureKey> = {
  EVIDENCE_PACKS: 'evidence_export_raw',
  STORE_SYNC: 'own_store_analytics',
  CE3_READINESS_CHECK: 'chargeback_analytics',
  CUSTOMER_SEARCH: 'customer_search',
  CUSTOMER_DOSSIER: 'customer_dossier',
  CLAIM_REVIEW_QUEUE: 'claims_queue',
  HELPDESK_WIDGET: 'helpdesk_widget',
  REPORTS_ADVANCED: 'advanced_reports',
  LIVE_LOOKUP_API: 'lookup_api',
  QUICK_SCORE: 'quick_score_api',
};

export function hasEntitlementForTier(tier: Tier | string, entitlement: Entitlement): boolean {
  const normalized = typeof tier === 'string' ? normalizeTier(tier) : tier;
  const feature = ENTITLEMENT_TO_FEATURE[entitlement];
  return can(normalized, feature);
}

export function requiredTierForEntitlement(entitlement: Entitlement): Tier {
  return minimumTierForFeature(ENTITLEMENT_TO_FEATURE[entitlement]);
}
