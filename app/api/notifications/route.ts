import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { listNotifications } from '@/lib/notifications/store';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_INBOX);
  if (denied || !ctx) return denied ?? NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const notifications = await listNotifications(serviceClient, ctx.merchantId, user.id, {
    unreadOnly: request.nextUrl.searchParams.get('unread') === 'true',
  });
  return NextResponse.json({ notifications, unreadCount: notifications.filter((item: { read_at: string | null }) => !item.read_at).length });
}
