import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { getRecoveryCase } from '@/lib/recoveries/store';
import { markRecoveryCaseChased, updateRecoveryCaseStatus } from '@/lib/recoveries/store';
import { RECOVERY_CASE_STATUSES } from '@/lib/recoveries/types';

export const dynamic = 'force-dynamic';

const actionSchema = z.object({
  action: z.enum(['ready', 'submitted', 'chased', 'approved', 'rejected', 'paid', 'closed_unrecoverable']),
  note: z.string().trim().max(2_000).optional(),
  amountRecovered: z.number().finite().min(0).optional(),
  idempotencyKey: z.string().trim().min(8).max(200),
});

const actionStatus: Record<Exclude<z.infer<typeof actionSchema>['action'], 'chased'>, typeof RECOVERY_CASE_STATUSES[number]> = {
  ready: 'ready_to_submit',
  submitted: 'submitted',
  approved: 'approved',
  rejected: 'rejected',
  paid: 'paid',
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

  const { action, note, amountRecovered, idempotencyKey } = parsed.data;
  if (action === 'chased') {
    const updated = await markRecoveryCaseChased(serviceClient, { merchantId: ctx.merchantId, recoveryCaseId: id, note, idempotencyKey });
    return NextResponse.json({ recoveryCase: updated });
  }

  const updated = await updateRecoveryCaseStatus(serviceClient, {
    merchantId: ctx.merchantId,
    recoveryCaseId: id,
    status: actionStatus[action],
    note,
    amountRecovered: action === 'paid' ? amountRecovered : undefined,
    idempotencyKey,
  });
  return NextResponse.json({ recoveryCase: updated });

}
