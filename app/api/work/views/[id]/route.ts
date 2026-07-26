import { NextResponse } from 'next/server';
import { getRequestServiceClient, getRequestUser, requirePagePermission } from '@/lib/auth/requestContext';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { TABLES } from '@/lib/supabase/tables';

export const dynamic = 'force-dynamic';

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  const service = getRequestServiceClient();
  const ctx = await requirePagePermission(PERMISSIONS.VIEW_INBOX);
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  const { data: view, error: readError } = await service
    .from(TABLES.WORK_SAVED_VIEWS)
    .select('id,owner_user_id')
    .eq('merchant_id', ctx.merchantId)
    .eq('id', id)
    .maybeSingle();
  if (readError) return NextResponse.json({ error: 'Unable to load saved view' }, { status: 500 });
  if (!view) return NextResponse.json({ error: 'Saved view not found' }, { status: 404 });
  const canManage = view.owner_user_id === user.id || (await hasPermission(service, ctx, PERMISSIONS.MANAGE_WORK_VIEWS));
  if (!canManage) return NextResponse.json({ error: 'Only the view owner or a workspace administrator can delete this view' }, { status: 403 });
  const { error } = await service
    .from(TABLES.WORK_SAVED_VIEWS)
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('merchant_id', ctx.merchantId)
    .eq('id', id)
    .is('deleted_at', null);
  if (error) return NextResponse.json({ error: 'Unable to delete saved view' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
