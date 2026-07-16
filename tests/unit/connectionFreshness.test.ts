import { resolveConnectorFreshness } from '@/lib/connections/freshness';

describe('resolveConnectorFreshness', () => {
  it('shopify: measures freshness from webhook_last_received_at, not the one-time backfill columns', () => {
    const freshness = resolveConnectorFreshness({
      providerId: 'shopify',
      merchantIntegration: {
        last_sync_started_at: '2026-01-01T00:00:00Z',
        last_sync_completed_at: '2026-01-01T00:05:00Z',
        last_successful_sync_at: '2026-01-01T00:05:00Z', // one-time backfill, ancient
        webhook_last_received_at: '2026-07-15T23:00:00Z', // fresh, real ongoing signal
      },
    });
    expect(freshness.confidence).toBe('measured');
    expect(freshness.deliveryModel).toBe('webhook');
    expect(freshness.lastDataReceivedAt).toBe('2026-07-15T23:00:00Z');
  });

  it('shopify: reports no data received yet when no webhook has ever arrived', () => {
    const freshness = resolveConnectorFreshness({
      providerId: 'shopify',
      merchantIntegration: {
        last_sync_started_at: null,
        last_sync_completed_at: null,
        last_successful_sync_at: null,
        webhook_last_received_at: null,
      },
    });
    expect(freshness.confidence).toBe('measured');
    expect(freshness.lastDataReceivedAt).toBeNull();
  });

  it('gorgias: measures freshness from helpdeskLastSyncAt, not merchant_integrations (which has no writer for it)', () => {
    const freshness = resolveConnectorFreshness({
      providerId: 'gorgias',
      merchantIntegration: {
        last_sync_started_at: null,
        last_sync_completed_at: null,
        last_successful_sync_at: null,
        webhook_last_received_at: null,
      },
      helpdeskLastSyncAt: '2026-07-16T01:00:00Z',
    });
    expect(freshness.confidence).toBe('measured');
    expect(freshness.deliveryModel).toBe('webhook');
    expect(freshness.lastDataReceivedAt).toBe('2026-07-16T01:00:00Z');
  });

  it('gorgias: null when no ticket webhook has ever landed', () => {
    const freshness = resolveConnectorFreshness({
      providerId: 'gorgias',
      merchantIntegration: null,
      helpdeskLastSyncAt: null,
    });
    expect(freshness.confidence).toBe('measured');
    expect(freshness.lastDataReceivedAt).toBeNull();
  });

  it('shipbob: measures freshness from merchant_integrations sync-completion columns', () => {
    const freshness = resolveConnectorFreshness({
      providerId: 'shipbob',
      merchantIntegration: {
        last_sync_started_at: '2026-07-15T00:00:00Z',
        last_sync_completed_at: '2026-07-15T00:10:00Z',
        last_successful_sync_at: '2026-07-15T00:10:00Z',
        webhook_last_received_at: null,
      },
    });
    expect(freshness.confidence).toBe('measured');
    expect(freshness.deliveryModel).toBe('periodic_sync');
    expect(freshness.lastDataReceivedAt).toBe('2026-07-15T00:10:00Z');
    expect(freshness.lastSyncAttemptAt).toBe('2026-07-15T00:10:00Z');
  });

  it.each(['ups', 'fedex'])('%s: freshness is unavailable by design (on-demand, not periodic)', (providerId) => {
    const freshness = resolveConnectorFreshness({
      providerId,
      merchantIntegration: {
        last_sync_started_at: null,
        last_sync_completed_at: null,
        last_successful_sync_at: '2026-01-01T00:00:00Z',
        webhook_last_received_at: null,
      },
    });
    expect(freshness.confidence).toBe('unavailable');
    expect(freshness.deliveryModel).toBe('on_demand');
    expect(freshness.reason).toBe('on_demand_provider');
    expect(freshness.lastDataReceivedAt).toBeNull();
  });

  it('an unregistered provider never invents a freshness signal', () => {
    const freshness = resolveConnectorFreshness({
      providerId: 'zendesk',
      merchantIntegration: {
        last_sync_started_at: null,
        last_sync_completed_at: null,
        last_successful_sync_at: '2026-01-01T00:00:00Z',
        webhook_last_received_at: '2026-01-01T00:00:00Z',
      },
    });
    expect(freshness.confidence).toBe('unavailable');
    expect(freshness.deliveryModel).toBe('webhook');
    expect(freshness.reason).toBe('no_freshness_resolver');
  });

  it('lastSyncAttemptAt picks the latest of started/completed regardless of provider', () => {
    const freshness = resolveConnectorFreshness({
      providerId: 'shopify',
      merchantIntegration: {
        last_sync_started_at: '2026-07-15T00:00:00Z',
        last_sync_completed_at: '2026-01-01T00:00:00Z',
        last_successful_sync_at: null,
        webhook_last_received_at: null,
      },
    });
    expect(freshness.lastSyncAttemptAt).toBe('2026-07-15T00:00:00Z');
  });
});
