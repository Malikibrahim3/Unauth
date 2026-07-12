/**
 * Derive a merchant-readable sync state for a connection from real backend
 * fields — never from OAuth success alone. Consumed by the Integration Centre
 * card so "initial import pending" can only appear while a job is genuinely
 * queued, and an empty-but-successfully-checked account reads as complete.
 */

export type ConnectionSyncState =
  | 'disconnected'
  | 'sync_failed'
  | 'attention_required'
  | 'import_queued'
  | 'importing'
  | 'no_records_found'
  | 'stale'
  | 'import_complete';

export type SyncStateInput = {
  status: string | null;
  lastSyncStartedAt: string | null;
  lastSyncCompletedAt: string | null;
  lastSuccessfulSyncAt: string | null;
  importedRecordCount: number | null;
  lastErrorCode: string | null;
};

const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

export function deriveSyncState(input: SyncStateInput, now = Date.now()): ConnectionSyncState {
  const status = input.status ?? '';
  if (status === 'not_connected' || status === 'revoked' || status === 'disabled') return 'disconnected';

  const completedAt = input.lastSyncCompletedAt ? Date.parse(input.lastSyncCompletedAt) : null;
  const hasCompleted = completedAt !== null && Number.isFinite(completedAt);

  if (input.lastErrorCode) {
    // Initial import never succeeded → hard failure; a later failure after a
    // good sync is attention-required (previous records remain valid).
    return hasCompleted ? 'attention_required' : 'sync_failed';
  }
  if (!hasCompleted) {
    return input.lastSyncStartedAt ? 'importing' : 'import_queued';
  }
  if ((input.importedRecordCount ?? 0) === 0) return 'no_records_found';

  const successAt = input.lastSuccessfulSyncAt ? Date.parse(input.lastSuccessfulSyncAt) : completedAt;
  if (successAt !== null && Number.isFinite(successAt) && now - successAt > STALE_AFTER_MS) return 'stale';
  return 'import_complete';
}

export const SYNC_STATE_LABELS: Record<ConnectionSyncState, string> = {
  disconnected: 'Disconnected',
  sync_failed: 'Sync failed',
  attention_required: 'Attention required',
  import_queued: 'Connected — import queued',
  importing: 'Connected — importing',
  no_records_found: 'Connected — no records found',
  stale: 'Connected — data may be stale',
  import_complete: 'Connected — import complete',
};
