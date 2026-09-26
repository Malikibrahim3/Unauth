import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { listNotifications } from '@/lib/notifications/store';
import { renderDigestPreview } from '@/lib/notifications/digest';

export const dynamic = 'force-dynamic';

export async function GET() {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_INBOX);
  if (denied || !ctx) return denied ?? NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    const items = await listNotifications(serviceClient, ctx.merchantId, user.id, { limit: 50 });
    return NextResponse.json({ preview: renderDigestPreview(items), deliveryEnabled: false, writesPerformed: 0 });
  } catch {
    return NextResponse.json({ error: 'Digest preview unavailable', deliveryEnabled: false, writesPerformed: 0 }, { status: 503 });
  }
}
