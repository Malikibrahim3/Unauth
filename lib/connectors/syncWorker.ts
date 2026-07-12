/**
 * Sync worker — drives the durable sync engine over claimed sync_jobs.
 *
 * The DB `sync_jobs.status` enum is pending/running/completed/failed. The engine
 * produces richer terminal states (dead_letter, unsupported); this worker maps
 * them onto the enum plus `last_error_code`, so an unsupported/dead-letter job is
 * an honest `failed` with a stable code — never a false `completed`.
 *
 * See docs/IMPL_source_agnostic_connected_ecosystem.md §5.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';
import { getConnector } from '@/lib/connectors/registry';
import { upsertSourceRecord } from '@/lib/sources/sourceRegistry';
import { runSyncJobPage, type SyncJobKind, type SyncJobState } from '@/lib/connectors/syncEngine';
import type { ConnectorAdapter, ConnectorContext, NormalizedRecord } from '@/lib/connectors/types';

export type SyncJobRow = {
  id: string;
  merchant_id: string;
  job_kind: string;
  source: string | null;
  status: string;
  cursor: Record<string, unknown> | null;
  attempts: number | null;
  max_attempts: number | null;
  connection_id: string | null;
  source_account_id: string | null;
};

export type SyncJobDbPatch = {
  status: 'pending' | 'running' | 'completed' | 'failed';
  cursor: Record<string, unknown> | null;
  attempts: number;
  next_attempt_at: string | null;
  last_error_code: string | null;
};

/** Map the engine's rich state onto the sync_jobs enum + fields. */
export function mapStateToPatch(state: SyncJobState, continuation: boolean): SyncJobDbPatch {
  if (state.status === 'completed') {
    return { status: 'completed', cursor: state.cursor, attempts: state.attempts, next_attempt_at: null, last_error_code: null };
  }
  if (state.status === 'running') {
    // Page budget hit mid-job: persist as pending to resume next tick.
    return {
      status: continuation ? 'pending' : 'running',
      cursor: state.cursor,
      attempts: state.attempts,
      next_attempt_at: continuation ? new Date().toISOString() : state.nextAttemptAt,
      last_error_code: null,
    };
  }
  // failed | dead_letter | unsupported all map to the enum's 'failed'.
  const code = state.status === 'unsupported' ? 'unsupported'
    : state.status === 'dead_letter' ? `dead_letter:${state.lastErrorCode ?? 'unknown'}`
    : state.lastErrorCode;
  return { status: 'failed', cursor: state.cursor, attempts: state.attempts, next_attempt_at: state.nextAttemptAt, last_error_code: code };
}

function jobToState(job: SyncJobRow): SyncJobState {
  return {
    status: 'running',
    cursor: job.cursor ?? null,
    attempts: job.attempts ?? 0,
    maxAttempts: job.max_attempts ?? 8,
    nextAttemptAt: null,
    lastErrorCode: null,
  };
}

export type RunSyncJobOptions = {
  persistRecord?: (record: NormalizedRecord) => Promise<void>;
  maxPagesPerRun?: number;
  clock?: { nowIso: string; rand: number };
};

/**
 * Run a claimed job to completion, a terminal failure, or a page budget, then
 * persist the resulting state. Returns the final engine state.
 */
export async function runSyncJob(
  client: SupabaseClient,
  adapter: ConnectorAdapter,
  job: SyncJobRow,
  opts: RunSyncJobOptions = {},
): Promise<SyncJobState> {
  const kind: SyncJobKind = job.job_kind === 'initial_import' ? 'initial_import' : 'incremental_sync';
  const ctx: ConnectorContext = {
    client,
    merchantId: job.merchant_id,
    connectionId: job.connection_id,
    sourceAccountId: job.source_account_id,
  };
  const persistRecord = opts.persistRecord ?? defaultPersistRecord(client, job);
  const maxPages = opts.maxPagesPerRun ?? 25;

  let state = jobToState(job);
  let pages = 0;
  while (state.status === 'running' && pages < maxPages) {
    const clock = opts.clock ?? { nowIso: new Date().toISOString(), rand: 0.5 };
    const res = await runSyncJobPage(adapter, ctx, state, kind, persistRecord, clock);
    state = res.state;
    pages += 1;
  }

  const continuation = state.status === 'running'; // budget hit with more pages
  const patch = mapStateToPatch(state, continuation);
  const { error } = await client.from(TABLES.PROCESSING_JOBS).update(patch).eq('id', job.id);
  if (error) throw new Error(`sync_job_persist_failed: ${error.message}`);
  return state;
}

function defaultPersistRecord(client: SupabaseClient, job: SyncJobRow) {
  return async (record: NormalizedRecord): Promise<void> => {
    await upsertSourceRecord(client, {
      merchantId: job.merchant_id,
      connectionId: job.connection_id,
      sourceAccountId: job.source_account_id,
      sourceSystem: job.source ?? 'unknown',
      sourceEntityType: record.sourceEntityType,
      externalId: record.externalId,
      canonicalEntityType: record.canonicalEntityType,
      sourceUrl: record.sourceUrl ?? null,
      sourceCreatedAt: record.sourceCreatedAt ?? null,
      sourceUpdatedAt: record.sourceUpdatedAt ?? null,
    });
  };
}

export type RunDueSyncJobsOptions = {
  limit?: number;
  workerId?: string;
  leaseSeconds?: number;
  resolveAdapter?: (job: SyncJobRow) => ConnectorAdapter | null;
};

/** Claim due jobs via the RPC and run each. Returns a per-job summary. */
export async function runDueSyncJobs(
  client: SupabaseClient,
  opts: RunDueSyncJobsOptions = {},
): Promise<Array<{ jobId: string; status: string }>> {
  const { data, error } = await client.rpc('claim_sync_job', {
    p_limit: opts.limit ?? 5,
    p_worker: opts.workerId ?? 'sync-worker',
    p_lease_seconds: opts.leaseSeconds ?? 300,
  });
  if (error) throw new Error(`claim_sync_job_failed: ${error.message}`);
  const jobs = (data as SyncJobRow[] | null) ?? [];
  const resolveAdapter = opts.resolveAdapter ?? ((job: SyncJobRow) => getConnector(job.source ?? ''));

  const results: Array<{ jobId: string; status: string }> = [];
  for (const job of jobs) {
    const adapter = resolveAdapter(job);
    if (!adapter) {
      await client.from(TABLES.PROCESSING_JOBS)
        .update({ status: 'failed', last_error_code: 'connector_not_registered', next_attempt_at: null })
        .eq('id', job.id);
      results.push({ jobId: job.id, status: 'connector_not_registered' });
      continue;
    }
    const state = await runSyncJob(client, adapter, job);
    results.push({ jobId: job.id, status: state.status });
  }
  return results;
}
