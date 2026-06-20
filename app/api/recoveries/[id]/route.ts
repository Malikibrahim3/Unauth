import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { getRecoveryCase } from '@/lib/recoveries/store';
import { TABLES } from '@/lib/supabase/tables';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_INBOX);
  if (denied) return denied;

  const { id } = await params;
  const recoveryCase = await getRecoveryCase(serviceClient, ctx.merchantId, id);
  if (!recoveryCase) return NextResponse.json({ error: 'Recovery case not found' }, { status: 404 });

  const { data: events } = await serviceClient
    .from(TABLES.RECOVERY_CASE_EVENTS)
    .select('*')
    .eq('merchant_id', ctx.merchantId)
    .eq('recovery_case_id', id)
    .order('created_at', { ascending: false });

  return NextResponse.json({ recoveryCase, events: events ?? [] });
}

export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_INBOX);
  if (denied) return denied;

  const { id } = await params;
  const recoveryCase = await getRecoveryCase(serviceClient, ctx.merchantId, id);
  if (!recoveryCase) return NextResponse.json({ error: 'Recovery case not found' }, { status: 404 });

  return NextResponse.json({
    error: 'Manual recovery status updates are disabled. Statuses sync from connected source events and matched correspondence.',
    unavailableBecause: 'automation_setting_disabled',
  }, { status: 405 });
}
