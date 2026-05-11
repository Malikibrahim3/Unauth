import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../supabase/types';

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
    .update({ total_rows: totalRows, status: 'processing', updated_at: new Date().toISOString() })
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
      .select('processed_rows, failed_rows')
      .eq('id', jobId)
      .single();
    const { error: updateError } = await serviceClient
      .from('processing_jobs')
      .update({
        processed_rows: (job?.processed_rows ?? 0) + processedDelta,
        failed_rows: (job?.failed_rows ?? 0) + failedDelta,
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
  };
  if (success) {
    update.completed_at = new Date().toISOString();
  }
  if (typeof flaggedCount === 'number') {
    update.flagged_count = flaggedCount;
  }

  // Retry with exponential backoff. A transient Supabase error here leaves the
  // job permanently stuck in 'processing', causing the UI to poll indefinitely.
  // We try up to 5 times (delays: 1s, 2s, 4s, 8s) before giving up.
  for (let attempt = 0; attempt < 5; attempt++) {
    const { error } = await serviceClient
      .from('processing_jobs')
      .update(update as any)
      .eq('id', jobId);

    if (!error) return;

    console.error(`Failed to complete job (attempt ${attempt + 1}/5):`, error);
    if (attempt < 4) {
      await new Promise<void>((r) => setTimeout(r, 1000 * 2 ** attempt));
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
