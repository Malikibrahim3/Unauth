import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../supabase/types';
import { isUpstreamDown } from '../engine/dbSemaphore';

export type ServiceClient = SupabaseClient<Database>;

export interface CreateJobOptions {
  filename?: string;
  label?: string;
  dateRangeStart?: string; // ISO date string YYYY-MM-DD
  dateRangeEnd?: string;   // ISO date string YYYY-MM-DD
  uploadType?: 'standard' | 'historical' | 'investigation';
  fileHash?: string; // SHA-256 hex digest of the raw file bytes
}

export async function createJob(
  serviceClient: ServiceClient,
  merchantId: string,
  filenameOrOptions?: string | CreateJobOptions,
): Promise<string> {
  const opts: CreateJobOptions =
    typeof filenameOrOptions === 'string'
      ? { filename: filenameOrOptions }
      : (filenameOrOptions ?? {});

  const { data, error } = await serviceClient
    .from('processing_jobs')
    .insert({
      status: 'pending',
      merchant_id: merchantId,
      total_rows: 0,
      processed_rows: 0,
      failed_rows: 0,
      filename: opts.filename ?? 'unknown.csv',
      hidden_by_merchant: false,
      label: opts.label ?? null,
      date_range_start: opts.dateRangeStart ?? null,
      date_range_end: opts.dateRangeEnd ?? null,
      upload_type: opts.uploadType ?? 'standard',
      file_hash: opts.fileHash ?? null,
    } as any)
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`Failed to create processing job: ${error?.message ?? 'unknown'}`);
  }

  return data.id;
}

export async function updateJobTotalRows(
  serviceClient: ServiceClient,
  jobId: string,
  totalRows: number
): Promise<void> {
  const { error } = await serviceClient
    .from('processing_jobs')
    .update({
      total_rows: totalRows,
      status: 'processing',
      progress_pct: 0,
      progress_message: totalRows > 0 ? `Queued 0 of ${totalRows.toLocaleString()} rows` : 'Queued for processing…',
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any)
    .eq('id', jobId);

  if (error) {
    console.error('Failed to update job total rows:', error);
  }
}

export async function incrementJobProgress(
  serviceClient: ServiceClient,
  jobId: string,
  processedDelta: number,
  failedDelta: number
): Promise<void> {
  // Primary path: atomic increment via RPC (migration 0022/0023).
  const { error } = await serviceClient.rpc('increment_job_progress' as any, {
    p_job_id: jobId,
    p_processed_delta: processedDelta,
    p_failed_delta: failedDelta,
  });

  if (!error) return;

  // Fallback when the RPC doesn't exist yet (migration not applied).
  // Read-then-write is not perfectly atomic but is safe for progress tracking
  // where slight inaccuracies are acceptable.
  if (error.code === 'PGRST202' || error.code === '42883') {
    const { data: job } = await serviceClient
      .from('processing_jobs')
      .select('processed_rows, failed_rows, total_rows')
      .eq('id', jobId)
      .single();
    const { error: updateError } = await serviceClient
      .from('processing_jobs')
      .update({
        processed_rows: (job?.processed_rows ?? 0) + processedDelta,
        failed_rows: (job?.failed_rows ?? 0) + failedDelta,
        progress_pct:
          (job?.total_rows ?? 0) > 0
            ? Math.round((((job?.processed_rows ?? 0) + processedDelta + (job?.failed_rows ?? 0) + failedDelta) / (job?.total_rows ?? 1)) * 100)
            : 0,
        progress_message:
          (job?.total_rows ?? 0) > 0
            ? `Processed ${(((job?.processed_rows ?? 0) + processedDelta + (job?.failed_rows ?? 0) + failedDelta)).toLocaleString()} of ${(job?.total_rows ?? 0).toLocaleString()} rows`
            : 'Processing…',
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);
    if (updateError) {
      console.error('Failed to update job progress (fallback):', updateError);
    }
    return;
  }

  console.error('Failed to increment job progress:', error);
}

export async function completeJob(
  serviceClient: ServiceClient,
  jobId: string,
  success: boolean,
  finalErrorLog?: unknown[],
  flaggedCount?: number
): Promise<void> {
  const update: Record<string, unknown> = {
    status: success ? 'completed' : 'failed',
    updated_at: new Date().toISOString(),
    error_log: (finalErrorLog ?? []) as any,
    progress_message: success ? 'Complete' : 'Failed',
  };
  if (success) {
    update.progress_pct = 100;
    update.completed_at = new Date().toISOString();
  } else {
    update.failed_at = new Date().toISOString();
  }
  if (typeof flaggedCount === 'number') {
    update.flagged_count = flaggedCount;
  }

  // Retry with exponential backoff. A transient Supabase error here leaves the
  // job permanently stuck in 'processing', causing the UI to poll indefinitely.
  // Two-phase retry strategy:
  //   Phase 1 (fast) — 5 attempts with short delays (1s→2s→4s→8s): catches brief
  //     network hiccups.
  //   Phase 2 (patient) — 3 more attempts with 20s waits: recovers from the kind
  //     of 30–90 second Supabase 520/521 outages seen in production. Only entered
  //     when all Phase-1 failures indicate the DB is fully unreachable.
  const delays = [1000, 2000, 4000, 8000, 20000, 20000, 20000];
  let allUpstreamDown = true;
  for (let attempt = 0; attempt < delays.length; attempt++) {
    const { error } = await serviceClient
      .from('processing_jobs')
      .update(update as any)
      .eq('id', jobId);

    if (!error) return;

    const upstream = isUpstreamDown(error);
    if (!upstream) allUpstreamDown = false;
    console.error(`Failed to complete job (attempt ${attempt + 1}/${delays.length}):`, error);

    const delay = delays[attempt];
    // Only enter Phase 2 (20 s waits) when EVERY failure so far was upstream-down.
    // If any failure was a DB logic error, long waits won't help.
    if (attempt >= 4 && !allUpstreamDown) break;

    if (attempt < delays.length - 1) {
      await new Promise<void>((r) => setTimeout(r, delay));
    }
  }
}

export async function logBatchError(
  serviceClient: ServiceClient,
  jobId: string,
  orderIds: string[],
  errorMessage: string
): Promise<void> {
  const { data: job } = await serviceClient
    .from('processing_jobs')
    .select('error_log')
    .eq('id', jobId)
    .single();

  const existing: unknown[] = (job?.error_log as unknown[]) ?? [];
  const updated = [
    ...existing,
    {
      time: new Date().toISOString(),
      order_ids: orderIds,
      message: errorMessage,
    },
  ];

  const { error } = await serviceClient
    .from('processing_jobs')
    .update({ error_log: updated as any, updated_at: new Date().toISOString() })
    .eq('id', jobId);

  if (error) {
    console.error('Failed to log batch error:', error);
  }
}
