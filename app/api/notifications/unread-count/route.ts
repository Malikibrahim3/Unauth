import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { TABLES } from '@/lib/supabase/tables';

export async function GET() {
  const auth = createClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ unreadCount: 0 }, { status: 401 });

  const service = createServiceClient();
  const { denied, ctx } = await requirePermission(
    service,
    user.id,
    PERMISSIONS.VIEW_INBOX,
  );
  if (denied || !ctx) return NextResponse.json({ unreadCount: 0 });

  const { count } = await service
    .from(TABLES.NOTIFICATIONS)
    .select('id', { count: 'exact', head: true })
    .eq('merchant_id', ctx.merchantId)
    .eq('recipient_user_id', user.id)
    .is('read_at', null);

  return NextResponse.json(
    { unreadCount: count ?? 0 },
    { headers: { 'Cache-Control': 'private, max-age=15, stale-while-revalidate=45' } },
  );
}
