/**
 * Durable sync engine.
 *
 * Runs a connector's initial import / incremental sync as a resumable job over
 * `sync_jobs`, with:
 *   - cursor advanced ONLY on a fully-reconciled page (never past unreconciled data);
 *   - per-record partial failure (a bad record does not roll back valid records
 *     or advance the cursor);
 *   - retry with exponential backoff + jitter, capped attempts, dead-letter;
 *   - honest handling of `unsupported` adapter methods (no false success).
 *
 * The state-transition helpers are pure so the retry/backoff/DLQ/cursor rules
 * are unit-tested without a database. Persistence is injected.
 *
 * See ARCHITECTURE.md for the executable adapter owner and sync boundary.
 */
import type {
  ConnectorAdapter,
  ConnectorContext,
  NormalizedRecord,
  SyncCursor,
  SyncPage,
} from '@/lib/connectors/types';
import { isUnsupported } from '@/lib/connectors/types';

export type SyncJobKind = 'initial_import' | 'incremental_sync';

export type SyncJobState = {
  status: 'pending' | 'running' | 'completed' | 'failed' | 'dead_letter' | 'unsupported';
  cursor: SyncCursor;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt: string | null;
  lastErrorCode: string | null;
  processedRecords?: number;
  failedRecords?: number;
};

/** Deterministic exponential backoff in ms (jitter applied separately). */
export function backoffBaseMs(attempts: number, baseMs = 1000, capMs = 5 * 60_000): number {
  const raw = baseMs * 2 ** Math.max(0, attempts - 1);
  return Math.min(raw, capMs);
}

/**
 * Backoff with bounded +/- jitter. `rand` in [0,1) is injected so callers stay
 * deterministic in tests (Math.random is unavailable in some runtimes anyway).
 */
export function backoffWithJitter(attempts: number, rand: number, baseMs = 1000): number {
  const base = backoffBaseMs(attempts, baseMs);
  const jitter = base * 0.2 * (rand * 2 - 1); // +/-20%
  return Math.max(0, Math.round(base + jitter));
}

export function nextStateOnSuccess(
  prev: SyncJobState,
  page: SyncPage,
): SyncJobState {
  return {
    ...prev,
    // Advance the cursor only now that the page is fully reconciled.
    cursor: page.nextCursor,
    status: page.hasMore ? 'running' : 'completed',
    attempts: 0, // reset attempts on progress
    nextAttemptAt: page.hasMore ? new Date().toISOString() : null,
    lastErrorCode: null,
  };
}

export function nextStateOnFailure(
  prev: SyncJobState,
  errorCode: string,
  nowIso: string,
  backoffMs: number,
): SyncJobState {
  const attempts = prev.attempts + 1;
  const dead = attempts >= prev.maxAttempts;
  return {
    ...prev,
    // Cursor is NOT advanced on failure — the job resumes from the same point.
    status: dead ? 'dead_letter' : 'failed',
    attempts,
    nextAttemptAt: dead ? null : new Date(Date.parse(nowIso) + backoffMs).toISOString(),
    lastErrorCode: errorCode,
  };
}

export function unsupportedState(prev: SyncJobState, reason: string): SyncJobState {
  // Honest terminal state: no cursor movement, no completion-as-success.
  return { ...prev, status: 'unsupported', nextAttemptAt: null, lastErrorCode: reason };
}

export type PageProcessResult = {
  succeeded: number;
  failed: Array<{ externalId: string; error: string }>;
};

/**
 * Persist each record independently. A record that throws is collected as a
 * per-record failure; the others still succeed. When any record fails the
 * caller must NOT advance the cursor past this page.
 */
export async function processSyncPage(
  records: NormalizedRecord[],
  persistRecord: (record: NormalizedRecord) => Promise<void>,
): Promise<PageProcessResult> {
  let succeeded = 0;
  const failed: Array<{ externalId: string; error: string }> = [];
  for (const record of records) {
    try {
      await persistRecord(record);
      succeeded += 1;
    } catch (e) {
      failed.push({ externalId: record.externalId, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return { succeeded, failed };
}

export type RunSyncJobResult = {
  state: SyncJobState;
  page?: PageProcessResult;
  unsupportedReason?: string;
};

/**
 * Run one page of a sync job through the adapter and compute the next durable
 * state. Does not itself write `sync_jobs`; the caller persists `result.state`.
 */
export async function runSyncJobPage(
  adapter: ConnectorAdapter,
  ctx: ConnectorContext,
  prev: SyncJobState,
  kind: SyncJobKind,
  persistRecord: (record: NormalizedRecord) => Promise<void>,
  clock: { nowIso: string; rand: number } = { nowIso: new Date().toISOString(), rand: 0.5 },
): Promise<RunSyncJobResult> {
  let result: SyncPage | { supported: false; reason: string };
  try {
    result = kind === 'initial_import'
      ? await adapter.initialImport(ctx, prev.cursor)
      : await adapter.incrementalSync(ctx, prev.cursor);
  } catch (e) {
    const code = e instanceof Error ? e.message : String(e);
    return {
      state: nextStateOnFailure(prev, code, clock.nowIso, backoffWithJitter(prev.attempts + 1, clock.rand)),
    };
  }

  if (isUnsupported(result)) {
    return { state: unsupportedState(prev, result.reason), unsupportedReason: result.reason };
  }

  const page = await processSyncPage(result.records, persistRecord);
  if (page.failed.length > 0) {
    // Partial failure: retry without advancing the cursor past unreconciled data.
    return {
      state: {
        ...nextStateOnFailure(
          prev,
          `partial_page_failure:${page.failed.length}`,
          clock.nowIso,
          backoffWithJitter(prev.attempts + 1, clock.rand),
        ),
        processedRecords: (prev.processedRecords ?? 0) + page.succeeded,
        failedRecords: (prev.failedRecords ?? 0) + page.failed.length,
      },
      page,
    };
  }

  return {
    state: {
      ...nextStateOnSuccess(prev, result),
      processedRecords: (prev.processedRecords ?? 0) + page.succeeded,
      failedRecords: prev.failedRecords ?? 0,
    },
    page,
  };
}
