import { listConnectors } from '@/lib/connectors/registry';
import { FORBIDDEN_MVP_CAPABILITIES } from '@/lib/connectors/capabilities';
import { isUnsupported, type ConnectorAdapter } from '@/lib/connectors/types';

const CATEGORIES = new Set([
  'commerce', 'helpdesk', 'tracking', 'carrier', 'warehouse_3pl', 'returns', 'payments_disputes', 'documents',
]);
const AUTH_MODES = new Set(['oauth', 'api_key', 'manual_upload']);

describe.each(listConnectors().map((a) => [a.manifest.id, a] as [string, ConnectorAdapter]))(
  'connector contract: %s',
  (_id, adapter) => {
    const m = adapter.manifest;

    it('has a valid manifest', () => {
      expect(m.id).toBeTruthy();
      expect(m.name).toBeTruthy();
      expect(CATEGORIES.has(m.category)).toBe(true);
      expect(AUTH_MODES.has(m.authMode)).toBe(true);
      expect(m.connectorVersion).toBeTruthy();
      expect(['verified', 'partial', 'unverified']).toContain(m.verificationStatus);
      expect(typeof m.launchVisible).toBe('boolean');
      expect(m.capabilities.length).toBeGreaterThan(0);
    });

    it('never declares a forbidden MVP+ capability as supported', () => {
      for (const c of m.capabilities) {
        if (FORBIDDEN_MVP_CAPABILITIES.has(c.id)) {
          expect(c.support).toBe('unsupported');
          expect(c.enabledByDefault).toBe(false);
        }
      }
    });

    it('testConnection returns an ok flag', async () => {
      const res = await adapter.testConnection({ client: {} as never, merchantId: 'm-1', credentials: {} });
      expect(typeof res.ok).toBe('boolean');
    });

    it('normalize returns an array', async () => {
      const out = await adapter.normalize({ sourceEntityType: 'unknown_type', raw: {} });
      expect(Array.isArray(out)).toBe(true);
    });

    it('deepLink returns a string or null', () => {
      const link = adapter.deepLink({ entityType: 'order', externalId: '1', sourceUrl: 'https://x/y' });
      expect(link === null || typeof link === 'string').toBe(true);
    });

    it('sync methods return a SyncPage or a typed unsupported result (never a false success)', async () => {
      const ctx = { client: {} as never, merchantId: 'm-1' };
      for (const result of [await adapter.initialImport(ctx), await adapter.incrementalSync(ctx)]) {
        if (isUnsupported(result)) {
          expect(result.supported).toBe(false);
          expect(result.reason).toBeTruthy();
        } else {
          expect(Array.isArray(result.records)).toBe(true);
          expect(typeof result.hasMore).toBe('boolean');
        }
      }
    });

    it('disconnect resolves ok', async () => {
      const res = await adapter.disconnect({ client: {} as never, merchantId: 'm-1' });
      expect(res.ok).toBe(true);
    });
  },
);
