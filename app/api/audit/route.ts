/* ────────────────────────────────────────────────────────────────────────────
 * 🔒 LOCKED FILE — DO NOT MODIFY WITHOUT EXPLICIT USER PERMISSION 🔒
 *
 * Entry point for the chunked CSV upload pipeline. Responsibilities:
 *   1. Validate the upload (auth, size, schema, row cap).
 *   2. Stream-parse the whole CSV once.
 *   3. Stage each chunk (CHUNK_SIZE rows) as JSON in Supabase Storage at
 *      `_chunks/{jobId}/{i}.json`.
 *   4. Dispatch chunk 0 to /api/process-csv-chunk; the chain self-propagates.
 *
 * UploadClient.tsx polls /api/audit/{runId}/progress for status; do NOT
 * change the response contract of that route or the polling-progress shape
 * without coordinating both ends. Any change requires explicit user sign-off
 * — see workspace memory rule "Locked CSV upload pipeline".
 * ──────────────────────────────────────────────────────────────────────── */

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS, type CallerContext } from '@/lib/permissions';
import { logAction } from '@/lib/permissions/audit';
import { NextRequest, NextResponse } from 'next/server';
import { streamParseCsv, MAX_ROWS, CHUNK_SIZE } from '@/lib/processing/streamParser';
import { createJob, updateJobTotalRows, completeJob } from '@/lib/processing/job';
import {
  uploadChunkRows,
  dispatchChunk,
  originFromRequest,
} from '@/lib/processing/chunkedDispatch';

// 500 MB cap — enough headroom for ~5M-row CSVs at typical per-row size.
const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024;

