import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { getRecoveryCase } from '@/lib/recoveries/store';
import { markRecoveryCaseChased, updateRecoveryCaseStatus } from '@/lib/recoveries/store';
import { RECOVERY_CASE_STATUSES } from '@/lib/recoveries/types';

export const dynamic = 'force-dynamic';

const actionSchema = z.object({
  action: z.enum(['ready', 'submitted', 'chased', 'approved', 'partially_approved', 'rejected', 'appealed', 'closed_unrecoverable']),
  note: z.string().trim().max(2_000).optional(),
  amountMinor: z.number().int().min(0).optional(),
  idempotencyKey: z.string().trim().min(8).max(200),
});

const actionStatus: Record<Exclude<z.infer<typeof actionSchema>['action'], 'chased'>, typeof RECOVERY_CASE_STATUSES[number]> = {
  ready: 'ready_to_submit',
  submitted: 'submitted',
  approved: 'approved',
  partially_approved: 'partially_approved',
  rejected: 'rejected',
  appealed: 'appealed',
  closed_unrecoverable: 'closed_unrecoverable',
};

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  // Write action — require the decision permission, not read-only VIEW_INBOX.
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.SUBMIT_PAYOUT_DECISIONS);
  if (denied) return denied;

  const { id } = await params;
  const recoveryCase = await getRecoveryCase(serviceClient, ctx.merchantId, id);
  if (!recoveryCase) return NextResponse.json({ error: 'Recovery case not found' }, { status: 404 });

  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid recovery action', details: parsed.error.flatten() }, { status: 400 });

  const { action, note, amountMinor, idempotencyKey } = parsed.data;
  if (!note?.trim()) {
    return NextResponse.json({ error: 'A source note is required for every recovery action.' }, { status: 400 });
  }
  if (action === 'ready' && (!recoveryCase.evidence_complete || recoveryCase.evidence_missing.length > 0)) {
    return NextResponse.json({ error: 'Required evidence must be complete before this recovery can be marked ready.' }, { status: 409 });
  }
  if (['approved', 'partially_approved'].includes(action) && amountMinor == null) {
    return NextResponse.json({
      error: 'The approved amount is required.',
    }, { status: 400 });
  }
  try {
    if (action === 'chased') {
      const updated = await markRecoveryCaseChased(serviceClient, {
        merchantId: ctx.merchantId,
        recoveryCaseId: id,
        note,
        actorUserId: user.id,
        idempotencyKey,
      });
      return NextResponse.json({ recoveryCase: updated });
    }

    const updated = await updateRecoveryCaseStatus(serviceClient, {
      merchantId: ctx.merchantId,
      recoveryCaseId: id,
      status: actionStatus[action],
      note,
      amountMinor: ['approved', 'partially_approved'].includes(action) ? amountMinor : undefined,
      actorUserId: user.id,
      idempotencyKey,
    });
    return NextResponse.json({ recoveryCase: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('idempotency_conflict') || message.includes('invalid') || message.includes('exceed')) {
      return NextResponse.json({ error: 'The recovery action conflicts with its recorded amount or retry key.' }, { status: 409 });
    }
    if (message.includes('required')) {
      return NextResponse.json({ error: 'This recovery action is missing a required reason or amount.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Could not record recovery action.' }, { status: 500 });
  }

}
