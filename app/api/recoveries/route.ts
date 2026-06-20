import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { RECOVERY_CASE_STATUSES } from '@/lib/recoveries/types';
import { listRecoveryCases } from '@/lib/recoveries/store';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_INBOX);
  if (denied) return denied;

  const sp = request.nextUrl.searchParams;
  const statusParam = sp.get('status');
  const status = (RECOVERY_CASE_STATUSES as readonly string[]).includes(statusParam ?? '')
    ? (statusParam as (typeof RECOVERY_CASE_STATUSES)[number])
    : undefined;

  const recoveries = await listRecoveryCases(serviceClient, ctx.merchantId, {
    status,
    supportPayoutCaseId: sp.get('supportPayoutCaseId') ?? undefined,
    partnerId: sp.get('partnerId') ?? undefined,
  });
  return NextResponse.json({ recoveries });
}

/**
 * Recovery/loss cases are automation-created from source-backed case events.
 * This endpoint remains as a compatibility guard so old clients receive a clear
 * answer instead of silently creating manual operational facts.
 */
export async function POST(_request: NextRequest) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_INBOX);
  if (denied) return denied;

  return NextResponse.json({
    error: 'Manual loss case creation is disabled. Cases are detected from connected source events and sync jobs.',
    unavailableBecause: 'automation_setting_disabled',
  }, { status: 405 });
}
