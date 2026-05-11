import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { createScopedClient } from '@/lib/supabase/scoped';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { logAction } from '@/lib/permissions/audit';
import { streamParseCsv, MAX_ROWS } from '@/lib/processing/streamParser';
import { updateJobTotalRows, completeJob } from '@/lib/processing/job';
import { processCsvJob } from '@/lib/processing/worker';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createRequestLogger, withRequestLogging } from '@/lib/log';
import { captureServerException } from '@/lib/sentry';

// ---------------------------------------------------------------------------
// Watchlist appearances — called after a job completes successfully
// ---------------------------------------------------------------------------
async function checkWatchlistAppearances(
  merchantId: string,
  auditId: string,
  scopedClient: SupabaseClient
) {
  // Fetch all customer profile IDs in this merchant's watchlist
  const { data: watchlisted, error: watchlistErr } = await scopedClient
    .from('watchlist_entries')
    .select('customer_profile_id')
    .eq('merchant_id', merchantId);
  if (watchlistErr) {
    throw new Error(`[watchlist_appearances] watchlist fetch failed: ${watchlistErr.message}`);
  }

  if (!watchlisted || watchlisted.length === 0) return;

  const watchlistedIds = watchlisted
    .map((w: { customer_profile_id: string | null }) => w.customer_profile_id)
    .filter(Boolean) as string[];

  if (watchlistedIds.length === 0) return;

  // Resolve watchlist appearances via profile appearance links, then map
  // appearance.transaction_id -> audit_transactions.identity_confidence_grade.
  const { data: appearances, error: appearancesErr } = await scopedClient
    .from('customer_profile_audit_appearances')
    .select('profile_id, transaction_id')
    .eq('audit_id', auditId)
    .in('profile_id', watchlistedIds) as unknown as {
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
    const { data: txRows, error: txErr } = await scopedClient
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

  // Group by profile_id, tracking count and highest grade
  const gradeOrder: Record<string, number> = {
    definite: 4, probable: 3, possible: 2, weak: 1,
  };
  const grouped = new Map<string, { count: number; highestGrade: string | null }>();
  for (const row of appearances) {
    const profileId = row.profile_id;
    const grade = row.transaction_id ? txGrade.get(row.transaction_id) ?? null : null;
    const existing = grouped.get(profileId);
    const incomingRank = grade ? (gradeOrder[grade] ?? 0) : 0;
    if (!existing) {
      grouped.set(profileId, { count: 1, highestGrade: grade });
    } else {
      const existingRank = existing.highestGrade ? (gradeOrder[existing.highestGrade] ?? 0) : 0;
      grouped.set(profileId, {
        count: existing.count + 1,
        highestGrade: incomingRank > existingRank
          ? grade
          : existing.highestGrade,
      });
    }
  }

  // Upsert watchlist_appearances
  const rows = Array.from(grouped.entries()).map(([profileId, data]) => ({
    merchant_id: merchantId,
    customer_profile_id: profileId,
    audit_id: auditId,
    transaction_count: data.count,
    highest_grade: data.highestGrade,
  }));

  const { error } = await scopedClient
    .from('watchlist_appearances')
    .upsert(rows, { onConflict: 'merchant_id,customer_profile_id,audit_id' });

  if (error) {
    throw new Error(`[watchlist_appearances] upsert failed: ${error.message}`);
  }
}

// Allow up to 5 minutes for large CSV processing on Vercel/Next.js
export const maxDuration = 300;

async function POSTHandler(request: NextRequest) {
  const logger = createRequestLogger(request, '/api/process-csv-job');
  // Auth check — must be an authenticated merchant
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.UPLOAD_CSV);
  if (denied) return denied;
  const scopedClient = createScopedClient(ctx.merchantId, serviceClient);

  const { jobId } = await request.json();

  const routeLog = (msg: string, extra?: Record<string, unknown>) =>
    logger.info('process_csv_job.progress', { jobId, detail: msg, ...extra });

  // Verify the job belongs to this merchant before processing
  const { data: jobOwner } = await scopedClient
    .from('processing_jobs')
    .select('merchant_id')
    .eq('id', jobId)
    .single();
  if (!jobOwner) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  logAction({ ctx, action: 'upload_csv', resourceType: 'job', resourceId: jobId });

  // Step 1: Query csv_upload_queue for the specific job
  const { data: queueItem, error: queueError } = await scopedClient
    .from('csv_upload_queue')
    .select('*')
    .eq('status', 'pending')
    .eq('job_id', jobId)
    .single();

  if (queueError || !queueItem) {
    return NextResponse.json({ error: 'No pending jobs found' }, { status: 404 });
  }

  // Step 2: Immediately update to 'processing' and set started_at
  const { error: updateError } = await scopedClient
    .from('csv_upload_queue')
    .update({ status: 'processing', started_at: new Date().toISOString() })
    .eq('id', queueItem.id);

  if (updateError) {
    logger.error('process_csv_job.claim_failed', { jobId, error: updateError });
    return NextResponse.json({ error: 'Failed to claim job' }, { status: 500 });
  }

  try {
    routeLog('Claimed job; downloading file from storage');
    // Step 3: Download the file from Supabase Storage
    const { data: fileData, error: downloadError } = await serviceClient.storage
      .from('merchant-csv-uploads-2')
      .download(queueItem.storage_path);

    if (downloadError || !fileData) {
      throw new Error(`Failed to download file: ${downloadError?.message ?? 'unknown'}`);
    }

    routeLog('Download complete; starting CSV parse');

    // Step 4: Convert blob to readable stream and parse CSV.
    // Pass the merchant's confirmed column_map so custom headers are renamed
    // to canonical field names before validation and scoring.
    const file = new File([fileData], 'uploaded.csv', { type: 'text/csv' });
    const columnMap = (queueItem.column_map ?? null) as Record<string, string> | null;
    let parseResult: Awaited<ReturnType<typeof streamParseCsv>>;
    
    try {
      routeLog('Parsing CSV stream (this may take a while for large files)');
      parseResult = await streamParseCsv(file, columnMap);
      routeLog(`CSV parse complete — rows=${parseResult.rowCount}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'CSV parse failed';
      routeLog(`CSV parse failed: ${message}`);
      await completeJob(scopedClient, queueItem.job_id, false, [{ message }]);
      await scopedClient
        .from('csv_upload_queue')
        .update({ status: 'failed', completed_at: new Date().toISOString() })
        .eq('id', queueItem.id);
      throw new Error(message);
    }

    if (!parseResult.valid) {
      await completeJob(scopedClient, queueItem.job_id, false, [
        { message: `Missing required columns: ${parseResult.missingRequired.join(', ')}` },
      ]);
      await scopedClient
        .from('csv_upload_queue')
        .update({ status: 'failed', completed_at: new Date().toISOString() })
        .eq('id', queueItem.id);
      return NextResponse.json(
        { error: 'CSV validation failed', details: { missingRequired: parseResult.missingRequired } },
        { status: 422 }
      );
    }

    if (parseResult.rowCount > MAX_ROWS) {
      await completeJob(scopedClient, queueItem.job_id, false, [
        { message: `Row count ${parseResult.rowCount} exceeds limit of ${MAX_ROWS}` },
      ]);
      await scopedClient
        .from('csv_upload_queue')
        .update({ status: 'failed', completed_at: new Date().toISOString() })
        .eq('id', queueItem.id);
      return NextResponse.json({ error: `Row count exceeds limit of ${MAX_ROWS}` }, { status: 422 });
    }

    // Update job with row count and mark as processing
    await updateJobTotalRows(scopedClient, queueItem.job_id, parseResult.rowCount);
    await scopedClient
      .from('processing_jobs')
      .update({ status: 'processing' })
      .eq('id', queueItem.job_id);

    // Process the CSV using existing pipeline
    routeLog(`Starting processing pipeline for ${parseResult.rowCount} rows`);
    const procStart = Date.now();
    const scored = await processCsvJob(parseResult.rows, queueItem.job_id, serviceClient, 5, queueItem.merchant_id);
    routeLog(`Processing pipeline finished in ${Date.now() - procStart}ms`);
    const flaggedCount = scored.filter((s) => s.flagged).length;
    await completeJob(scopedClient, queueItem.job_id, true, undefined, flaggedCount);

    // Check for watchlisted customers that appeared in this audit.
    // Surface failures in logs without failing the completed ingest pipeline.
    try {
      await checkWatchlistAppearances(queueItem.merchant_id, queueItem.job_id, scopedClient);
    } catch (err) {
      logger.error('process_csv_job.watchlist_sync_failed', {
        jobId: queueItem.job_id,
        error: err,
        nonFatal: true,
      });
    }

    // Step 5: Update csv_upload_queue to 'completed'
    await scopedClient
      .from('csv_upload_queue')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', queueItem.id);

    // Step 6: Delete the file from Supabase Storage
    const { error: deleteError } = await serviceClient.storage
      .from('merchant-csv-uploads-2')
      .remove([queueItem.storage_path]);

    if (deleteError) {
      logger.error('process_csv_job.storage_cleanup_failed', { jobId: queueItem.job_id, error: deleteError, nonFatal: true });
      // Non-fatal error, log but don't fail the job
    }

    return NextResponse.json({
      success: true,
      jobId: queueItem.job_id,
      rowsProcessed: parseResult.rowCount,
    });
  } catch (err) {
    captureServerException(err, {
      requestId: request.headers.get('x-request-id'),
      merchantId: ctx.merchantId,
      route: '/api/process-csv-job',
      method: request.method,
    });
    logger.error('process_csv_job.failed', { jobId, error: err });
    const message = err instanceof Error ? err.message : String(err);
    
    // Mark job as failed
    await completeJob(scopedClient, queueItem.job_id, false, [{ message }]);
    await scopedClient
      .from('csv_upload_queue')
      .update({ status: 'failed', completed_at: new Date().toISOString() })
      .eq('id', queueItem.id);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const POST = withRequestLogging('/api/process-csv-job', POSTHandler);
