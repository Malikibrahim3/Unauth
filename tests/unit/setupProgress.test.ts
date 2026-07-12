import { deduplicateProviders, deriveSetupProgress } from '@/lib/onboarding/setupProgress';
import type { ProviderConnectionView } from '@/lib/integrations/types';

const provider = (id: string, category: ProviderConnectionView['category'], status: ProviderConnectionView['status'] = 'connected', syncState: ProviderConnectionView['syncState'] = 'import_complete'): ProviderConnectionView => ({ id, name: id, category, status, syncState, authMode: 'oauth', buildStatus: 'live', evidenceCapabilities: [], lastSyncAt: null, lastError: null, detail: null });
const progress = (providers: ProviderConnectionView[], overrides: Partial<Parameters<typeof deriveSetupProgress>[0]> = {}) => deriveSetupProgress({ providers, activeRules: 1, paymentConfirmed: true, warehouseRequired: false, ...overrides });

describe('merchant setup progress', () => {
  it('moves through required sources using backend state', () => {
    expect(progress([], { activeRules: 0, paymentConfirmed: false }).percent).toBe(0);
    expect(progress([provider('shopify', 'commerce')]).completed).toBe(3);
    expect(progress([provider('shopify', 'commerce'), provider('gorgias', 'helpdesk')]).completed).toBe(4);
    expect(progress([provider('shopify', 'commerce'), provider('gorgias', 'helpdesk'), provider('aftership', 'tracking')]).complete).toBe(true);
  });
  it('does not let optional documents block completion', () => {
    const result = progress([provider('shopify', 'commerce'), provider('gorgias', 'helpdesk'), provider('aftership', 'tracking')]);
    expect(result.total).toBe(5);
    expect(result.complete).toBe(true);
  });
  it('requires a warehouse only when merchant applicability says so', () => {
    const sources = [provider('shopify', 'commerce'), provider('gorgias', 'helpdesk'), provider('aftership', 'tracking')];
    expect(progress(sources, { warehouseRequired: true }).complete).toBe(false);
    expect(progress([...sources, provider('shipbob', 'warehouse_3pl')], { warehouseRequired: true }).complete).toBe(true);
  });
  it.each(['stale', 'sync_failed', 'attention_required'] as const)('does not count a %s required source as complete', (syncState) => {
    const result = progress([provider('shopify', 'commerce', 'connected', syncState), provider('gorgias', 'helpdesk'), provider('aftership', 'tracking')]);
    expect(result.complete).toBe(false);
    expect(result.requirements.find((item) => item.key === 'commerce')).toMatchObject({ complete: false, broken: true });
  });
  it('deduplicates provider rows and prefers the healthy canonical state', () => {
    const rows = deduplicateProviders([provider('shopify', 'commerce', 'revoked', 'disconnected'), provider('shopify', 'commerce')]);
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('connected');
  });
  it('keeps merchant calculations isolated by input', () => {
    const merchantA = progress([provider('shopify', 'commerce'), provider('gorgias', 'helpdesk'), provider('aftership', 'tracking')]);
    const merchantB = progress([]);
    expect(merchantA.complete).toBe(true);
    expect(merchantB.completed).toBe(2);
  });
});
