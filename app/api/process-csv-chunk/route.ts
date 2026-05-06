/* ────────────────────────────────────────────────────────────────────────────
 * 🔒 LOCKED FILE — DO NOT MODIFY WITHOUT EXPLICIT USER PERMISSION 🔒
 *
 * Server-to-server chunk worker for the CSV upload pipeline. Each invocation:
 *   1. Verifies the internal HMAC chunk token (no user auth — server-only)
 *   2. Downloads its chunk's parsed rows from Storage
 *   3. Runs processCsvJob for that chunk
 *   4. Either dispatches the next chunk OR finalises the job (last chunk)
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
  deleteChunkArtifacts,
  originFromRequest,
  CHUNK_BUCKET,
  type ChunkDispatchPayload,
} from '@/lib/processing/chunkedDispatch';
import { verifyChunkToken, INTERNAL_CHUNK_TOKEN_HEADER } from '@/lib/processing/internalAuth';
import { countReviewWorthyTransactions } from '@/lib/supabase/merchantHelpers';
import type { SupabaseClient } from '@supabase/supabase-js';

// Allow the full Vercel function budget for a single chunk.
export const maxDuration = 300;

async function checkWatchlistAppearances(
  merchantId: string,
  auditId: string,
  supabase: SupabaseClient
): Promise<void> {
  const { data: watchlisted } = await supabase
    .from('watchlist_entries')
    .select('customer_profile_id')
    .eq('merchant_id', merchantId);
  if (!watchlisted || watchlisted.length === 0) return;
  const ids = (watchlisted as { customer_profile_id: string | null }[])
    .map((w) => w.customer_profile_id)
    .filter(Boolean) as string[];
  if (ids.length === 0) return;

  const { data: appearances } = await supabase
    .from('audit_transactions')
    .select('customer_profile_id, identity_confidence_grade')
    .eq('job_id', auditId)
    .eq('merchant_id', merchantId)
    .in('customer_profile_id', ids);
  if (!appearances || appearances.length === 0) return;

  const gradeOrder: Record<string, number> = { definite: 4, probable: 3, possible: 2, weak: 1 };
  const grouped = new Map<string, { count: number; highestGrade: string }>();
  for (const row of appearances as Array<{ customer_profile_id: string; identity_confidence_grade: string }>) {
    const ex = grouped.get(row.customer_profile_id);
    const rank = gradeOrder[row.identity_confidence_grade] ?? 0;
    if (!ex) {
      grouped.set(row.customer_profile_id, { count: 1, highestGrade: row.identity_confidence_grade });
    } else {
      grouped.set(row.customer_profile_id, {
        count: ex.count + 1,
        highestGrade: rank > (gradeOrder[ex.highestGrade] ?? 0) ? row.identity_confidence_grade : ex.highestGrade,
      });
    }
  }
  const rows = Array.from(grouped.entries()).map(([profileId, d]) => ({
    merchant_id: merchantId,
    customer_profile_id: profileId,
    audit_id: auditId,
    transaction_count: d.count,
    highest_grade: d.highestGrade,
  }));
  const { error } = await supabase
    .from('watchlist_appearances')
    .upsert(rows, { onConflict: 'merchant_id,customer_profile_id,audit_id' });
  if (error) console.error('[watchlist_appearances] upsert error:', error.message);
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

    // ── Last chunk: finalise the job ─────────────────────────────────────
    log('Last chunk — finalising job');
    await checkWatchlistAppearances(merchantId, jobId, sc);

    // Compute final flagged_count using the canonical review-worthy definition:
    // identity_confidence_grade IS NOT NULL OR match_status IN ('candidate','probable','definite')
    // AND dismissed_by_merchant IS NOT TRUE — scoped to this merchant's job.
    const flaggedCount = await countReviewWorthyTransactions(sc, jobId, merchantId);

    await completeJob(sc, jobId, true, undefined, flaggedCount);

    // Best-effort cleanup of chunk JSON blobs and the original CSV.
    await deleteChunkArtifacts(sc, jobId, totalChunks);
    if (storagePath) {
      const { error: rmErr } = await sc.storage.from(CHUNK_BUCKET).remove([storagePath]);
      if (rmErr) console.warn('[chunk] CSV cleanup non-fatal error:', rmErr.message);
    }

    log('Job finalised');
    return NextResponse.json({ ok: true, finalised: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[chunk ${jobId} ${chunkIndex}] FAILED:`, message);
    await completeJob(sc, jobId, false, [{ message: `Chunk ${chunkIndex}/${totalChunks}: ${message}` }]);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
