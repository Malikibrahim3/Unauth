/* ────────────────────────────────────────────────────────────────────────────
 * 🔒 LOCKED FILE — DO NOT MODIFY WITHOUT EXPLICIT USER PERMISSION 🔒
 *
 * Polling endpoint for UploadClient.tsx. Response shape MUST remain stable
 * (status, progressPercent, rowCount, errorMessage). Renaming fields will
 * silently break upload progress. Any change requires explicit user sign-off
 * — see workspace memory rule "Locked CSV upload pipeline".
 * ──────────────────────────────────────────────────────────────────────── */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { createScopedClient } from '@/lib/supabase/scoped';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { enforceRateLimit, limitFromEnv, rateLimitKey } from '@/lib/ratelimit';
import { withRequestLogging } from '@/lib/log';

async function GETHandler(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const resolvedParams = await params;
  // Auth check
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_AUDIT);
  if (denied) return denied;
  const scopedClient = createScopedClient(ctx.merchantId, serviceClient);

  const limited = await enforceRateLimit(
    rateLimitKey('audit', 'progress', ctx.merchantId),
    limitFromEnv('RL_AUDIT_PROGRESS_PER_MINUTE', 120, 60, 'RL_AUDIT_PROGRESS_WINDOW_SECONDS')
  );
  if (limited) return limited;

  const { runId } = resolvedParams;

  const { data: job, error } = await scopedClient
    .from('processing_jobs')
    .select('status, total_rows, processed_rows, failed_rows, error_log, has_ground_truth, merchant_id, updated_at')
    .eq('id', runId)
    .single();

  // Verify job belongs to the requesting merchant
  if (error || !job) {
    return NextResponse.json({ error: 'Audit run not found' }, { status: 404 });
  }

  // Stale-job detection: if a job has been in processing/pending state without
  // any DB update for longer than the maximum function budget (300 s) + 3 min
  // buffer, the worker crashed or Supabase went down mid-job. Surface this as
  // a failure so the UI doesn't poll indefinitely.
  const STALE_THRESHOLD_MS = (300 + 180) * 1000; // 8 minutes
  const isStuck =
    (job.status === 'processing' || job.status === 'pending') &&
    job.updated_at != null &&
    Date.now() - new Date(job.updated_at).getTime() > STALE_THRESHOLD_MS;

  // Recovery is possible when ALL rows were written but finalization failed.
  const rowsDone = (job.processed_rows ?? 0) + (job.failed_rows ?? 0);
  const canRecover =
    isStuck && job.total_rows > 0 && rowsDone >= job.total_rows;

  // Count flagged transactions only when the job is done, and use 'planned'
  // (Postgres planner estimate) to avoid locking during concurrent inserts.
  // During processing we return 0 — the UI shows progress %, not a live count.
  let flaggedCount = 0;
  if (job.status === 'completed') {
    const { count } = await serviceClient
      .from('audit_transactions')
      .select('*', { count: 'planned', head: true })
      .eq('job_id', runId)
      .or('identity_confidence_grade.in.(probable,definite),match_status.in.(probable,definite)')
      .not('dismissed_by_merchant', 'is', true);
    flaggedCount = count ?? 0;
  }

  const progressPercent =
    job.total_rows > 0
      ? Math.round(((job.processed_rows + job.failed_rows) / job.total_rows) * 100)
      : 0;

  const statusMap: Record<string, string> = {
    pending: 'processing',
    processing: 'processing',
    completed: 'complete',
    failed: 'failed',
  };

  const firstError =
    Array.isArray(job.error_log) && job.error_log.length > 0
      ? (job.error_log[0] as { message?: string }).message ?? 'Processing failed'
      : undefined;

  // Override status when job is stale — emit failure so UI stops polling.
  const effectiveStatus = isStuck ? 'failed' : (statusMap[job.status] ?? job.status);
  const effectiveError = isStuck
    ? (canRecover
        ? 'DB unavailable during finalisation — all rows are written and can be recovered.'
        : 'Job timed out — the processing server became unavailable. Please re-upload.')
    : firstError;

  return NextResponse.json({
    runId,
    status: effectiveStatus,
    progressPercent,
    currentStage:
      job.status === 'completed'
        ? 'Complete'
        : isStuck || job.status === 'failed'
        ? 'Failed'
        : 'Processing…',
    rowCount: job.total_rows,
    flaggedCount,
    hasGroundTruth: job.has_ground_truth ?? false,
    errorMessage: effectiveError,
    canRecover,
  });
}

export const GET = withRequestLogging('/api/audit/[runId]/progress', GETHandler);
