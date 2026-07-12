import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { countOpenExceptions, listExceptions } from '@/lib/exceptions/store';

export const dynamic = 'force-dynamic';

/** GET — the merchant's exception queue (open by default). */
export async function GET(req: NextRequest) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_INBOX);
  if (denied || !ctx?.merchantId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const status = req.nextUrl.searchParams.get('status') ?? 'open';
  if (!['open', 'resolved', 'dismissed'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status filter' }, { status: 400 });
  }
  const caseId = req.nextUrl.searchParams.get('caseId') ?? undefined;
  const exceptions = await listExceptions(serviceClient, ctx.merchantId, { status, caseId });
  const openCount = await countOpenExceptions(serviceClient, ctx.merchantId);
  return NextResponse.json({ exceptions, openCount });
}
