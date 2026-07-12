import {
  backoffBaseMs,
  backoffWithJitter,
  nextStateOnSuccess,
  nextStateOnFailure,
  unsupportedState,
  processSyncPage,
  runSyncJobPage,
  type SyncJobState,
} from '@/lib/connectors/syncEngine';
import type { ConnectorAdapter, NormalizedRecord, SyncPage } from '@/lib/connectors/types';

const base: SyncJobState = {
  status: 'running', cursor: { page: 1 }, attempts: 2, maxAttempts: 5,
  nextAttemptAt: null, lastErrorCode: null,
};

describe('sync engine backoff', () => {
  it('grows exponentially and caps', () => {
    expect(backoffBaseMs(1, 1000)).toBe(1000);
    expect(backoffBaseMs(2, 1000)).toBe(2000);
    expect(backoffBaseMs(3, 1000)).toBe(4000);
    expect(backoffBaseMs(100, 1000)).toBe(5 * 60_000); // capped
  });
  it('applies bounded deterministic jitter', () => {
    const lo = backoffWithJitter(3, 0, 1000); // -20%
    const hi = backoffWithJitter(3, 1, 1000); // +20%
    expect(lo).toBe(Math.round(4000 * 0.8));
    expect(hi).toBe(Math.round(4000 * 1.2));
  });
});

describe('sync engine state transitions', () => {
  it('advances the cursor only on success and resets attempts', () => {
    const page: SyncPage = { records: [], nextCursor: { page: 2 }, hasMore: true };
    const s = nextStateOnSuccess(base, page);
    expect(s.cursor).toEqual({ page: 2 });
    expect(s.attempts).toBe(0);
    expect(s.status).toBe('running');
  });

  it('completes when no more pages', () => {
    const s = nextStateOnSuccess(base, { records: [], nextCursor: null, hasMore: false });
    expect(s.status).toBe('completed');
    expect(s.nextAttemptAt).toBeNull();
  });

  it('does NOT advance the cursor on failure and schedules a retry', () => {
    const s = nextStateOnFailure(base, 'boom', '2026-07-11T00:00:00.000Z', 4000);
    expect(s.cursor).toEqual({ page: 1 }); // unchanged
    expect(s.attempts).toBe(3);
    expect(s.status).toBe('failed');
    expect(s.nextAttemptAt).toBe('2026-07-11T00:00:04.000Z');
  });

  it('dead-letters after max attempts', () => {
    const s = nextStateOnFailure({ ...base, attempts: 4 }, 'boom', '2026-07-11T00:00:00.000Z', 4000);
    expect(s.status).toBe('dead_letter');
    expect(s.nextAttemptAt).toBeNull();
  });

  it('marks unsupported honestly (no completion-as-success)', () => {
    const s = unsupportedState(base, 'no sync');
    expect(s.status).toBe('unsupported');
    expect(s.cursor).toEqual({ page: 1 });
  });
});

describe('processSyncPage — per-record partial failure', () => {
  const recs: NormalizedRecord[] = [
    { canonicalEntityType: 'order', sourceEntityType: 'order', externalId: 'a', data: {} },
    { canonicalEntityType: 'order', sourceEntityType: 'order', externalId: 'b', data: {} },
    { canonicalEntityType: 'order', sourceEntityType: 'order', externalId: 'c', data: {} },
  ];

  it('persists good records and collects failures without rolling back', async () => {
    const persisted: string[] = [];
    const res = await processSyncPage(recs, async (r) => {
      if (r.externalId === 'b') throw new Error('bad row');
      persisted.push(r.externalId);
    });
    expect(persisted).toEqual(['a', 'c']);
    expect(res.succeeded).toBe(2);
    expect(res.failed).toEqual([{ externalId: 'b', error: 'bad row' }]);
  });
});

describe('runSyncJobPage', () => {
  const clock = { nowIso: '2026-07-11T00:00:00.000Z', rand: 0.5 };

  function adapterReturning(page: SyncPage | { supported: false; reason: string }): ConnectorAdapter {
    return {
      manifest: { id: 'x', name: 'X', category: 'commerce', authMode: 'api_key', capabilities: [], verificationStatus: 'partial', launchVisible: false, connectorVersion: '1' },
      testConnection: async () => ({ ok: true }),
      initialImport: async () => page,
      incrementalSync: async () => page,
      processWebhook: async () => ({ supported: false, reason: 'n/a' }),
      normalize: async () => [],
      deepLink: () => null,
      disconnect: async () => ({ ok: true }),
    };
  }

  it('returns unsupported state when the adapter does not support the method', async () => {
    const adapter = adapterReturning({ supported: false, reason: 'no sync' });
    const res = await runSyncJobPage(adapter, { client: {} as never, merchantId: 'm' }, base, 'incremental_sync', async () => {}, clock);
    expect(res.state.status).toBe('unsupported');
    expect(res.unsupportedReason).toBe('no sync');
  });

  it('retries without cursor advance when a record fails', async () => {
    const page: SyncPage = { records: [{ canonicalEntityType: 'order', sourceEntityType: 'order', externalId: 'a', data: {} }], nextCursor: { page: 9 }, hasMore: true };
    const adapter = adapterReturning(page);
    const res = await runSyncJobPage(adapter, { client: {} as never, merchantId: 'm' }, base, 'initial_import', async () => { throw new Error('db down'); }, clock);
    expect(res.state.status).toBe('failed');
    expect(res.state.cursor).toEqual({ page: 1 }); // not advanced
    expect(res.state.lastErrorCode).toMatch(/partial_page_failure/);
  });

  it('advances the cursor when all records persist', async () => {
    const page: SyncPage = { records: [{ canonicalEntityType: 'order', sourceEntityType: 'order', externalId: 'a', data: {} }], nextCursor: { page: 9 }, hasMore: false };
    const adapter = adapterReturning(page);
    const res = await runSyncJobPage(adapter, { client: {} as never, merchantId: 'm' }, base, 'initial_import', async () => {}, clock);
    expect(res.state.status).toBe('completed');
    expect(res.state.cursor).toEqual({ page: 9 });
  });
});
