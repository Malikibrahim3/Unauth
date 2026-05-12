/**
 * Dead-letter recovery endpoint.
 *
 * When Supabase goes down mid-job, the worker may have written all
 * audit_transactions successfully but failed to run the finalisation step
 * (countReviewWorthyTransactions + completeJob). The job is left stuck in
 * 'processing' status — the UI polls indefinitely.
 *
 * This endpoint allows a one-click recovery:
 *   POST /api/audit/:runId/recover
 *
 * It verifies the job is genuinely stuck (stale updated_at, all rows written),
 * then re-runs the finalisation in-process. Once the job is marked 'completed'
 * the normal UI redirect to /audit/:runId happens automatically on the next poll.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { createScopedClient } from '@/lib/supabase/scoped';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { countReviewWorthyTransactions } from '@/lib/supabase/merchantHelpers';
import { completeJob } from '@/lib/processing/job';
import { enforceRateLimit, limitFromEnv, rateLimitKey } from '@/lib/ratelimit';
import { withRequestLogging } from '@/lib/log';

// Recovery may need to run countReviewWorthyTransactions (a full table scan).
export const maxDuration = 60;

// 8 minutes — same stale threshold as the progress endpoint.
const STALE_THRESHOLD_MS = (300 + 180) * 1000;

async function POSTHandler(
  _request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;

  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_AUDIT);
  if (denied) return denied;

  const limited = await enforceRateLimit(
    rateLimitKey('audit', 'recover', ctx.merchantId),
    limitFromEnv('RL_AUDIT_RECOVER_PER_MINUTE', 5, 60, 'RL_AUDIT_RECOVER_WINDOW_SECONDS')
  );
  if (limited) return limited;

  const scopedClient = createScopedClient(ctx.merchantId, serviceClient);

  const { data: job, error } = await scopedClient
    .from('processing_jobs')
    .select('status, total_rows, processed_rows, failed_rows, merchant_id, updated_at')
    .eq('id', runId)
    .single();

  if (error || !job) {
    return NextResponse.json({ error: 'Audit run not found' }, { status: 404 });
  }

  // Only allow recovery for genuinely stuck jobs.
  if (job.status === 'completed') {
    return NextResponse.json({ error: 'Job already completed' }, { status: 409 });
  }
  if (job.status === 'failed') {
    return NextResponse.json({ error: 'Job already marked failed — please re-upload' }, { status: 409 });
  }

  const isStuck =
    (job.status === 'processing' || job.status === 'pending') &&
    job.updated_at != null &&
    Date.now() - new Date(job.updated_at).getTime() > STALE_THRESHOLD_MS;

  if (!isStuck) {
    return NextResponse.json(
      { error: 'Job is still running — recovery not needed yet' },
      { status: 409 }
    );
  }

  const rowsDone = (job.processed_rows ?? 0) + (job.failed_rows ?? 0);
  const allRowsWritten = job.total_rows > 0 && rowsDone >= job.total_rows;

  if (!allRowsWritten) {
    // Data was partially or fully lost — recovery can't reconstruct it.
    // Mark the job as failed so the user knows to re-upload.
    await completeJob(serviceClient, runId, false, [{
      message: `Recovery failed: only ${rowsDone}/${job.total_rows} rows were written. Please re-upload.`,
    }]);
    return NextResponse.json(
      { recovered: false, reason: 'Rows incomplete — job marked failed, please re-upload.' },
      { status: 200 }
    );
  }

  // All rows are written — just need to calculate flagged_count and finalise.
  let flaggedCount = 0;
  try {
    flaggedCount = await countReviewWorthyTransactions(serviceClient, runId, ctx.merchantId);
  } catch (err) {
    console.error('[recover] countReviewWorthyTransactions failed (non-fatal):', err);
    // Proceed with flaggedCount=0 — better to have the job complete than stay stuck.
  }

  await completeJob(serviceClient, runId, true, undefined, flaggedCount);

  console.log(`[recover] Job ${runId} finalised: flaggedCount=${flaggedCount}`);
  return NextResponse.json({ recovered: true, flaggedCount });
}

export const POST = withRequestLogging('/api/audit/[runId]/recover', POSTHandler);
