import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { logAction } from '@/lib/permissions/audit';
import { writeActivityLog } from '@/lib/customers/activityLog';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_CUSTOMERS);
  if (denied) return denied;

  const { data, error } = await serviceClient
    .from('customer_notes')
    .select('*')
    .eq('merchant_id', ctx.merchantId)
    .eq('customer_profile_id', params.id)
    .eq('deleted_by_merchant', false)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ notes: data });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';

  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.ADD_CUSTOMER_NOTE);
  if (denied) return denied;

  const { body } = await req.json();
  if (!body?.trim()) return NextResponse.json({ error: 'Note body is required' }, { status: 400 });
  if (body.length > 2000) return NextResponse.json({ error: 'Note must be 2000 characters or fewer' }, { status: 400 });

  const { data, error } = await serviceClient
    .from('customer_notes')
    .insert({ merchant_id: ctx.merchantId, customer_profile_id: params.id, body })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  logAction({
    ctx,
    action: 'add_customer_note',
    resourceType: 'customer_profile',
    resourceId: params.id,
    metadata: { noteId: (data as any).id },
    ip,
  });

  await writeActivityLog({
    supabase: serviceClient,
    profileId: params.id,
    merchantId: ctx.merchantId,
    eventType: 'note_added',
    eventData: { note_preview: body.slice(0, 80) },
  });

  return NextResponse.json({ note: data });
}
