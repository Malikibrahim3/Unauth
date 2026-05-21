import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { createScopedClient } from '@/lib/supabase/scoped';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { dispatchChunk, originFromRequest } from '@/lib/processing/chunkedDispatch';
import { withRequestLogging } from '@/lib/log';
import { completeJob } from '@/lib/processing/job';

async function POSTHandler(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
) {
  const { runId } = await params;

  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.UPLOAD_CSV);
  if (denied) return denied;
  const scopedClient = createScopedClient(ctx.merchantId, serviceClient);

  const { data: job, error: jobError } = await scopedClient
    .from('processing_jobs')
    .select('id, status, merchant_id')
    .eq('id', runId)
    .single();
  if (jobError || !job) return NextResponse.json({ error: 'Audit run not found' }, { status: 404 });
  if (job.status === 'completed' || job.status === 'failed') {
    return NextResponse.json({ skipped: true, status: job.status });
  }

  let body: { totalChunks?: number; columnMap?: Record<string, string> | null; storagePath?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const totalChunks = Number(body.totalChunks);
  if (!Number.isInteger(totalChunks) || totalChunks < 1) {
    return NextResponse.json({ error: 'totalChunks must be a positive integer' }, { status: 400 });
  }
  if (!body.storagePath || typeof body.storagePath !== 'string') {
    return NextResponse.json({ error: 'storagePath is required' }, { status: 400 });
  }

  try {
    await dispatchChunk(originFromRequest(request), {
      jobId: runId,
      chunkIndex: 0,
      totalChunks,
      merchantId: ctx.merchantId,
      columnMap: body.columnMap ?? null,
      storagePath: body.storagePath,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await completeJob(scopedClient, runId, false, [{ message: `Failed to start processing: ${message}` }]);
    return NextResponse.json({ error: 'Failed to start processing. Please retry.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export const POST = withRequestLogging('/api/audit/[runId]/start', POSTHandler);
