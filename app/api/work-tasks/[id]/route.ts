import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { normalizeApiIdempotencyKey } from '@/lib/api/v1/ingest/requestIdempotency';

const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('assign_to_me'), expectedVersion: z.number().int().positive() }),
  z.object({ action: z.literal('release'), expectedVersion: z.number().int().positive() }),
  z.object({ action: z.literal('start'), expectedVersion: z.number().int().positive() }),
  z.object({ action: z.literal('complete'), expectedVersion: z.number().int().positive(), outcome: z.string().trim().max(1000).optional() }),
  z.object({ action: z.literal('reopen'), expectedVersion: z.number().int().positive() }),
  z.object({ action: z.literal('snooze'), expectedVersion: z.number().int().positive(), until: z.string().datetime() }),
]);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = createClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const service = createServiceClient();
  const { denied, ctx } = await requirePermission(
    service,
    user.id,
    PERMISSIONS.MANAGE_WORK,
  );
  if (denied) return denied;

  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid task action' }, { status: 400 });

  const idempotencyKey = normalizeApiIdempotencyKey(request.headers.get('idempotency-key'));
  if (!idempotencyKey || idempotencyKey.length < 8) {
    return NextResponse.json({ error: 'A valid Idempotency-Key header is required.' }, { status: 400 });
  }

  const { id } = await params;
  if (parsed.data.action === 'snooze' && new Date(parsed.data.until).getTime() <= Date.now()) {
    return NextResponse.json({ error: 'Snooze time must be in the future' }, { status: 400 });
  }

  const { data, error } = await service.rpc('transition_work_task_v1', {
    p_merchant_id: ctx.merchantId,
    p_task_id: id,
    p_actor_user_id: user.id,
    p_action: parsed.data.action,
    p_expected_version: parsed.data.expectedVersion,
    p_idempotency_key: idempotencyKey,
    p_until: parsed.data.action === 'snooze' ? parsed.data.until : null,
    p_outcome: parsed.data.action === 'complete' ? parsed.data.outcome ?? null : null,
    p_allow_release_other: ctx.role === 'owner' || ctx.role === 'admin',
  });
  if (!error) return NextResponse.json(data);

  const message = error.message ?? '';
  if (message.includes('not_found')) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  if (message.includes('version_conflict') || message.includes('idempotency_conflict')) {
    return NextResponse.json({ error: 'This task changed. Refresh the queue before retrying.' }, { status: 409 });
  }
  if (
    message.includes('rejected')
    || message.includes('forbidden')
    || message.includes('owned_by_another')
    || message.includes('not_')
    || message.includes('must_be')
  ) {
    return NextResponse.json({ error: 'That task action is not valid in its current state.' }, { status: 409 });
  }
  if (message.includes('required') || message.includes('future') || message.includes('unsupported')) {
    return NextResponse.json({ error: 'Invalid task action' }, { status: 400 });
  }
  return NextResponse.json({ error: 'Task update failed. It is safe to retry.' }, { status: 503 });
}
