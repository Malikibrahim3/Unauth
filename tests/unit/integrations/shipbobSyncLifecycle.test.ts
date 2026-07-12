/**
 * ShipBob import lifecycle regression tests: idempotent job creation, inline
 * account-sync claim/run, connection-state reflection, and sync-state
 * derivation. The account-level sync (lib/integrations/providers/shipbobSync)
 * must stay a different service from the single-record evidence fetch
 * (app/api/integrations/[provider]/sync).
 */
import { ensureShipBobSyncJob, runShipBobAccountSync } from '@/lib/integrations/providers/shipbobSync';
import { updateShipBobConnectionAfterSync } from '@/lib/connectors/providers/shipbob/persistence';
import { deriveSyncState } from '@/lib/integrations/syncState';
import type { SyncJobState } from '@/lib/connectors/syncEngine';

jest.mock('@/lib/utils/env', () => ({ env: {} }));
jest.mock('@/lib/integrations/secrets', () => ({
  encryptIntegrationCredentials: (v: unknown) => JSON.stringify(v),
  decryptIntegrationCredentials: (v: string) => JSON.parse(v),
}));

// ---------------------------------------------------------------------------
// Chainable Supabase mock: enough of the PostgREST builder for these modules.
// ---------------------------------------------------------------------------
type TableState = {
  rows: Record<string, unknown>[];
  insertError?: { code: string; message: string } | null;
};

function makeClient(tables: Record<string, TableState>) {
  const calls: Array<{ table: string; op: string; payload?: unknown; filters: Array<[string, unknown]> }> = [];
  function builder(table: string) {
    const state = tables[table] ?? (tables[table] = { rows: [] });
    const ctx: { op: string; payload?: unknown; filters: Array<[string, unknown]>; count?: boolean } = { op: 'select', filters: [] };
    const matches = (row: Record<string, unknown>) =>
      ctx.filters.every(([k, v]) => (k.startsWith('in:') ? (v as unknown[]).includes(row[k.slice(3)]) : row[k] === v));
    const finish = () => {
      calls.push({ table, op: ctx.op, payload: ctx.payload, filters: ctx.filters });
      if (ctx.op === 'insert') {
        if (state.insertError) return { data: null, error: state.insertError };
        const row = ctx.payload as Record<string, unknown>;
        const withId = { id: `${table}-${state.rows.length + 1}`, created_at: new Date().toISOString(), attempts: 0, max_attempts: 8, started_at: null, ...row };
        state.rows.push(withId);
        return { data: withId, error: null };
      }
      if (ctx.op === 'update') {
        const updated = state.rows.filter(matches);
        updated.forEach((row) => Object.assign(row, ctx.payload as Record<string, unknown>));
        return { data: updated[0] ?? null, error: null };
      }
      const rows = state.rows.filter(matches);
      if (ctx.count) return { data: null, error: null, count: rows.length };
      return { data: rows[0] ?? null, error: null };
    };
    const api: Record<string, unknown> = {};
    const chain = (fn: (...args: unknown[]) => void) => (...args: unknown[]) => { fn(...args); return api; };
    Object.assign(api, {
      select: chain((_cols: unknown, opts?: { count?: string; head?: boolean }) => { ctx.count = Boolean(opts?.count); }),
      insert: chain((payload: unknown) => { ctx.op = 'insert'; ctx.payload = payload; }),
      update: chain((payload: unknown) => { ctx.op = 'update'; ctx.payload = payload; }),
      eq: chain((k: string, v: unknown) => ctx.filters.push([k, v])),
      in: chain((k: string, v: unknown) => ctx.filters.push([`in:${k}`, v])),
      order: chain(() => {}),
      limit: chain(() => {}),
      maybeSingle: () => Promise.resolve(finish()),
      single: () => {
        const res = finish();
        return Promise.resolve(res.data ? res : { data: null, error: res.error ?? { code: 'PGRST116', message: 'no rows' } });
      },
      then: (resolve: (v: unknown) => void) => resolve(finish()),
    });
    return api;
  }
  return {
    client: { from: builder, rpc: jest.fn() } as never,
    calls,
    tables,
  };
}

const jobInput = { merchantId: 'm-1', connectionId: 'conn-1', sourceAccountId: 'acct-1' };

