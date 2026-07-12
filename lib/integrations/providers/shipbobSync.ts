/**
 * ShipBob account-level sync service.
 *
 * This is the FULL-CONNECTION sync (locations, orders, shipments, returns via
 * the connector's paginated import) — distinct from the single-record evidence
 * fetch at /api/integrations/[provider]/sync, which looks up one order and
 * attaches evidence to one payout case.
 *
 * Execution model: jobs in sync_jobs are normally drained by the scheduled
 * worker (/api/cron/process-sync-jobs, registered in vercel.json). This module
 * additionally lets a merchant-initiated request ensure a job exists and run
 * it inline so "Sync now" / "Retry import" gives immediate feedback.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { getConnector } from '@/lib/connectors/registry';
import { runSyncJob, type SyncJobRow } from '@/lib/connectors/syncWorker';
import type { SyncJobState } from '@/lib/connectors/syncEngine';

const SHIPBOB = 'shipbob';
/** Mirror of the claim RPC's lease: a 'running' job older than this is stuck. */
const STUCK_LEASE_SECONDS = 300;

type JobStatusRow = SyncJobRow & { started_at: string | null; next_attempt_at: string | null };

async function findLatestJob(client: SupabaseClient, merchantId: string): Promise<JobStatusRow | null> {
  const { data, error } = await client
    .from('sync_jobs')
    .select('id,merchant_id,job_kind,source,status,cursor,attempts,max_attempts,connection_id,source_account_id,started_at,next_attempt_at')
    .eq('merchant_id', merchantId)
    .eq('source', SHIPBOB)
    .in('job_kind', ['initial_import', 'incremental_sync'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`shipbob_sync_job_lookup_failed:${error.message}`);
  return (data as JobStatusRow | null) ?? null;
}

/**
 * Ensure exactly one runnable ShipBob sync job exists for the merchant.
 * Reuses a pending/failed/stuck-running job rather than inserting a duplicate,
 * so repeated OAuth callbacks or repeated "Sync now" clicks never fan out.
 */
export async function ensureShipBobSyncJob(
  client: SupabaseClient,
  input: { merchantId: string; connectionId: string; sourceAccountId: string | null },
): Promise<{ job: JobStatusRow; created: boolean }> {
  const existing = await findLatestJob(client, input.merchantId);
  if (existing && existing.status !== 'completed') return { job: existing, created: false };

  // First import runs the full initial_import; later manual syncs re-walk the
  // same cursor phases idempotently (upserts) as an incremental reconciliation.
  const jobKind = existing?.status === 'completed' ? 'incremental_sync' : 'initial_import';
  const { data, error } = await client
    .from('sync_jobs')
    .insert({
      merchant_id: input.merchantId,
      connection_id: input.connectionId,
      source_account_id: input.sourceAccountId,
      source: SHIPBOB,
      job_kind: jobKind,
      status: 'pending',
      cursor: null,
      next_attempt_at: new Date().toISOString(),
      label: jobKind === 'initial_import' ? 'ShipBob initial import' : 'ShipBob account sync',
    })
    .select('id,merchant_id,job_kind,source,status,cursor,attempts,max_attempts,connection_id,source_account_id,started_at,next_attempt_at')
    .single();
  if (error) {
    // Unique-violation race: another request inserted concurrently — reuse it.
    if (error.code === '23505') {
      const raced = await findLatestJob(client, input.merchantId);
      if (raced) return { job: raced, created: false };
    }
    throw new Error(`shipbob_sync_job_create_failed:${error.message}`);
  }
  return { job: data as JobStatusRow, created: true };
}

function isClaimable(job: JobStatusRow, now: number): boolean {
  if (job.status === 'pending' || job.status === 'failed') {
    return !job.next_attempt_at || Date.parse(job.next_attempt_at) <= now;
  }
  if (job.status === 'running') {
    // Reclaim only when the lease has expired (crashed worker), matching the
    // claim_sync_job RPC semantics so we never run alongside a live worker.
    return Boolean(job.started_at) && Date.parse(job.started_at as string) < now - STUCK_LEASE_SECONDS * 1000;
  }
  return false;
}

export type ShipBobAccountSyncResult =
  | { ran: true; state: SyncJobState; jobId: string }
  | { ran: false; reason: 'job_not_claimable' | 'job_already_running' | 'connector_missing'; jobId: string };

/**
 * Run the merchant's ShipBob sync job inline (merchant-scoped, optimistic
 * claim). Safe against the cron worker: the claim is a guarded status update,
 * so whichever side claims first wins and the other backs off.
 */
export async function runShipBobAccountSync(
  client: SupabaseClient,
  input: { merchantId: string; connectionId: string; sourceAccountId: string | null; now?: number },
): Promise<ShipBobAccountSyncResult> {
  const { job } = await ensureShipBobSyncJob(client, input);
  const now = input.now ?? Date.now();
  if (!isClaimable(job, now)) {
    return { ran: false, reason: job.status === 'running' ? 'job_already_running' : 'job_not_claimable', jobId: job.id };
  }

  // Optimistic claim: only transitions the row if it is still in the state we
  // observed, so a concurrent cron claim makes this a no-op.
  const { data: claimed, error } = await client
    .from('sync_jobs')
    .update({ status: 'running', started_at: new Date(now).toISOString(), last_error_code: null, updated_at: new Date(now).toISOString() })
    .eq('id', job.id)
    .eq('status', job.status)
    .select('id,merchant_id,job_kind,source,status,cursor,attempts,max_attempts,connection_id,source_account_id')
    .maybeSingle();
  if (error) throw new Error(`shipbob_sync_job_claim_failed:${error.message}`);
  if (!claimed) return { ran: false, reason: 'job_already_running', jobId: job.id };

  const adapter = getConnector(SHIPBOB);
  if (!adapter) return { ran: false, reason: 'connector_missing', jobId: job.id };

  const state = await runSyncJob(client, adapter, claimed as SyncJobRow);
  return { ran: true, state, jobId: job.id };
}
