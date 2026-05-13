/* ────────────────────────────────────────────────────────────────────────────
 * 🔒 LOCKED FILE — DO NOT MODIFY WITHOUT EXPLICIT USER PERMISSION 🔒
 *
 * Server-to-server chunk worker for the CSV upload pipeline. Each invocation:
 *   1. Verifies the internal HMAC chunk token (no user auth — server-only)
 *   2. Downloads its chunk's parsed rows from Storage
 *   3. Runs processCsvJob for that chunk
 *   4. Either dispatches the next chunk OR dispatches finalisation (last chunk)
 *
 * Any change requires explicit user sign-off — see workspace memory rule
 * "Locked CSV upload pipeline".
 * ──────────────────────────────────────────────────────────────────────── */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { processCsvJob } from '@/lib/processing/worker';
import { completeJob } from '@/lib/processing/job';
import {
  downloadChunkRows,
  dispatchChunk,
  originFromRequest,
  type ChunkDispatchPayload,
} from '@/lib/processing/chunkedDispatch';
import { checkCsvUsageGuard } from '@/lib/processing/supabaseUsageGuard';
import { verifyChunkToken, INTERNAL_CHUNK_TOKEN_HEADER } from '@/lib/processing/internalAuth';
import { signChunkToken } from '@/lib/processing/internalAuth';

// Allow the full Vercel function budget for a single chunk.
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

export async function POST(request: NextRequest) {
  let body: ChunkDispatchPayload;
  try {
    body = (await request.json()) as ChunkDispatchPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Internal HMAC auth — token is bound to jobId so it can't be replayed.
  const token = request.headers.get(INTERNAL_CHUNK_TOKEN_HEADER);
  if (!verifyChunkToken(body.jobId, token)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { jobId, chunkIndex, totalChunks, merchantId, storagePath } = body;
  const log = (msg: string) =>
    console.log(`[chunk ${jobId} ${chunkIndex}/${totalChunks}] ${new Date().toISOString()} ${msg}`);

  const sc = createServiceClient();

  // Verify the job exists and merchant matches (defence in depth).
  const { data: job } = await sc
    .from('processing_jobs')
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

  try {
    log('Downloading chunk rows');
    const rows = await downloadChunkRows(sc, jobId, chunkIndex);
    log(`Downloaded ${rows.length} rows; running pipeline`);

    const isLast = chunkIndex === totalChunks - 1;
    await processCsvJob(rows, jobId, sc, 5, merchantId, {
      index: chunkIndex,
      totalChunks,
      isFirst: chunkIndex === 0,
      isLast,
    });
    log('Pipeline complete for this chunk');

    const postChunkGuard = await checkCsvUsageGuard(sc);
    if (postChunkGuard.shouldStop) {
      log(`Usage guard tripped after processing chunk: ${postChunkGuard.reason}`);
      await completeJob(sc, jobId, false, [
        { message: postChunkGuard.reason ?? 'Supabase usage guard stopped this run', code: 'SUPABASE_USAGE_GUARD' },
      ]);
      return NextResponse.json({ stopped: true, reason: postChunkGuard.reason }, { status: 429 });
    }

    if (!isLast) {
      // Hand off to the next chunk fire-and-forget, then return immediately.
      void dispatchChunk(originFromRequest(request), {
        jobId,
        chunkIndex: chunkIndex + 1,
        totalChunks,
        merchantId,
        columnMap: body.columnMap,
        storagePath,
      });
      log(`Dispatched chunk ${chunkIndex + 1} (fire-and-forget)`);
      return NextResponse.json({ ok: true, dispatched: chunkIndex + 1 });
    }

    // ── Last chunk: hand finalisation to a fresh internal worker ────────────
    log('Last chunk — dispatching finaliser');
    void dispatchFinalize(originFromRequest(request), body);
    return NextResponse.json({ ok: true, finalizerDispatched: true });
  } catch (err) {
    const message = formatError(err);
    console.error(`[chunk ${jobId} ${chunkIndex}] FAILED:`, message);
    await completeJob(sc, jobId, false, [{ message: `Chunk ${chunkIndex}/${totalChunks}: ${message}` }]);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
