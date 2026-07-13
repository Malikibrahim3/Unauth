import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { createScopedClient } from '@/lib/supabase/scoped';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { TABLES } from '@/lib/supabase/tables';
import { recordDomainEvent } from '@/lib/events/domainEventStore';

const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('assign_to_me') }),
  z.object({ action: z.literal('release') }),
  z.object({ action: z.literal('start') }),
  z.object({ action: z.literal('complete'), outcome: z.string().trim().max(1000).optional() }),
  z.object({ action: z.literal('reopen') }),
  z.object({ action: z.literal('snooze'), until: z.string().datetime() }),
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
    PERMISSIONS.SUBMIT_PAYOUT_DECISIONS,
  );
  if (denied) return denied;

  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid task action' }, { status: 400 });

  const { id } = await params;
  const scoped = createScopedClient(ctx.merchantId, service);
  const { data: existing, error: loadError } = await scoped
    .from(TABLES.WORK_TASKS)
    .select('id,status,owner_user_id,support_payout_case_id,recovery_case_id,loss_case_id')
    .eq('id', id)
    .maybeSingle();
  if (loadError) return NextResponse.json({ error: 'Task lookup failed' }, { status: 500 });
  if (!existing) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { updated_at: now };
  switch (parsed.data.action) {
    case 'assign_to_me':
      patch.owner_user_id = user.id;
      break;
    case 'release':
      patch.owner_user_id = null;
      break;
    case 'start':
      if (!['open', 'blocked'].includes(existing.status)) {
        return NextResponse.json({ error: 'Only open or blocked tasks can be started' }, { status: 409 });
      }
      patch.status = 'in_progress';
      patch.blocking_reason = null;
      patch.owner_user_id = existing.owner_user_id ?? user.id;
      break;
    case 'complete':
      if (['completed', 'cancelled'].includes(existing.status)) {
        return NextResponse.json({ error: 'Task is already closed' }, { status: 409 });
      }
      patch.status = 'completed';
      patch.completed_at = now;
      patch.completed_by = user.id;
      patch.completion_outcome = { note: parsed.data.outcome ?? null };
      break;
    case 'reopen':
      if (existing.status !== 'completed') {
        return NextResponse.json({ error: 'Only completed tasks can be reopened' }, { status: 409 });
      }
      patch.status = 'open';
      patch.completed_at = null;
      patch.completed_by = null;
      patch.completion_outcome = null;
      break;
    case 'snooze':
      if (new Date(parsed.data.until).getTime() <= Date.now()) {
        return NextResponse.json({ error: 'Snooze time must be in the future' }, { status: 400 });
      }
      patch.due_at = parsed.data.until;
      patch.status = 'open';
      break;
  }

  const { data: updated, error: updateError } = await scoped
    .from(TABLES.WORK_TASKS)
    .update(patch)
    .eq('id', id)
    .select('id,status,owner_user_id,due_at,completed_at,updated_at')
    .single();
  if (updateError) return NextResponse.json({ error: 'Task update failed' }, { status: 500 });

  await recordDomainEvent(service, {
    merchantId: ctx.merchantId,
    eventType: `work_task.${parsed.data.action}`,
    aggregateType: 'work_task',
    aggregateId: id,
    idempotencyKey: `work-task:${id}:${parsed.data.action}:${now}`,
    payload: {
      task_id: id,
      from_status: existing.status,
      to_status: updated.status,
      support_payout_case_id: existing.support_payout_case_id,
      recovery_case_id: existing.recovery_case_id,
      loss_case_id: existing.loss_case_id,
    },
    actorType: 'user',
    actorId: user.id,
  });

  return NextResponse.json({ task: updated });
}