// Allow this dispatcher up to 5 minutes — large uploads need time to parse
// and stage chunk JSONs to Storage before the chain starts.
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const reqId = Math.random().toString(36).slice(2, 8);
  const log = (msg: string, extra?: unknown) =>
    console.log(`[audit ${reqId}] ${new Date().toISOString()} ${msg}`, extra ?? '');
  log('POST /api/audit start');

  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';

    // ── Auth + permission ───────────────────────────────────────────────────
    const userClient = createClient();
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    log(`auth ok user=${user.id}`);

    const serviceClient = createServiceClient();
    const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.UPLOAD_CSV);
    if (denied) return denied;
    log(`permission ok merchant=${ctx.merchantId}`);

    return await runAudit(request, ctx, serviceClient, ip, log);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error(`[audit ${reqId}] UNCAUGHT in POST:`, message, stack);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function runAudit(
  request: NextRequest,
  ctx: CallerContext,
  serviceClient: ReturnType<typeof createServiceClient>,
  ip: string,
  log: (msg: string, extra?: unknown) => void
) {

  // ── Parse request body ────────────────────────────────────────────────────
  let filePath: string;
  let columnMap: Record<string, string> | null = null;
  let uploadLabel: string | undefined;
  let dateRangeStart: string | undefined;
  let dateRangeEnd: string | undefined;
  let uploadType: 'standard' | 'historical' | 'investigation' = 'standard';
  try {
    const body = await request.json();
    filePath = body.filePath;
    columnMap = body.columnMap ?? null;
    uploadLabel = body.label ?? undefined;
    dateRangeStart = body.dateRangeStart ?? undefined;
    dateRangeEnd = body.dateRangeEnd ?? undefined;
    if (body.uploadType === 'historical' || body.uploadType === 'investigation') {
      uploadType = body.uploadType;
    }
    if (!filePath) throw new Error('filePath is required');
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Invalid request body' },
      { status: 400 }
    );
  }

  // ── Download from Storage ─────────────────────────────────────────────────
  log(`downloading from storage path=${filePath}`);
  const { data: fileData, error: downloadError } = await serviceClient.storage
    .from('merchant-csv-uploads-2')
    .download(filePath);

  if (downloadError || !fileData) {
    log(`storage download FAILED: ${downloadError?.message ?? 'no data'}`);
    return NextResponse.json(
      { error: downloadError?.message ?? 'Failed to download file from storage' },
      { status: 500 }
    );
  }
  log(`download ok size=${fileData.size}`);

  const fileName = filePath.split('/').pop() ?? 'upload.csv';
  const file = new File([fileData], fileName, { type: 'text/csv' });

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: `File exceeds the 50 MB limit (${(file.size / 1024 / 1024).toFixed(1)} MB)` },
      { status: 400 }
    );
  }

  // ── Create job record ─────────────────────────────────────────────────────
  let jobId: string;
  const merchantId = ctx.merchantId;
  try {
    jobId = await createJob(serviceClient, merchantId, {
      filename: file.name,
      label: uploadLabel,
      dateRangeStart,
      dateRangeEnd,
      uploadType,
    });
    log(`createJob ok jobId=${jobId}`);
  } catch (err) {
    log(`createJob FAILED: ${err instanceof Error ? err.message : String(err)}`);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create job' },
      { status: 500 }
    );
  }

  // Stream-parse the CSV — do NOT load the entire file into a single buffer
  let parseResult: Awaited<ReturnType<typeof streamParseCsv>>;
  try {
    parseResult = await streamParseCsv(file, columnMap);
    log(`parse ok rows=${parseResult.rowCount}`);
  } catch (err) {
    log(`parse FAILED: ${err instanceof Error ? err.message : String(err)}`);
    const message = err instanceof Error ? err.message : 'CSV parse failed';
    await completeJob(serviceClient, jobId, false, [{ message }]);
    return NextResponse.json({ error: message }, { status: 422 });
  }

  if (!parseResult.valid) {
    await completeJob(serviceClient, jobId, false, [
      { message: `Missing required columns: ${parseResult.missingRequired.join(', ')}` },
    ]);
    return NextResponse.json(
      { error: 'CSV validation failed', details: { missingRequired: parseResult.missingRequired } },
      { status: 422 }
    );
  }

  if (parseResult.rowCount > MAX_ROWS) {
    await completeJob(serviceClient, jobId, false, [
      { message: `Row count ${parseResult.rowCount} exceeds limit of ${MAX_ROWS}` },
    ]);
    return NextResponse.json({ error: `Row count exceeds limit of ${MAX_ROWS}` }, { status: 422 });
  }

  // Update job with row count and start processing
  await updateJobTotalRows(serviceClient, jobId, parseResult.rowCount);

  // ── Audit log ─────────────────────────────────────────────────────────────
  logAction({
    ctx,
    action: 'upload_csv',
    resourceType: 'processing_job',
    resourceId: jobId,
    metadata: { filename: fileName, rowCount: parseResult.rowCount },
    ip,
  });

  // ── Chunk rows and stage them in Storage ──────────────────────────────────
  // Splitting up front means the chunk worker can run on independent Vercel
  // function invocations and each gets its own 300s budget, scaling to
  // millions of rows without bumping into per-request timeouts.
  const totalChunks = Math.max(1, Math.ceil(parseResult.rowCount / CHUNK_SIZE));
  log(`staging ${totalChunks} chunks of ≤${CHUNK_SIZE} rows each`);
  try {
    // Upload chunks in parallel batches of 5 to keep this dispatcher fast
    // without saturating Storage. Each chunk is ~5 MB at 25k rows.
    const PARALLEL = 5;
    let nextIndex = 0;
    const launchOne = async (i: number) => {
      const start = i * CHUNK_SIZE;
      const slice = parseResult.rows.slice(start, start + CHUNK_SIZE);
      await uploadChunkRows(serviceClient, jobId, i, slice);
    };
    const inFlight: Promise<void>[] = [];
    while (nextIndex < totalChunks || inFlight.length > 0) {
      while (inFlight.length < PARALLEL && nextIndex < totalChunks) {
        const idx = nextIndex++;
        const p = launchOne(idx).finally(() => {
          const at = inFlight.indexOf(p);
          if (at >= 0) inFlight.splice(at, 1);
        });
        inFlight.push(p);
      }
      await Promise.race(inFlight);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'chunk upload failed';
    log(`chunk staging FAILED: ${message}`);
    await completeJob(serviceClient, jobId, false, [{ message }]);
    return NextResponse.json({ error: message }, { status: 500 });
  }
  log(`chunk staging complete`);

  // ── Dispatch chunk 0 — the chain self-propagates from there ───────────────
  log(`dispatching chunk 0 origin=${originFromRequest(request)}`);
  await dispatchChunk(originFromRequest(request), {
    jobId,
    chunkIndex: 0,
    totalChunks,
    merchantId,
    columnMap,
    storagePath: filePath,
  });
  log('chunk 0 dispatched');

  return NextResponse.json({
    runId: jobId,
    status: 'processing',
    rowCount: parseResult.rowCount,
    totalChunks,
  });
}
