import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { getRecoveryCase } from '@/lib/recoveries/store';

export const dynamic = 'force-dynamic';

export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  return NextResponse.json({
    error: 'Manual recovery status updates are disabled. Statuses sync from connected source events and matched correspondence.',
    unavailableBecause: 'automation_setting_disabled',
  }, { status: 405 });
}