describe('ensureShipBobSyncJob', () => {
  it('creates exactly one initial_import job when none exists', async () => {
    const { client, tables } = makeClient({ sync_jobs: { rows: [] } });
    const first = await ensureShipBobSyncJob(client, jobInput);
    expect(first.created).toBe(true);
    expect(first.job.job_kind).toBe('initial_import');
    expect(tables.sync_jobs.rows).toHaveLength(1);
  });

  it('duplicate callback reuses the pending job instead of duplicating', async () => {
    const { client, tables } = makeClient({ sync_jobs: { rows: [] } });
    const first = await ensureShipBobSyncJob(client, jobInput);
    const second = await ensureShipBobSyncJob(client, jobInput);
    expect(second.created).toBe(false);
    expect(second.job.id).toBe(first.job.id);
    expect(tables.sync_jobs.rows).toHaveLength(1);
  });

  it('unique-violation race falls back to the concurrently created job', async () => {
    const existing = { id: 'raced', merchant_id: 'm-1', source: 'shipbob', job_kind: 'initial_import', status: 'pending', cursor: null, attempts: 0, max_attempts: 8, connection_id: 'conn-1', source_account_id: 'acct-1', started_at: null, next_attempt_at: null };
    const { client, tables } = makeClient({ sync_jobs: { rows: [], insertError: { code: '23505', message: 'duplicate' } } });
    // Simulate: lookup sees nothing, insert hits the unique index, re-lookup finds the winner.
    const originalRows = tables.sync_jobs.rows;
    let lookups = 0;
    const origFrom = (client as { from: (t: string) => unknown }).from;
    (client as { from: (t: string) => unknown }).from = (t: string) => {
      if (t === 'sync_jobs') {
        lookups += 1;
        if (lookups > 1 && originalRows.length === 0) originalRows.push(existing);
      }
      return origFrom(t);
    };
    const result = await ensureShipBobSyncJob(client, jobInput);
    expect(result.created).toBe(false);
    expect(result.job.id).toBe('raced');
  });

  it('after a completed import, the next ensure creates an incremental_sync', async () => {
    const completed = { id: 'done', merchant_id: 'm-1', source: 'shipbob', job_kind: 'initial_import', status: 'completed', cursor: null, attempts: 1, max_attempts: 8, connection_id: 'conn-1', source_account_id: 'acct-1', started_at: null, next_attempt_at: null };
    const { client } = makeClient({ sync_jobs: { rows: [completed] } });
    const result = await ensureShipBobSyncJob(client, jobInput);
    expect(result.created).toBe(true);
    expect(result.job.job_kind).toBe('incremental_sync');
  });
});

describe('runShipBobAccountSync', () => {
  it('does not run alongside a live (unexpired-lease) running job', async () => {
    const running = { id: 'live', merchant_id: 'm-1', source: 'shipbob', job_kind: 'initial_import', status: 'running', cursor: null, attempts: 0, max_attempts: 8, connection_id: 'conn-1', source_account_id: 'acct-1', started_at: new Date().toISOString(), next_attempt_at: null };
    const { client } = makeClient({ sync_jobs: { rows: [running] } });
    const result = await runShipBobAccountSync(client, jobInput);
    expect(result.ran).toBe(false);
    if (!result.ran) expect(result.reason).toBe('job_already_running');
  });

  it('respects a failed job backoff (next_attempt_at in the future)', async () => {
    const failed = { id: 'wait', merchant_id: 'm-1', source: 'shipbob', job_kind: 'initial_import', status: 'failed', cursor: null, attempts: 3, max_attempts: 8, connection_id: 'conn-1', source_account_id: 'acct-1', started_at: null, next_attempt_at: new Date(Date.now() + 60_000).toISOString() };
    const { client } = makeClient({ sync_jobs: { rows: [failed] } });
    const result = await runShipBobAccountSync(client, jobInput);
    expect(result.ran).toBe(false);
    if (!result.ran) expect(result.reason).toBe('job_not_claimable');
  });
});

