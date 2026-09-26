import type { ConnectorCatalogueItem } from '@/lib/connectors/catalogue';

/** Owner-authorised fictional screenshot account; never a provider-health receipt. */
export const SCREENSHOT_MERCHANT_ID = '4f5a8c25-6dcb-4b90-9e16-3a91c27d8f44';
export const SCREENSHOT_FIXTURE = 'asterlane-screenshots-v1' as const;
export function isScreenshotAccount(merchant: { id: string; is_demo: boolean } | null | undefined): boolean {
  return merchant?.id === SCREENSHOT_MERCHANT_ID && merchant.is_demo === true;
}

const SOURCE_RECORDS: Record<string, { account: string; records: number; families: Record<string, number> }> = {
  shopify: { account: 'Asterlane · UK flagship', records: 50392, families: { 'orders.read': 50392, 'refunds.read': 3984, 'fulfilments.read': 48726, 'disputes.read': 84 } },
  gorgias: { account: 'Asterlane · Customer care', records: 8426, families: { 'tickets.read': 8426, 'messages.read': 28614 } },
  shipbob: { account: 'Asterlane · UK fulfilment', records: 48726, families: { 'fulfilments.read': 48726 } },
  ups: { account: 'Asterlane · Parcel delivery', records: 46218, families: { 'shipments.read': 46218, 'tracking_events.read': 231090, 'delivery_proof.read': 44802 } },
};

export function screenshotSource(item: ConnectorCatalogueItem, enabled: boolean, now = Date.now()): ConnectorCatalogueItem {
  const fixture = enabled ? SOURCE_RECORDS[item.id] : undefined;
  if (!fixture) return item;
  // A stable minute anchor keeps the same navigation coherent, without a daily reseed.
  const at = new Date(Math.floor(now / 60000) * 60000 - 120000).toISOString();
  const capabilities = item.capabilities.filter(c => c.level === 'read' && c.support !== 'unsupported').map(c => ({
    ...c, availability: 'enabled', availabilityReason: 'Illustrative staging connection.',
    lastDataReceivedAt: at, recordCount: fixture.families[c.id] ?? fixture.records,
  }));
  return {
    ...item, screenshotFixture: SCREENSHOT_FIXTURE, status: 'connected', syncState: 'import_complete',
    account: fixture.account, connectionCount: 1, importedRecords: fixture.records, importedRecordsKnown: true,
    lastError: null, lastVerifiedAt: at, lastSyncAttemptAt: at, lastSuccessfulSyncAt: at, lastDataReceivedAt: at,
    liveVerification: { status: 'verified', reason: SCREENSHOT_FIXTURE },
    freshness: { confidence: 'measured', deliveryModel: item.freshness.deliveryModel, lastDataReceivedAt: at, lastSyncAttemptAt: at },
    capabilities,
    evidenceCapabilities: item.evidenceCapabilities?.map(c => ({ ...c, support: 'supported', availability: 'enabled', availabilityReason: 'Illustrative staging evidence.' })),
  };
}

export function screenshotSourceJobs(providerId: string, at: string) {
  return Array.from({ length: 28 }, (_, index) => {
    const completed = Date.parse(at) - index * 86400000;
    return { id: `demo-${providerId}-${index}`, status: 'completed', job_kind: 'incremental_sync',
      processed_rows: 186 + (index * 73) % 430, failed_rows: 0,
      created_at: new Date(completed - 23000).toISOString(), completed_at: new Date(completed).toISOString(), last_error_code: null };
  });
}

/** Stable illustrative context, keyed by entity rather than row position. */
export function screenshotCaseContext(id: string, amountMinor = 0) {
  const key = [...id].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 0);
  return { tracking: `1Z8A${String(key).padStart(10, '0')} · UPS`, orders: 8 + key % 24,
    spendMinor: Math.max(148500 + key % 360000, amountMinor * (9 + key % 24)), priorCases: 1 + key % 3 };
}

export function screenshotCoverage(now = Date.now()) {
  const at = new Date(Math.floor(now / 60000) * 60000 - 120000).toISOString();
  return [
    ['Orders', 50392, 'shopify'], ['Support', 8426, 'gorgias'], ['Fulfilment', 48726, 'shipbob'],
    ['Delivery', 46218, 'ups'], ['Payments & disputes', 84, 'shopify'],
  ].map(([objectType, records, provider]) => ({ objectType: String(objectType), scope: 'connected-source' as const,
    records: Number(records), freshRecords: Number(records), staleRecords: 0, latestAt: at, href: `/sources/${provider}` }));
}
