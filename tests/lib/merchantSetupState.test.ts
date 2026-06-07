/**
 * Phase 2 — canonical setup-state resolver.
 *
 * Exercises resolveMerchantSetupState() and the gating helpers across every
 * MerchantSetupState. Pure logic, no database.
 */

import type { ConnectionState } from '@/lib/connections/getConnectionState';
import type { MerchantDataPresence } from '@/lib/supabase/getMerchantDataPresence';
import {
  resolveMerchantSetupState,
  shouldFullGate,
  setupStateHasUsefulData,
} from '@/lib/connections/setupState';

function connection(over: Partial<ConnectionState>): ConnectionState {
  const orderSourceConnected = over.orderSourceConnected ?? over.shopify ?? false;
  const helpdesk = over.helpdesk ?? false;
  const orderSourcePlatform =
    over.orderSourcePlatform ??
    (orderSourceConnected ? 'shopify' : null);
  return {
    orderSourceConnected,
    orderSourcePlatform,
    orderSourceStoreKey: over.orderSourceStoreKey ?? null,
    shopify: over.shopify ?? orderSourcePlatform === 'shopify' && orderSourceConnected,
    helpdesk,
    helpdeskProvider: helpdesk ? 'gorgias' : null,
    bothConnected: orderSourceConnected && helpdesk,
    neitherConnected: !orderSourceConnected && !helpdesk,
    shopifyOnlyConnected: orderSourceConnected && !helpdesk,
    helpdeskOnlyConnected: !orderSourceConnected && helpdesk,
    shopDomain: null,
    linkState: 'not_connected',
    ...over,
  };
}

function presence(over: Partial<MerchantDataPresence> = {}): MerchantDataPresence {
  const base: MerchantDataPresence = {
    hasAnyData: false,
    hasCustomerProfiles: false,
    hasOrders: false,
    hasShopifySignals: false,
    hasHelpdeskClaims: false,
    hasEvidencePackages: false,
    hasWatchlist: false,
    hasCustomerActivity: false,
    hasCsvImports: false,
    hasLiveIntegrationReports: false,
    sources: {
      customerProfiles: 0,
      auditTransactions: 0,
      processingJobs: 0,
      csvImports: 0,
      shopifyOrderSignals: 0,
      merchantClaims: 0,
      supportCases: 0,
      evidencePackages: 0,
      watchlistEntries: 0,
      customerActivity: 0,
    },
  };
  return { ...base, ...over, sources: { ...base.sources, ...(over.sources ?? {}) } };
}

const EMPTY = presence();
const SHOPIFY_DATA = presence({ hasAnyData: true, hasShopifySignals: true, hasOrders: true });
const HELPDESK_DATA = presence({ hasAnyData: true, hasHelpdeskClaims: true });
const CSV_DATA = presence({ hasAnyData: true, hasCsvImports: true, hasCustomerProfiles: true });
const STALE_DATA = presence({ hasAnyData: true, hasCustomerProfiles: true, hasShopifySignals: true });

describe('resolveMerchantSetupState', () => {
  it('fresh: no data, no integrations', () => {
    expect(resolveMerchantSetupState(connection({}), EMPTY)).toBe('fresh');
  });

  it('shopify_only_empty', () => {
    expect(resolveMerchantSetupState(connection({ shopify: true }), EMPTY)).toBe('shopify_only_empty');
  });

  it('shopify_only_with_data', () => {
    expect(resolveMerchantSetupState(connection({ shopify: true }), SHOPIFY_DATA)).toBe('shopify_only_with_data');
  });

  it('helpdesk_only_empty', () => {
    expect(resolveMerchantSetupState(connection({ helpdesk: true }), EMPTY)).toBe('helpdesk_only_empty');
  });

  it('helpdesk_only_with_data', () => {
    expect(resolveMerchantSetupState(connection({ helpdesk: true }), HELPDESK_DATA)).toBe('helpdesk_only_with_data');
  });

  it('fully_connected_empty', () => {
    expect(resolveMerchantSetupState(connection({ shopify: true, helpdesk: true }), EMPTY)).toBe('fully_connected_empty');
  });

  it('fully_connected_with_data', () => {
    expect(resolveMerchantSetupState(connection({ shopify: true, helpdesk: true }), SHOPIFY_DATA)).toBe('fully_connected_with_data');
  });

  it('csv_only: import data, no live integrations, no live signals', () => {
    expect(resolveMerchantSetupState(connection({}), CSV_DATA)).toBe('csv_only');
  });

  it('stale_existing_data: profiles/signals exist but no integrations', () => {
    expect(resolveMerchantSetupState(connection({}), STALE_DATA)).toBe('stale_existing_data');
  });

  it('csv data plus live signals is not csv_only', () => {
    const mixed = presence({ hasAnyData: true, hasCsvImports: true, hasShopifySignals: true });
    expect(resolveMerchantSetupState(connection({}), mixed)).toBe('stale_existing_data');
  });
});

describe('gating helpers', () => {
  it('full-gates only the empty / no-useful-data states', () => {
    expect(shouldFullGate('fresh')).toBe(true);
    expect(shouldFullGate('shopify_only_empty')).toBe(true);
    expect(shouldFullGate('helpdesk_only_empty')).toBe(true);
    expect(shouldFullGate('fully_connected_empty')).toBe(true);

    expect(shouldFullGate('shopify_only_with_data')).toBe(false);
    expect(shouldFullGate('helpdesk_only_with_data')).toBe(false);
    expect(shouldFullGate('fully_connected_with_data')).toBe(false);
    expect(shouldFullGate('csv_only')).toBe(false);
    expect(shouldFullGate('stale_existing_data')).toBe(false);
  });

  it('setupStateHasUsefulData is the inverse of shouldFullGate', () => {
    const states = [
      'fresh',
      'shopify_only_empty',
      'shopify_only_with_data',
      'helpdesk_only_empty',
      'helpdesk_only_with_data',
      'csv_only',
      'fully_connected_empty',
      'fully_connected_with_data',
      'stale_existing_data',
    ] as const;
    for (const s of states) {
      expect(setupStateHasUsefulData(s)).toBe(!shouldFullGate(s));
    }
  });
});
