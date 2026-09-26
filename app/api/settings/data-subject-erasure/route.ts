import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { withRequestLogging } from '@/lib/log';
import { TABLES } from '@/lib/supabase/tables';

const bodySchema = z.object({
  subjectId: z.string().uuid(),
  idempotencyKey: z.string().trim().min(8).max(200),
  confirm: z.literal('ERASE'),
});

const statusQuerySchema = z.object({
  subjectId: z.string().uuid().optional(),
  receiptId: z.string().uuid().optional(),
}).refine((value) => Boolean(value.subjectId || value.receiptId), {
  message: 'A subject ID or erasure receipt ID is required.',
});

async function POSTHandler(request: NextRequest) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const service = createServiceClient();
  const { denied } = await requirePermission(service, user.id, PERMISSIONS.BULK_DELETE);
  if (denied) return denied;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'A valid customer ID, idempotency key, and ERASE confirmation are required.' },
      { status: 400 },
    );
  }

  // No reviewed, versioned erasure preview is implemented. Typed confirmation
  // alone cannot establish its scope. Existing receipt reads and cleanup stay available.
  return NextResponse.json({
    error: 'Customer erasure is unavailable until a verified scope preview can be reviewed. Download subject access data or inspect an existing receipt instead.',
    code: 'erasure_preview_unavailable',
  }, { status: 409 });

}

export const POST = withRequestLogging('/api/settings/data-subject-erasure', POSTHandler);

/**
 * Read the durable, merchant-scoped erasure receipt and the retryable Storage
 * queue without exposing object paths or treating an unavailable backup-cycle
 * signal as completed. This is intentionally read-only (`writesPerformed: 0`).
 */
async function GETHandler(request: NextRequest) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const service = createServiceClient();
  const { denied, ctx } = await requirePermission(service, user.id, PERMISSIONS.BULK_DELETE);
  if (denied) return denied;

  const parsed = statusQuerySchema.safeParse({
    subjectId: request.nextUrl.searchParams.get('subjectId') ?? undefined,
    receiptId: request.nextUrl.searchParams.get('receiptId') ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: 'A valid subject ID or erasure receipt ID is required.' }, { status: 400 });
  }

  const receiptQuery = service
    .from(TABLES.DATA_SUBJECT_ERASURE_RECEIPTS)
    .select('id,subject_reference,merchant_customer_reference,scope_counts,effective_at,recorded_at,meaning')
    .eq('merchant_id', ctx.merchantId);
  const receiptResult = parsed.data.receiptId
    ? await receiptQuery.eq('id', parsed.data.receiptId).maybeSingle()
    : await receiptQuery.eq('subject_reference', parsed.data.subjectId!).order('recorded_at', { ascending: false }).limit(1).maybeSingle();
  if (receiptResult.error) {
    return NextResponse.json({ error: 'Erasure status could not be read.' }, { status: 500 });
  }
  if (!receiptResult.data) {
    return NextResponse.json({ error: 'No erasure receipt was found in this workspace.' }, { status: 404 });
  }

  const { data: jobs, error: jobsError } = await service
    .from(TABLES.PRIVACY_STORAGE_CLEANUP_JOBS)
    .select('id,status,attempts,max_attempts,next_attempt_at,completed_at,last_error,created_at,updated_at')
    .eq('merchant_id', ctx.merchantId)
    .eq('erasure_receipt_id', receiptResult.data.id)
    .order('created_at', { ascending: true });
  if (jobsError) {
    return NextResponse.json({ error: 'Erasure cleanup status could not be read.' }, { status: 500 });
  }

  const counts = { pending: 0, processing: 0, failed: 0, completed: 0, deadLetter: 0, unknown: 0 };
  let nextAttemptAt: string | null = null;
  let lastError: string | null = null;
  for (const job of jobs ?? []) {
    if (job.status === 'pending') counts.pending += 1;
    else if (job.status === 'processing') counts.processing += 1;
    else if (job.status === 'failed') counts.failed += 1;
    else if (job.status === 'completed') counts.completed += 1;
    else if (job.status === 'dead_letter') counts.deadLetter += 1;
    else counts.unknown += 1;
    if ((job.status === 'pending' || job.status === 'failed') && job.next_attempt_at && (!nextAttemptAt || job.next_attempt_at < nextAttemptAt)) {
      nextAttemptAt = job.next_attempt_at;
    }
    if (!lastError && job.last_error) lastError = job.last_error;
  }

  const storageState = counts.deadLetter > 0
    ? 'blocked'
    : counts.pending + counts.processing + counts.failed > 0
      ? 'queued'
      : 'completed';
  return NextResponse.json({
    ok: true,
    writesPerformed: 0,
    receipt: receiptResult.data,
    steps: [
      { key: 'database', state: 'completed', detail: 'Identifiers were redacted in the durable database transaction.' },
      { key: 'storage', state: storageState, detail: storageState === 'completed' ? 'Queued Storage objects have been acknowledged.' : 'Storage cleanup is retryable through the leased maintenance queue.' },
      { key: 'backupCycle', state: 'unavailable', detail: 'Backup-cycle status is not exposed by the current retention store.' },
    ],
    storageCleanup: {
      totalJobs: (jobs ?? []).length,
      counts,
      retryable: counts.pending + counts.failed > 0,
      nextAttemptAt,
      lastError,
    },
  });
}

export const GET = withRequestLogging('/api/settings/data-subject-erasure', GETHandler);
