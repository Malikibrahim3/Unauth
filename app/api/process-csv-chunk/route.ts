/* ────────────────────────────────────────────────────────────────────────────
 * Server-to-server chunk worker for the CSV upload pipeline. Each invocation:
 *   1. Verifies the internal HMAC chunk token (no user auth — server-only)
 *   2. Claims the chunk row in processing_job_chunks (idempotent)
 *   3. Downloads its chunk's parsed rows from Storage
 *   4. Runs processCsvJob for that chunk
 *   5. Schedules the next pending chunk or finalisation via the durable queue
 * ──────────────────────────────────────────────────────────────────────── */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { TABLES } from '@/lib/supabase/tables';
import { processCsvJob } from '@/lib/processing/worker';
import { completeJob } from '@/lib/processing/job';
import {
  downloadChunkRows,
  originFromRequest,
  type ChunkDispatchPayload,
} from '@/lib/processing/chunkedDispatch';
import { checkCsvUsageGuard } from '@/lib/processing/supabaseUsageGuard';
import { verifyChunkToken, INTERNAL_CHUNK_TOKEN_HEADER } from '@/lib/processing/internalAuth';
import { signChunkToken } from '@/lib/processing/internalAuth';
import {
  beginProcessingJobChunk,
  completeProcessingJobChunk,
  failProcessingJobChunk,
  scheduleFollowingChunkWork,
} from '@/lib/processing/chunkQueue';

export const maxDuration = 300;

async function dispatchFinalize(origin: string, payload: ChunkDispatchPayload): Promise<void> {
  const url = `${origin.replace(/\/$/, '')}/api/process-csv-finalize`;
  const token = signChunkToken(payload.jobId);

  try {
    await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        [INTERNAL_CHUNK_TOKEN_HEADER]: token,
      },
      body: JSON.stringify(payload),
      keepalive: true,
      cache: 'no-store',
    }).then((r) => {
      void r.body?.cancel();
    }).catch((err) => {
      console.error('[chunk] finalize dispatch fetch failed:', err);
    });
  } catch (err) {
    console.error('[chunk] finalize dispatch threw:', err);
  }
}

function formatError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (!err || typeof err !== 'object') return String(err);

  const maybe = err as Record<string, unknown>;
  const parts = [
    typeof maybe.message === 'string' ? maybe.message : null,
    typeof maybe.details === 'string' ? maybe.details : null,
    typeof maybe.hint === 'string' ? maybe.hint : null,
    typeof maybe.code === 'string' ? `code=${maybe.code}` : null,
  ].filter(Boolean) as string[];

  if (parts.length > 0) return parts.join(' | ');
  return JSON.stringify(maybe);
}

async function processChunk(
  origin: string,
  body: ChunkDispatchPayload,
): Promise<void> {
  const { jobId, chunkIndex, totalChunks, merchantId } = body;
  const log = (msg: string) =>
    console.log(`[chunk ${jobId} ${chunkIndex}/${totalChunks}] ${new Date().toISOString()} ${msg}`);
  const sc = createServiceClient();

  try {
    const { data: latestJob } = await sc
      .from(TABLES.PROCESSING_JOBS)
      .select('status')
      .eq('id', jobId)
      .single();
    if (latestJob?.status === 'completed' || latestJob?.status === 'failed') {
      log('Job already terminal — skipping background work');
      return;
    }

    const beginStatus = await beginProcessingJobChunk(sc, jobId, chunkIndex);
    if (beginStatus === 'completed') {
      log('Chunk already completed — scheduling follow-up work only');
      await scheduleFollowingChunkWork(sc, origin, body, dispatchFinalize);
      return;
    }
    if (beginStatus === 'missing') {
      log('Chunk not registered in queue — aborting');
      return;
    }

    log('Downloading chunk rows');
    const rows = await downloadChunkRows(sc, jobId, chunkIndex);
    log(`Downloaded ${rows.length} rows; running pipeline`);

    await processCsvJob(rows, jobId, sc, 5, merchantId, {
      index: chunkIndex,
      totalChunks,
      isFirst: chunkIndex === 0,
      isLast: chunkIndex === totalChunks - 1,
    });
    log('Pipeline complete for this chunk');

    const postChunkGuard = await checkCsvUsageGuard(sc);
    if (postChunkGuard.shouldStop) {
      log(`Usage guard tripped after processing chunk: ${postChunkGuard.reason}`);
      await failProcessingJobChunk(sc, jobId, chunkIndex, postChunkGuard.reason ?? 'usage guard');
      await completeJob(sc, jobId, false, [
        { message: postChunkGuard.reason ?? 'Supabase usage guard stopped this run', code: 'SUPABASE_USAGE_GUARD' },
      ]);
      return;
    }

    await completeProcessingJobChunk(sc, jobId, chunkIndex);
    log('Chunk marked completed in queue');
    await scheduleFollowingChunkWork(sc, origin, body, dispatchFinalize);
  } catch (err) {
    const message = formatError(err);
    console.error(`[chunk ${jobId} ${chunkIndex}] FAILED:`, message);
    await failProcessingJobChunk(sc, jobId, chunkIndex, message).catch(() => undefined);
    await completeJob(sc, jobId, false, [{ message: `Chunk ${chunkIndex}/${totalChunks}: ${message}` }]);
  }
}

export async function POST(request: NextRequest) {
  let body: ChunkDispatchPayload;
  try {
    body = (await request.json()) as ChunkDispatchPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const token = request.headers.get(INTERNAL_CHUNK_TOKEN_HEADER);
  if (!verifyChunkToken(body.jobId, token)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { jobId, chunkIndex, totalChunks, merchantId } = body;
  const log = (msg: string) =>
    console.log(`[chunk ${jobId} ${chunkIndex}/${totalChunks}] ${new Date().toISOString()} ${msg}`);

  const sc = createServiceClient();

  const { data: job } = await sc
    .from(TABLES.PROCESSING_JOBS)
    .select('merchant_id, status')
    .eq('id', jobId)
    .single();
  if (!job || job.merchant_id !== merchantId) {
    return NextResponse.json({ error: 'Job/merchant mismatch' }, { status: 403 });
  }
  if (job.status === 'completed' || job.status === 'failed') {
    log('Job already terminal — skipping');
    return NextResponse.json({ skipped: true });
  }

  const preflightGuard = await checkCsvUsageGuard(sc);
  if (preflightGuard.shouldStop) {
    log(`Usage guard tripped before processing: ${preflightGuard.reason}`);
    await completeJob(sc, jobId, false, [
      { message: preflightGuard.reason ?? 'Supabase usage guard stopped this run', code: 'SUPABASE_USAGE_GUARD' },
    ]);
    return NextResponse.json({ stopped: true, reason: preflightGuard.reason }, { status: 429 });
  }

  const origin = originFromRequest(request);
  void processChunk(origin, body).catch((err) => {
    console.error(`[chunk ${jobId} ${chunkIndex}] unhandled async failure:`, formatError(err));
  });

  return NextResponse.json({ accepted: true, chunkIndex, totalChunks }, { status: 202 });
}
