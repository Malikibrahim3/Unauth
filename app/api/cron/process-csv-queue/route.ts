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

type PendingChunkRow = {
  job_id: string;
  merchant_id: string;
  total_chunks: number;
  storage_path: string;
  column_map: unknown;
  chunk_index: number;
};

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
  const seenJobs = new Set<string>();
  const uniqueRows = ((pendingJobs ?? []) as PendingChunkRow[]).filter((row) => {
    const jobId = row.job_id as string;
    if (seenJobs.has(jobId)) return false;
    seenJobs.add(jobId);
    return true;
  });

  const dispatched = (
    await Promise.all(
      uniqueRows.map(async (row) => {
        const jobId = row.job_id as string;
        const nextIndex = await nextPendingChunkIndex(sc, jobId);
        if (nextIndex === null) return null;

        await dispatchChunk(origin, {
          jobId,
          chunkIndex: nextIndex,
          totalChunks: row.total_chunks as number,
          merchantId: row.merchant_id as string,
          storagePath: row.storage_path as string,
          columnMap: (row.column_map as Record<string, string> | null) ?? null,
        });
        return { jobId, chunkIndex: nextIndex };
      })
    )
  ).filter((entry): entry is { jobId: string; chunkIndex: number } => entry !== null);

  return NextResponse.json({ ok: true, dispatched });
}
