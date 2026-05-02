import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { runId: string } }
) {
  // Auth check
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { runId } = params;

  const { data: job, error } = await serviceClient
    .from('processing_jobs')
    .select('status, total_rows, processed_rows, failed_rows, error_log, has_ground_truth, merchant_id')
    .eq('id', runId)
    .single();

  // Verify job belongs to the requesting merchant
  if (error || !job || job.merchant_id !== user.id) {
    return NextResponse.json({ error: 'Audit run not found' }, { status: 404 });
  }

  if (error || !job) {
    return NextResponse.json({ error: 'Audit run not found' }, { status: 404 });
  }

  // Count flagged transactions for completed jobs
  let flaggedCount = 0;
  if (job.status === 'completed') {
    const { count } = await serviceClient
      .from('audit_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('job_id', runId)
      .in('risk_level', ['high', 'critical']);
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
