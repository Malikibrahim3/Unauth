import { resolveConnectionReadModel } from '@/lib/connections/readModel';

const freshness = {
  confidence: 'measured' as const,
  deliveryModel: 'webhook' as const,
  lastDataReceivedAt: '2026-07-24T10:00:00.000Z',
  lastSyncAttemptAt: null,
};

describe('connection read model', () => {
  it('keeps configuration and operational health separate', () => {
    const model = resolveConnectionReadModel({
      providerId: 'shopify',
      syncState: 'stale',
      freshness,
      importedRecords: 42,
    });
    expect(model.configuration).toBe('configured');
    expect(model.operational).toBe('attention');
    expect(model.badge).toBe('stale');
    expect(model.importedRecords).toBe(42);
  });

  it('does not claim a disconnected provider is operational', () => {
    const model = resolveConnectionReadModel({
      providerId: 'gorgias',
      syncState: 'disconnected',
      freshness: { ...freshness, lastDataReceivedAt: null },
    });
    expect(model.configuration).toBe('not_configured');
    expect(model.operational).toBe('unknown');
    expect(model.badge).toBe('disconnected');
  });

  it('uses connection verified for on-demand sources', () => {
    const model = resolveConnectionReadModel({
      providerId: 'ups',
      syncState: 'import_complete',
      freshness: {
        confidence: 'unavailable',
        deliveryModel: 'on_demand',
        lastDataReceivedAt: null,
        lastSyncAttemptAt: null,
        reason: 'on_demand_provider',
      },
      liveVerification: { status: 'verified' },
    });
    expect(model.badge).toBe('connection_verified');
    expect(model.operational).toBe('healthy');
  });
});