describe('updateShipBobConnectionAfterSync', () => {
  const conn = { id: 'conn-1', merchant_id: 'm-1', status: 'connected', last_sync_at: null, imported_record_count: 0 };
  const completedState: SyncJobState = { status: 'completed', cursor: null, attempts: 1, maxAttempts: 8, nextAttemptAt: null, lastErrorCode: null };

  it('successful empty import completes with zero counts and a sync timestamp', async () => {
    const { client, tables } = makeClient({
      merchant_integrations: { rows: [{ ...conn }] },
      source_records: { rows: [] },
    });
    await updateShipBobConnectionAfterSync(client, { merchant_id: 'm-1', connection_id: 'conn-1' }, completedState);
    const row = tables.merchant_integrations.rows[0];
    expect(row.imported_record_count).toBe(0);
    expect(row.last_sync_completed_at).toBeTruthy();
    expect(row.last_successful_sync_at).toBeTruthy();
    expect(row.status).toBe('connected');
  });

  it('non-empty import records the imported count', async () => {
    const { client, tables } = makeClient({
      merchant_integrations: { rows: [{ ...conn }] },
      source_records: { rows: [
        { id: 'r1', merchant_id: 'm-1', connection_id: 'conn-1' },
        { id: 'r2', merchant_id: 'm-1', connection_id: 'conn-1' },
      ] },
    });
    await updateShipBobConnectionAfterSync(client, { merchant_id: 'm-1', connection_id: 'conn-1' }, completedState);
    expect(tables.merchant_integrations.rows[0].imported_record_count).toBe(2);
  });

  it('merchant isolation: counts only the owning merchant+connection records', async () => {
    const { client, tables } = makeClient({
      merchant_integrations: { rows: [{ ...conn }] },
      source_records: { rows: [
        { id: 'r1', merchant_id: 'm-1', connection_id: 'conn-1' },
        { id: 'other-merchant', merchant_id: 'm-2', connection_id: 'conn-1' },
        { id: 'other-conn', merchant_id: 'm-1', connection_id: 'conn-9' },
      ] },
    });
    await updateShipBobConnectionAfterSync(client, { merchant_id: 'm-1', connection_id: 'conn-1' }, completedState);
    expect(tables.merchant_integrations.rows[0].imported_record_count).toBe(1);
  });

  it('failure preserves the connection and records a merchant-readable error', async () => {
    const { client, tables } = makeClient({ merchant_integrations: { rows: [{ ...conn }] } });
    await updateShipBobConnectionAfterSync(
      client,
      { merchant_id: 'm-1', connection_id: 'conn-1' },
      { status: 'failed', cursor: null, attempts: 2, maxAttempts: 8, nextAttemptAt: new Date().toISOString(), lastErrorCode: 'shipbob_auth_failed:401' },
    );
    const row = tables.merchant_integrations.rows[0];
    expect(row.last_error_code).toBe('shipbob_auth_failed:401');
    expect(row.last_error_message).toContain('shipbob_auth_failed:401');
    expect(row.status).toBe('connected'); // connection is kept; sync failed
  });
});

describe('deriveSyncState', () => {
  const base = {
    status: 'connected',
    lastSyncStartedAt: null,
    lastSyncCompletedAt: null,
    lastSuccessfulSyncAt: null,
    importedRecordCount: null,
    lastErrorCode: null,
  };
  const now = Date.parse('2026-07-12T12:00:00Z');

  it('OAuth success alone is only import_queued, never complete', () => {
    expect(deriveSyncState(base, now)).toBe('import_queued');
  });
  it('a started but unfinished import shows importing', () => {
    expect(deriveSyncState({ ...base, lastSyncStartedAt: '2026-07-12T11:59:00Z' }, now)).toBe('importing');
  });
  it('completed with zero records is no_records_found — not pending', () => {
    expect(deriveSyncState({ ...base, lastSyncCompletedAt: '2026-07-12T11:00:00Z', lastSuccessfulSyncAt: '2026-07-12T11:00:00Z', importedRecordCount: 0 }, now)).toBe('no_records_found');
  });
  it('completed with records is import_complete', () => {
    expect(deriveSyncState({ ...base, lastSyncCompletedAt: '2026-07-12T11:00:00Z', lastSuccessfulSyncAt: '2026-07-12T11:00:00Z', importedRecordCount: 12 }, now)).toBe('import_complete');
  });
  it('a failed initial import is sync_failed', () => {
    expect(deriveSyncState({ ...base, lastErrorCode: 'shipbob_auth_failed:401' }, now)).toBe('sync_failed');
  });
  it('a failure after a good sync is attention_required', () => {
    expect(deriveSyncState({ ...base, lastSyncCompletedAt: '2026-07-12T10:00:00Z', importedRecordCount: 5, lastErrorCode: 'shipbob_api_failed:500' }, now)).toBe('attention_required');
  });
  it('an old successful sync is stale', () => {
    expect(deriveSyncState({ ...base, lastSyncCompletedAt: '2026-07-10T10:00:00Z', lastSuccessfulSyncAt: '2026-07-10T10:00:00Z', importedRecordCount: 5 }, now)).toBe('stale');
  });
  it('revoked/disabled connections are disconnected', () => {
    expect(deriveSyncState({ ...base, status: 'revoked' }, now)).toBe('disconnected');
  });
});
