import {
  TIER_CONFIG,
  can,
  effectiveTier,
  isBillingActive,
  limit,
  minimumTierForFeature,
} from '@/lib/billing/tiers';
import { normalizeTier } from '@/lib/billing/normalizeTier';
import {
  ENTITLEMENT_TO_FEATURE,
  hasEntitlementForTier,
} from '@/lib/billing/entitlementBridge';
import { hasEntitlement, getPlanEntitlements } from '@/lib/product/entitlements';
import type { Entitlement } from '@/lib/product/entitlements.types';

describe('billing tiers (canonical SSOT)', () => {
  it('free tier includes the core review surface with monthly context credits', () => {
    expect(TIER_CONFIG.free.label).toBe('Free');
    expect(can('free', 'own_store_analytics')).toBe(true);
    expect(can('free', 'context_checks')).toBe(true);
    expect(can('free', 'claims_queue')).toBe(true);
    expect(can('free', 'helpdesk_widget')).toBe(true);
    expect(can('free', 'network_signal_enrichment')).toBe(true);
    expect(can('free', 'watchlist')).toBe(false);
    expect(limit('free', 'contextCreditsPerMonth')).toBe(100);
    expect(limit('free', 'historyDays')).toBe(30);
    if (isBillingActive()) {
      expect(limit('pro', 'historyDays')).toBe(180);
      expect(limit('growth', 'historyDays')).toBe(730);
      expect(can('pro', 'multi_store')).toBe(false);
      expect(can('growth', 'multi_store')).toBe(true);
    }
  });

  it('when billing is inactive in non-production, can(), limit(), and effectiveTier() use free', () => {
    if (process.env.VERCEL_ENV === 'production') {
      expect(isBillingActive()).toBe(true);
      expect(effectiveTier('growth')).toBe('growth');
      return;
    }
    expect(isBillingActive()).toBe(process.env.BILLING_ACTIVE === 'true');
    if (!isBillingActive()) {
      expect(effectiveTier('growth')).toBe('free');
      expect(can('growth', 'network_signal_enrichment')).toBe(true);
      expect(can('pro', 'customer_dossier')).toBe(true);
      expect(limit('growth', 'connectedStores')).toBe(TIER_CONFIG.free.limits.connectedStores);
    }
  });

  it('growth tier config unlocks network features', () => {
    expect(TIER_CONFIG.growth.features.network_signal_enrichment).toBe(true);
    expect(TIER_CONFIG.growth.features.identity_graph).toBe(true);
    expect(TIER_CONFIG.pro.features.network_signal_enrichment).toBe(true);
  });

  it('enterprise tier config is API-focused for embedded claim context', () => {
    expect(TIER_CONFIG.enterprise.features.lookup_api).toBe(true);
    expect(TIER_CONFIG.enterprise.features.quick_score_api).toBe(true);
    expect(TIER_CONFIG.enterprise.features.customer_dossier).toBeUndefined();
  });

  it('normalizeTier maps legacy advanced → growth', () => {
    expect(normalizeTier('advanced')).toBe('growth');
    expect(normalizeTier('bogus')).toBe('free');
  });

  it('minimumTierForFeature uses can() and follows billing-active gate', () => {
    if (!isBillingActive()) {
      expect(minimumTierForFeature('customer_search')).toBe('free');
      return;
    }
    expect(minimumTierForFeature('customer_search')).toBe('free');
    expect(minimumTierForFeature('lookup_api')).toBe('scale');
  });
});

function configuredEntitlements(tier: keyof typeof TIER_CONFIG): Entitlement[] {
  return (Object.keys(ENTITLEMENT_TO_FEATURE) as Entitlement[]).filter((entitlement) => {
    const feature = ENTITLEMENT_TO_FEATURE[entitlement];
    return TIER_CONFIG[tier].features[feature] === true;
  });
}

describe('entitlement bridge (legacy UI → FeatureKey)', () => {
  const ALL_ENTITLEMENTS = Object.keys(ENTITLEMENT_TO_FEATURE) as Entitlement[];

  it('maps each configured tier to entitlements in TIER_CONFIG', () => {
    expect(configuredEntitlements('free').sort()).toEqual(
      ['CE3_READINESS_CHECK', 'STORE_SYNC', 'CUSTOMER_SEARCH', 'CUSTOMER_DOSSIER', 'CLAIM_REVIEW_QUEUE', 'HELPDESK_WIDGET'].sort(),
    );
    expect(TIER_CONFIG.free.features.evidence_export_raw).toBeUndefined();
    expect(TIER_CONFIG.pro.features.evidence_export_raw).toBe(true);
    expect(configuredEntitlements('pro')).toEqual(
      expect.arrayContaining([
        'CUSTOMER_SEARCH',
        'CUSTOMER_DOSSIER',
        'CLAIM_REVIEW_QUEUE',
        'HELPDESK_WIDGET',
      ]),
    );
    expect(configuredEntitlements('growth')).toEqual(
      expect.arrayContaining([
        'NETWORK_GRAPH',
        'REPORTS_ADVANCED',
      ]),
    );
    expect(configuredEntitlements('scale')).toEqual(
      expect.arrayContaining(['REPORTS_ADVANCED']),
    );
    expect(configuredEntitlements('growth')).toEqual(
      expect.arrayContaining(['NETWORK_GRAPH']),
    );
    expect(configuredEntitlements('enterprise').length).toBeLessThan(ALL_ENTITLEMENTS.length);
  });

  it('hasEntitlement follows billing-active gate via can()', () => {
    if (!isBillingActive()) {
      expect(getPlanEntitlements('pro').sort()).toEqual(getPlanEntitlements('free').sort());
      return;
    }
    expect(hasEntitlement('growth', 'LIVE_LOOKUP_API')).toBe(false);
    expect(hasEntitlement('enterprise', 'LIVE_LOOKUP_API')).toBe(true);
  });
});
