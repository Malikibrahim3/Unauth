import { createClient, createServiceClient } from '@/lib/supabase/server';
import { createScopedClient } from '@/lib/supabase/scoped';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { logAction } from '@/lib/permissions/audit';
import { writeActivityLog } from '@/lib/customers/activityLog';
import { NextRequest, NextResponse } from 'next/server';
import { withRequestLogging } from '@/lib/log';

async function GETHandler(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_CUSTOMERS);
  if (denied) return denied;
  const scopedClient = createScopedClient(ctx.merchantId, serviceClient);

  const { data, error } = await scopedClient
    .from('customer_notes')
    .select('*')
    .eq('customer_profile_id', resolvedParams.id)
    .eq('deleted_by_merchant', false)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ notes: data });
}

async function POSTHandler(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';

  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.ADD_CUSTOMER_NOTE);
  if (denied) return denied;
  const scopedClient = createScopedClient(ctx.merchantId, serviceClient);

  const { body } = await req.json();
  if (!body?.trim()) return NextResponse.json({ error: 'Note body is required' }, { status: 400 });
  if (body.length > 2000) return NextResponse.json({ error: 'Note must be 2000 characters or fewer' }, { status: 400 });

  const { data, error } = await scopedClient
    .from('customer_notes')
    .insert({ customer_profile_id: resolvedParams.id, body })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  logAction({
    ctx,
    action: 'add_customer_note',
    resourceType: 'customer_profile',
    resourceId: resolvedParams.id,
    metadata: { noteId: (data as any).id },
    ip,
  });

  await writeActivityLog({
    supabase: scopedClient,
    profileId: resolvedParams.id,
    merchantId: ctx.merchantId,
    eventType: 'note_added',
    eventData: { note_preview: body.slice(0, 80) },
  });

  return NextResponse.json({ note: data });
}

export const GET = withRequestLogging('/api/customers/[id]/notes', GETHandler);
export const POST = withRequestLogging('/api/customers/[id]/notes', POSTHandler);
