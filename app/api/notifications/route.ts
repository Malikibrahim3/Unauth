import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import {
  listNotificationsPage,
  markAllNotificationsRead,
  NOTIFICATION_FILTERS,
  type NotificationFilter,
} from '@/lib/notifications/store';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_INBOX);
  if (denied || !ctx) return denied ?? NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const requestedFilter = request.nextUrl.searchParams.get('filter') ?? 'all';
  if (!(NOTIFICATION_FILTERS as readonly string[]).includes(requestedFilter)) {
    return NextResponse.json({ error: 'Invalid notification filter' }, { status: 400 });
  }
  const requestedLimit = Number.parseInt(request.nextUrl.searchParams.get('limit') ?? '20', 10);
  try {
    return NextResponse.json(await listNotificationsPage(serviceClient, ctx.merchantId, user.id, {
      filter: requestedFilter as NotificationFilter,
      cursor: request.nextUrl.searchParams.get('cursor'),
      limit: Number.isFinite(requestedLimit) ? requestedLimit : 20,
    }));
  } catch (error) {
    if (error instanceof Error && error.message === 'invalid_notification_cursor') {
      return NextResponse.json({ error: 'Invalid notification cursor' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Notifications could not be loaded' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_INBOX);
  if (denied || !ctx) return denied ?? NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (!body || body.action !== 'mark_all_read') return NextResponse.json({ error: 'Unsupported notification action' }, { status: 400 });
  return NextResponse.json(await markAllNotificationsRead(serviceClient, ctx.merchantId, user.id));
}
