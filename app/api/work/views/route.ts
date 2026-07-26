import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getRequestServiceClient, getRequestUser, requirePagePermission } from '@/lib/auth/requestContext';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { TABLES } from '@/lib/supabase/tables';

export const dynamic = 'force-dynamic';

const viewSchema = z.object({
  name: z.string().trim().min(1).max(80),
  definition: z.record(z.unknown()).default({}),
  isShared: z.boolean().default(false),
});

export async function GET() {
  const user = await getRequestUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  const service = getRequestServiceClient();
  const ctx = await requirePagePermission(PERMISSIONS.VIEW_INBOX);
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { data, error } = await service
    .from(TABLES.WORK_SAVED_VIEWS)
    .select('id,name,definition,is_shared,owner_user_id,created_at,updated_at')
    .eq('merchant_id', ctx.merchantId)
    .is('deleted_at', null)
    .or(`owner_user_id.eq.${user.id},is_shared.eq.true`)
    .order('updated_at', { ascending: false });
  if (error) return NextResponse.json({ error: 'Unable to load saved Work views' }, { status: 500 });
  return NextResponse.json({ views: data ?? [] });
}

export async function POST(request: NextRequest) {
  const user = await getRequestUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  const service = getRequestServiceClient();
  const ctx = await requirePagePermission(PERMISSIONS.VIEW_INBOX);
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const parsed = viewSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid saved view' }, { status: 400 });
  if (parsed.data.isShared && !(await hasPermission(service, ctx, PERMISSIONS.MANAGE_WORK_VIEWS))) {
    return NextResponse.json({ error: 'Only workspace administrators can share Work views' }, { status: 403 });
  }
  const { data, error } = await service
    .from(TABLES.WORK_SAVED_VIEWS)
    .insert({
      merchant_id: ctx.merchantId,
      owner_user_id: user.id,
      name: parsed.data.name,
      definition: parsed.data.definition,
      is_shared: parsed.data.isShared,
    })
    .select('id,name,definition,is_shared,owner_user_id,created_at,updated_at')
    .single();
  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'A saved view with this name already exists' }, { status: 409 });
    return NextResponse.json({ error: 'Unable to save Work view' }, { status: 500 });
  }
  return NextResponse.json({ view: data }, { status: 201 });
}
