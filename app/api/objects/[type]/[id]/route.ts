import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { getObjectSummary, isConnectedObjectType } from '@/lib/relationships/objectSummary';

export async function GET(_: Request, { params }: { params: Promise<{type:string;id:string}> }) {
  const client = createClient(); const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  const svc = createServiceClient(); const { denied, ctx } = await requirePermission(svc, user.id, PERMISSIONS.VIEW_CUSTOMERS);
  if (denied) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { type, id } = await params;
  if (!isConnectedObjectType(type)) return NextResponse.json({ error: 'Unsupported object type' }, { status: 400 });
  const object = await getObjectSummary(svc as any, ctx.merchantId, type, id);
  return object ? NextResponse.json({ version: 1, object }) : NextResponse.json({ error: 'Not found' }, { status: 404 });
}
