import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { streamParseCsv, MAX_ROWS } from '@/lib/processing/streamParser';
import { createJob, updateJobTotalRows, completeJob } from '@/lib/processing/job';
import { processCsvJob } from '@/lib/processing/worker';
import type { ParsedCsvRow } from '@/lib/processing/types';

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const serviceClient = createServiceClient();

  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: `File exceeds the 50 MB limit (${(file.size / 1024 / 1024).toFixed(1)} MB)` },
      { status: 400 }
    );
  }

  // Create job record immediately so the client gets a runId
  let jobId: string;
  let merchantId: string;
  try {
    // Get merchant_id from auth
    const { data: { user } } = await serviceClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    merchantId = user.id;
    jobId = await createJob(serviceClient, merchantId, file.name);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create job' },
      { status: 500 }
    );
  }

  // Stream-parse the CSV — do NOT load the entire file into a single buffer
  let parseResult: Awaited<ReturnType<typeof streamParseCsv>>;
  try {
    parseResult = await streamParseCsv(file);
  } catch (err) {
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

  // Fire-and-forget the processing pipeline
  // Client will poll /api/audit/{runId}/progress
  processJobInBackground(jobId, parseResult.rows, parseResult.hasGroundTruth, serviceClient, merchantId);

  return NextResponse.json({
    runId: jobId,
    status: 'processing',
    rowCount: parseResult.rowCount,
  });
}

async function processJobInBackground(
  jobId: string,
  rows: ParsedCsvRow[],
  hasGroundTruth: boolean,
  serviceClient: ReturnType<typeof createServiceClient>,
  merchantId?: string
) {
  try {
    const scored = await processCsvJob(rows, jobId, serviceClient, 5, merchantId);
    const flaggedCount = scored.filter((s) => s.flagged).length;
    await completeJob(serviceClient, jobId, true, undefined, flaggedCount);
  } catch (err) {
    console.error('Background processing error:', err);
    const message = err instanceof Error ? err.message : String(err);
    await completeJob(serviceClient, jobId, false, [{ message }]);
  }
}
