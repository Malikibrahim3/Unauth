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
  const { data: watchlisted, error: watchlistErr } = await supabase
    .from('watchlist_entries')
    .select('customer_profile_id')
    .eq('merchant_id', merchantId);
  if (watchlistErr) {
    throw new Error(`[watchlist_appearances] watchlist fetch failed: ${watchlistErr.message}`);
  }
  if (!watchlisted || watchlisted.length === 0) return;
  const ids = (watchlisted as { customer_profile_id: string | null }[])
    .map((w) => w.customer_profile_id)
    .filter(Boolean) as string[];
  if (ids.length === 0) return;

  const { data: appearances, error: appearancesErr } = await supabase
    .from('customer_profile_audit_appearances')
    .select('profile_id, transaction_id')
    .eq('audit_id', auditId)
    .in('profile_id', ids) as unknown as {
      data: Array<{ profile_id: string; transaction_id: string | null }> | null;
      error: { message: string } | null;
    };
  if (appearancesErr) {
    throw new Error(`[watchlist_appearances] appearance fetch failed: ${appearancesErr.message}`);
  }
  if (!appearances || appearances.length === 0) return;

  const txIds = Array.from(
    new Set(
      appearances
        .map((a) => a.transaction_id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    )
  );

  const txGrade = new Map<string, string | null>();
  if (txIds.length > 0) {
    const { data: txRows, error: txErr } = await supabase
      .from('audit_transactions')
      .select('id, identity_confidence_grade')
      .eq('job_id', auditId)
      .in('id', txIds) as unknown as {
        data: Array<{ id: string; identity_confidence_grade: string | null }> | null;
        error: { message: string } | null;
      };
    if (txErr) {
      throw new Error(`[watchlist_appearances] transaction-grade fetch failed: ${txErr.message}`);
    }
    for (const tx of txRows ?? []) {
      txGrade.set(tx.id, tx.identity_confidence_grade);
    }
  }

  const gradeOrder: Record<string, number> = { definite: 4, probable: 3, possible: 2, weak: 1 };
  const grouped = new Map<string, { count: number; highestGrade: string | null }>();
  for (const row of appearances) {
    const profileId = row.profile_id;
    const grade = row.transaction_id ? txGrade.get(row.transaction_id) ?? null : null;
    const ex = grouped.get(profileId);
    const rank = grade ? (gradeOrder[grade] ?? 0) : 0;
    if (!ex) {
      grouped.set(profileId, { count: 1, highestGrade: grade });
    } else {
      const existingRank = ex.highestGrade ? (gradeOrder[ex.highestGrade] ?? 0) : 0;
      grouped.set(profileId, {
        count: ex.count + 1,
        highestGrade: rank > existingRank ? grade : ex.highestGrade,
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
  if (error) throw new Error(`[watchlist_appearances] upsert failed: ${error.message}`);
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
    try {
      await checkWatchlistAppearances(merchantId, jobId, sc);
    } catch (err) {
      console.error(
        '[watchlist_appearances] non-fatal sync error:',
        err instanceof Error ? err.message : String(err)
      );
    }

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
