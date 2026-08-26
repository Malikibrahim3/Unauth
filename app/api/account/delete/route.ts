import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { enforceRateLimit, limitFromEnv, rateLimitKey, getClientIp } from '@/lib/ratelimit';
import { ACTIVE_MERCHANT_COOKIE, requirePermission, PERMISSIONS } from '@/lib/permissions';
import {
  createWorkspaceDeletionJob,
  getWorkspaceDeletionJob,
  resumeWorkspaceDeletionJob,
  WorkspaceDeletionRunError,
} from '@/lib/privacy/workspaceDeletion';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type DeletionBody = {
  confirm?: string;
  idempotencyKey?: string;
  jobId?: string;
};

type DeletionJob = NonNullable<Awaited<ReturnType<typeof getWorkspaceDeletionJob>>>;

function publicJob(job: DeletionJob) {
  return {
    jobId: job.id,
    status: job.status,
    stage: job.stage,
    attempts: job.attempts,
    receiptId: job.receipt_id,
    verification: job.verification,
    completedAt: job.completed_at,
  };
}

async function authenticatedUser() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function GET(request: NextRequest) {
  const user = await authenticatedUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  const jobId = request.nextUrl.searchParams.get('jobId') ?? '';
  if (!UUID_PATTERN.test(jobId)) {
    return NextResponse.json({ error: 'A valid deletion job ID is required.' }, { status: 400 });
  }
  const service = createServiceClient();
  const job = await getWorkspaceDeletionJob(service, jobId, user.id);
  if (!job) return NextResponse.json({ error: 'Deletion job not found.' }, { status: 404 });
  return NextResponse.json(publicJob(job));
}

export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(
    rateLimitKey('account-delete', getClientIp(request.headers)),
    limitFromEnv('RL_ACCOUNT_DELETE_PER_HOUR', 6, 3600),
  );
  if (limited) return limited;

  const user = await authenticatedUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  const body = await request.json().catch(() => ({})) as DeletionBody;
  if (body.confirm !== 'DELETE') {
    return NextResponse.json({ error: 'Confirmation phrase required.' }, { status: 400 });
  }

  const service = createServiceClient();
  let job: DeletionJob;
  if (body.jobId) {
    if (!UUID_PATTERN.test(body.jobId)) {
      return NextResponse.json({ error: 'A valid deletion job ID is required.' }, { status: 400 });
    }
    const existing = await getWorkspaceDeletionJob(service, body.jobId, user.id);
    if (!existing) return NextResponse.json({ error: 'Deletion job not found.' }, { status: 404 });
    job = existing;
  } else {
    if (!body.idempotencyKey || !UUID_PATTERN.test(body.idempotencyKey)) {
      return NextResponse.json({ error: 'A valid idempotency key is required.' }, { status: 400 });
    }
    const { denied, ctx } = await requirePermission(service, user.id, PERMISSIONS.GRANT_PERMISSIONS);
    if (denied) return denied;
    if (ctx.role !== 'owner') {
      return NextResponse.json({ error: 'Only the workspace owner can delete this workspace.' }, { status: 403 });
    }
    job = await createWorkspaceDeletionJob(service, {
      merchantId: ctx.merchantId,
      actorUserId: user.id,
      idempotencyKey: body.idempotencyKey,
    });
  }

  if (job.status === 'completed') {
    const response = NextResponse.json({ ok: true, ...publicJob(job) });
    response.cookies.delete(ACTIVE_MERCHANT_COOKIE);
    return response;
  }

  try {
    const completed = await resumeWorkspaceDeletionJob(service, job);
    const response = NextResponse.json({ ok: true, ...publicJob(completed) });
    response.cookies.delete(ACTIVE_MERCHANT_COOKIE);
    return response;
  } catch (cause) {
    const failed = await getWorkspaceDeletionJob(service, job.id, user.id).catch(() => null);
    const stage = cause instanceof WorkspaceDeletionRunError ? cause.stage : failed?.stage ?? job.stage;
    console.error('[workspace-delete] resumable job failed', {
      jobId: job.id,
      stage,
      error: cause instanceof Error ? cause.message : String(cause),
    });
    return NextResponse.json({
      error: 'Workspace deletion paused before completion. No completed stage will be repeated; retry this job.',
      resumable: true,
      ...(failed ? publicJob(failed) : { jobId: job.id, status: 'failed', stage }),
    }, { status: 503 });
  }
}
