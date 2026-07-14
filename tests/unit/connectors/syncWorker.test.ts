import { mapStateToPatch, runSyncJob, runDueSyncJobs, type SyncJobRow } from '@/lib/connectors/syncWorker';
import type { SyncJobState } from '@/lib/connectors/syncEngine';
import type { ConnectorAdapter, SyncPage } from '@/lib/connectors/types';

const stateBase: SyncJobState = { status: 'running', cursor: { p: 1 }, attempts: 0, maxAttempts: 5, nextAttemptAt: null, lastErrorCode: null };

describe('mapStateToPatch', () => {
  it('maps completed', () => {
    expect(mapStateToPatch({ ...stateBase, status: 'completed' }, false)).toMatchObject({ status: 'completed', next_attempt_at: null });
  });
  it('maps mid-job running to pending continuation', () => {
    const p = mapStateToPatch({ ...stateBase, status: 'running' }, true);
    expect(p.status).toBe('pending');
    expect(p.next_attempt_at).not.toBeNull();
  });
  it('maps unsupported to failed with a stable code', () => {
    expect(mapStateToPatch({ ...stateBase, status: 'unsupported', lastErrorCode: 'no sync' }, false))
      .toMatchObject({ status: 'failed', last_error_code: 'unsupported' });
  });
  it('maps dead_letter to failed with a dead_letter code and no retry', () => {
    const p = mapStateToPatch({ ...stateBase, status: 'dead_letter', lastErrorCode: 'boom', nextAttemptAt: null }, false);
    expect(p.status).toBe('failed');
    expect(p.last_error_code).toMatch(/^dead_letter:/);
  });
});

function makeClient() {
  const updates: Array<{ patch: any; id: string }> = [];
  // Credential lookup resolves to "no stored credential" — adapters under test
  // do not authenticate.
  const selectChain: any = {
    eq: () => selectChain,
    maybeSingle: async () => ({ data: null, error: null }),
  };
  const client: any = {
    from: () => ({
      update: (patch: any) => {
        const filters: Array<[string, string]> = [];
        const chain: any = {
          eq: (column: string, value: string) => { filters.push([column, value]); return chain; },
          then: (resolve: (value: { error: null }) => unknown) => {
            updates.push({ patch, id: filters.find(([column]) => column === 'id')?.[1] ?? '' });
            return Promise.resolve({ error: null }).then(resolve);
          },
        };
        return chain;
      },
      select: () => selectChain,
    }),
    rpc: jest.fn(),
  };
  return { client, updates };
}

function adapterYielding(pages: Array<SyncPage | { supported: false; reason: string }>): ConnectorAdapter {
  let i = 0;
  const next = async () => pages[Math.min(i++, pages.length - 1)];
  return {
    manifest: { id: 'x', name: 'X', category: 'commerce', authMode: 'api_key', capabilities: [], verificationStatus: 'partial', launchVisible: false, connectorVersion: '1' },
    testConnection: async () => ({ ok: true }),
    initialImport: next,
    incrementalSync: next,
    processWebhook: async () => ({ supported: false, reason: 'n/a' }),
    normalize: async () => [],
    deepLink: () => null,
    disconnect: async () => ({ ok: true }),
  };
}

const job: SyncJobRow = {
  id: 'job-1', merchant_id: 'm-1', job_kind: 'initial_import', source: 'x',
  status: 'running', cursor: null, attempts: 0, max_attempts: 5, connection_id: 'c-1', source_account_id: 'a-1',
};

describe('runSyncJob', () => {
  it('runs pages to completion, advancing the cursor, and persists completed', async () => {
    const { client, updates } = makeClient();
    const adapter = adapterYielding([
      { records: [], nextCursor: { p: 2 }, hasMore: true },
      { records: [], nextCursor: { p: 3 }, hasMore: false },
    ]);
    const state = await runSyncJob(client, adapter, job, { persistRecord: async () => {}, clock: { nowIso: '2026-07-11T00:00:00.000Z', rand: 0.5 } });
    expect(state.status).toBe('completed');
    expect(state.cursor).toEqual({ p: 3 });
    expect(updates.at(-1)?.patch.status).toBe('completed');
  });

  it('persists an unsupported job as failed (never false-completed)', async () => {
    const { client, updates } = makeClient();
    const adapter = adapterYielding([{ supported: false, reason: 'no sync' }]);
    const state = await runSyncJob(client, adapter, job, { persistRecord: async () => {} });
    expect(state.status).toBe('unsupported');
    expect(updates.at(-1)?.patch.status).toBe('failed');
    expect(updates.at(-1)?.patch.last_error_code).toBe('unsupported');
  });

  it('stops at the page budget and persists a pending continuation', async () => {
    const { client, updates } = makeClient();
    const adapter = adapterYielding([{ records: [], nextCursor: { p: 99 }, hasMore: true }]);
    const state = await runSyncJob(client, adapter, job, { persistRecord: async () => {}, maxPagesPerRun: 1 });
    expect(state.status).toBe('running');
    expect(updates.at(-1)?.patch.status).toBe('pending');
  });
});

describe('runDueSyncJobs', () => {
  it('claims jobs and marks unknown connectors as connector_not_registered', async () => {
    const { client, updates } = makeClient();
    client.rpc = jest.fn(async () => ({ data: [{ ...job, source: 'nope' }], error: null }));
    const results = await runDueSyncJobs(client, { resolveAdapter: () => null });
    expect(results).toEqual([{ jobId: 'job-1', status: 'connector_not_registered' }]);
    expect(updates.at(-1)?.patch.last_error_code).toBe('connector_not_registered');
  });

  it('runs a claimed job through its adapter', async () => {
    const { client } = makeClient();
    client.rpc = jest.fn(async () => ({ data: [job], error: null }));
    const adapter = adapterYielding([{ records: [], nextCursor: null, hasMore: false }]);
    const results = await runDueSyncJobs(client, { resolveAdapter: () => adapter });
    expect(results).toEqual([{ jobId: 'job-1', status: 'completed' }]);
  });

  it('continues with another merchant connection when one claimed job throws', async () => {
    const { client, updates } = makeClient();
    const second = { ...job, id: 'job-2', merchant_id: 'm-2', connection_id: 'c-2', source_account_id: 'a-2' };
    client.rpc = jest.fn(async () => ({ data: [job, second], error: null }));
    const failing = adapterYielding([{ records: [], nextCursor: null, hasMore: false }]);
    failing.initialImport = async () => { throw new Error('provider_timeout:private-detail'); };
    const healthy = adapterYielding([{ records: [], nextCursor: null, hasMore: false }]);
    const results = await runDueSyncJobs(client, {
      resolveAdapter: (candidate) => candidate.id === 'job-1' ? failing : healthy,
    });
    expect(results).toEqual([
      { jobId: 'job-1', status: 'failed' },
      { jobId: 'job-2', status: 'completed' },
    ]);
    expect(updates.find(({ id }) => id === 'job-1')?.patch.last_error_code).toBe('provider_timeout');
  });
});
