import { isScreenshotAccount, SCREENSHOT_MERCHANT_ID, screenshotSource, screenshotSourceJobs } from '@/lib/demo/screenshotAccount';
import { connectionReadModel } from '@/lib/connections/readModel';
import type { ConnectorCatalogueItem } from '@/lib/connectors/catalogue';

const item = {
  id: 'shopify', status: 'error', syncState: 'stale', importedRecords: 0,
  freshness: { confidence: 'unavailable', deliveryModel: 'webhook', lastDataReceivedAt: null, lastSyncAttemptAt: null },
  capabilities: [
    { id: 'orders.read', level: 'read', support: 'supported', availability: 'unavailable' },
    { id: 'refunds.write', level: 'write', support: 'supported', availability: 'merchant_disabled' },
  ],
  evidenceCapabilities: [{ id: 'order_value', support: 'supported', availability: 'unavailable' }],
} as ConnectorCatalogueItem;

it('requires both the exact staging account and its trusted demo flag', () => {
  expect(isScreenshotAccount({ id: SCREENSHOT_MERCHANT_ID, is_demo: true })).toBe(true);
  expect(isScreenshotAccount({ id: SCREENSHOT_MERCHANT_ID, is_demo: false })).toBe(false);
  expect(isScreenshotAccount({ id: 'another-demo', is_demo: true })).toBe(false);
  expect(isScreenshotAccount(null)).toBe(false);
});
it('preserves ordinary merchants and unselected providers without mutation', () => {
  expect(screenshotSource(item, false)).toBe(item);
  const other = { ...item, id: 'fedex' };
  expect(screenshotSource(other, true)).toBe(other);
  screenshotSource(item, true);
  expect(item.status).toBe('error');
  expect(item.freshness.lastDataReceivedAt).toBeNull();
});
it('provides consistent healthy source data without enabling write capabilities', () => {
  const now = Date.parse('2026-09-10T14:22:30Z');
  const projected = screenshotSource(item, true, now);
  const model = connectionReadModel({ providerId: projected.id, ...projected });
  expect(model.operational).toBe('healthy');
  expect(model.lastDataReceivedAt).toBe(projected.lastSuccessfulSyncAt);
  expect(projected.capabilities.map(c => c.level)).toEqual(['read']);
  expect(projected.capabilities[0].recordCount).toBe(projected.importedRecords);
  expect(projected.liveVerification?.reason).toBe('asterlane-screenshots-v1');
  expect(screenshotSource(item, true, now + 1000)).toEqual(projected);
  expect(Date.parse(screenshotSource(item, true, now + 86400000).lastDataReceivedAt!)).toBe(now - 150000 + 86400000);
});
it('provides successful ordered activity with nonnegative duration', () => {
  const jobs = screenshotSourceJobs('shopify', '2026-09-10T14:20:00Z');
  expect(jobs).toHaveLength(28);
  for (const job of jobs) {
    expect(Date.parse(job.completed_at) - Date.parse(job.created_at)).toBe(23000);
    expect(job.failed_rows).toBe(0);
    expect(job.processed_rows).toBeGreaterThan(0);
  }
});

it('covers all five evidence layers with the four selected demo sources', () => {
  const { getIntegrationProvider } = require('@/lib/integrations/registry');
  const { evaluateSourceReadiness } = require('@/lib/sources/evidenceReadiness');
  const sources = ['shopify', 'gorgias', 'shipbob', 'ups'].map(id => {
    const provider = getIntegrationProvider(id);
    const projected = screenshotSource({ ...item, id, name: provider.name, stage: 'available',
      evidenceCapabilities: provider.evidenceCapabilities.map((capability: string) => ({ id: capability, support: 'supported', availability: 'unavailable', availabilityReason: '' })),
    }, true);
    const readModel = connectionReadModel({ providerId: id, ...projected });
    return { ...projected, badge: readModel.badge, readModel };
  });
  const readiness = evaluateSourceReadiness(sources);
  expect(readiness.readyCount).toBe(5);
  expect(readiness.currentCount).toBe(5);
  expect(readiness.missingLayers).toEqual([]);
});
