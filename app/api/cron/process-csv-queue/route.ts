/**
 * Recovery worker for stranded CSV chunk jobs.
 * Invoked by Vercel cron or manual ops — re-dispatches the next pending chunk per job.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { env } from '@/lib/utils/env';
import { dispatchChunk, originFromRequest } from '@/lib/processing/chunkedDispatch';
import { nextPendingChunkIndex } from '@/lib/processing/chunkQueue';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const sc = createServiceClient();
  const { data: pendingJobs, error } = await sc
    .from('processing_job_chunks')
    .select('job_id, merchant_id, total_chunks, storage_path, column_map, chunk_index')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const origin = originFromRequest(request);
  const dispatched: Array<{ jobId: string; chunkIndex: number }> = [];
  const seenJobs = new Set<string>();

  for (const row of pendingJobs ?? []) {
    const jobId = row.job_id as string;
    if (seenJobs.has(jobId)) continue;
    seenJobs.add(jobId);

    const nextIndex = await nextPendingChunkIndex(sc, jobId);
    if (nextIndex === null) continue;

    await dispatchChunk(origin, {
      jobId,
      chunkIndex: nextIndex,
      totalChunks: row.total_chunks as number,
      merchantId: row.merchant_id as string,
      storagePath: row.storage_path as string,
      columnMap: (row.column_map as Record<string, string> | null) ?? null,
    });
    dispatched.push({ jobId, chunkIndex: nextIndex });
  }

  return NextResponse.json({ ok: true, dispatched });
}
