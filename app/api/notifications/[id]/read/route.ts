import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { markNotificationRead } from '@/lib/notifications/store';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_INBOX);
  if (denied || !ctx) return denied ?? NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  const notification = await markNotificationRead(serviceClient, ctx.merchantId, user.id, id);
  if (!notification) return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
  return NextResponse.json({ notification });
}
