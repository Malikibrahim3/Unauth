import {
  ENTITLEMENT_META,
  getFeatureAccessLabel,
  getPlanEntitlements,
  getRequiredTierForEntitlement,
  hasEntitlement,
  type Entitlement,
} from '@/lib/product/entitlements';
import { parseProductGateEnv, shouldEnforceProductGates } from '@/lib/product/gates';

const ALL_ENTITLEMENTS = Object.keys(ENTITLEMENT_META) as Entitlement[];

describe('product entitlements', () => {
  it('maps each tier to the cumulative entitlement set', () => {
    expect(getPlanEntitlements('free').sort()).toEqual(
      ['CE3_READINESS_CHECK', 'CSV_IMPORT_LIMITED', 'EVIDENCE_PACKS', 'STORE_SYNC'].sort(),
    );
    expect(getPlanEntitlements('pro')).toEqual(
      expect.arrayContaining([
        'CUSTOMER_SEARCH',
        'CUSTOMER_DOSSIER',
        'CLAIM_REVIEW_QUEUE',
        'HELPDESK_WIDGET',
        'WATCHLIST',
        'REPORTS_ADVANCED',
      ]),
    );
    expect(getPlanEntitlements('advanced')).toEqual(
      expect.arrayContaining([
        'CSV_IMPORT_FULL',
        'LIVE_LOOKUP_API',
        'QUICK_SCORE',
        'NETWORK_GRAPH',
        'CHECKOUT_CONTROLS',
      ]),
    );
    expect(getPlanEntitlements('enterprise')).toEqual(
      expect.arrayContaining(['SIGNAL_API']),
    );
    expect(getPlanEntitlements('enterprise').length).toBe(ALL_ENTITLEMENTS.length);
  });

  it('hasEntitlement reflects tier inclusion', () => {
    expect(hasEntitlement('free', 'EVIDENCE_PACKS')).toBe(true);
    expect(hasEntitlement('free', 'CUSTOMER_SEARCH')).toBe(false);
    expect(hasEntitlement('pro', 'WATCHLIST')).toBe(true);
    expect(hasEntitlement('pro', 'NETWORK_GRAPH')).toBe(false);
    expect(hasEntitlement('advanced', 'LIVE_LOOKUP_API')).toBe(true);
    expect(hasEntitlement('advanced', 'SIGNAL_API')).toBe(false);
    expect(hasEntitlement('enterprise', 'SIGNAL_API')).toBe(true);
  });

  it('getRequiredTierForEntitlement matches metadata', () => {
    for (const entitlement of ALL_ENTITLEMENTS) {
      expect(getRequiredTierForEntitlement(entitlement)).toBe(
        ENTITLEMENT_META[entitlement].requiredTier,
      );
    }
  });

  it('shouldEnforceProductGates returns false when env var absent', () => {
    const prior = process.env.ENFORCE_PRODUCT_GATES;
    delete process.env.ENFORCE_PRODUCT_GATES;
    expect(shouldEnforceProductGates()).toBe(false);
    if (prior !== undefined) process.env.ENFORCE_PRODUCT_GATES = prior;
  });

  it('parseProductGateEnv handles true/false and 1/0', () => {
    expect(parseProductGateEnv(undefined)).toBe(false);
    expect(parseProductGateEnv('')).toBe(false);
    expect(parseProductGateEnv('true')).toBe(true);
    expect(parseProductGateEnv('TRUE')).toBe(true);
    expect(parseProductGateEnv('1')).toBe(true);
    expect(parseProductGateEnv('false')).toBe(false);
    expect(parseProductGateEnv('0')).toBe(false);
    expect(parseProductGateEnv('yes')).toBe(false);
  });

  it('CHECKOUT_CONTROLS metadata is future-facing', () => {
    expect(ENTITLEMENT_META.CHECKOUT_CONTROLS.availability).toBe('future');
    expect(getFeatureAccessLabel('CHECKOUT_CONTROLS')).toBe('Advanced · Future');
  });
});
