import type { SupabaseClient } from '@supabase/supabase-js';
import { STORAGE_BUCKETS } from '@/lib/supabase/tables';

type CleanupJob = {
  id: string;
  bucket: string;
  object_path: string;
};

export type PrivacyStorageCleanupResult = {
  claimed: number;
  completed: number;
  failed: number;
};

const ALLOWED_BUCKETS = new Set<string>(Object.values(STORAGE_BUCKETS));

/**
 * Remove object content queued by the atomic database erasure transaction.
 * Database rows have already had their object paths redacted; this leased queue
 * makes a Storage failure visible and safely retryable.
 */
export async function processPrivacyStorageCleanup(
  client: SupabaseClient,
  options: { receiptId?: string; limit?: number } = {},
): Promise<PrivacyStorageCleanupResult> {
  const workerId = `privacy-cleanup:${crypto.randomUUID()}`;
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 500);
  const { data, error } = await client.rpc('claim_privacy_storage_cleanup_jobs', {
    p_limit: limit,
    p_worker_id: workerId,
    p_lease_seconds: 60,
    p_receipt_id: options.receiptId ?? null,
  });
  if (error) throw new Error(`privacy_storage_claim_failed: ${error.message}`);

  const jobs = (data ?? []) as CleanupJob[];
  let completed = 0;
  let failed = 0;

  for (const job of jobs) {
    let failure: string | null = null;
    if (!ALLOWED_BUCKETS.has(job.bucket) || !job.object_path.trim()) {
      failure = 'privacy_storage_target_not_allowed';
    } else {
      const removal = await client.storage.from(job.bucket).remove([job.object_path]);
      if (removal.error) failure = removal.error.message;
    }

    if (failure) {
      failed += 1;
      const { error: failError } = await client.rpc('fail_privacy_storage_cleanup_job', {
        p_job_id: job.id,
        p_worker_id: workerId,
        p_error: failure,
      });
      if (failError) throw new Error(`privacy_storage_fail_record_failed: ${failError.message}`);
      continue;
    }

    const { data: acknowledged, error: completeError } = await client.rpc(
      'complete_privacy_storage_cleanup_job',
      { p_job_id: job.id, p_worker_id: workerId },
    );
    if (completeError || acknowledged !== true) {
      throw new Error(
        `privacy_storage_completion_failed: ${completeError?.message ?? 'lease_not_owned'}`,
      );
    }
    completed += 1;
  }

  return { claimed: jobs.length, completed, failed };
}
