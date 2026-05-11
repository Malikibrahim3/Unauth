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
    .select('status, total_rows, processed_rows, failed_rows, error_log, has_ground_truth, merchant_id')
    .eq('id', runId)
    .single();

  // Verify job belongs to the requesting merchant
  if (error || !job) {
    return NextResponse.json({ error: 'Audit run not found' }, { status: 404 });
  }

  // Count flagged transactions only when the job is done, and use 'planned'
  // (Postgres planner estimate) to avoid locking during concurrent inserts.
  // During processing we return 0 — the UI shows progress %, not a live count.
  let flaggedCount = 0;
  if (job.status === 'completed') {
    const { count } = await serviceClient
      .from('audit_transactions')
      .select('*', { count: 'planned', head: true })
      .eq('job_id', runId)
      .not('identity_confidence_grade', 'is', null);
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

  return NextResponse.json({
    runId,
    status: statusMap[job.status] ?? job.status,
    progressPercent,
    currentStage:
      job.status === 'completed'
        ? 'Complete'
        : job.status === 'failed'
        ? 'Failed'
        : 'Processing…',
    rowCount: job.total_rows,
    flaggedCount,
    hasGroundTruth: job.has_ground_truth ?? false,
    errorMessage: firstError,
  });
}

export const GET = withRequestLogging('/api/audit/[runId]/progress', GETHandler);
