import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { resolveIdentityForSourceCustomerId } from '@/lib/customers/identityNetwork';
import { NextRequest, NextResponse } from 'next/server';
import { withRequestLogging } from '@/lib/log';

// Notes live on identity_notes (merchant_id + identity_id). The [id] param is
// a source_customers.id; we resolve the identity through the merchant's own
// signals before reading or writing.

async function GETHandler(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_CUSTOMERS);
  if (denied) return denied;

  const { customer, identityId } = await resolveIdentityForSourceCustomerId(
    serviceClient,
    ctx.merchantId,
    resolvedParams.id,
  );
  if (!customer) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!identityId) return NextResponse.json({ notes: [] });

  const { data, error } = await serviceClient
    .from('identity_notes')
    .select('id, body, created_at')
    .eq('merchant_id', ctx.merchantId)
    .eq('identity_id', identityId)
    .is('deleted_at', null)
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

  const { body } = await req.json();
  if (!body?.trim()) return NextResponse.json({ error: 'Note body is required' }, { status: 400 });
  if (body.length > 2000) return NextResponse.json({ error: 'Note must be 2000 characters or fewer' }, { status: 400 });

  const { customer, identityId } = await resolveIdentityForSourceCustomerId(
    serviceClient,
    ctx.merchantId,
    resolvedParams.id,
  );
  if (!customer) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!identityId) {
    return NextResponse.json(
      { error: 'No resolved identity for this customer yet — notes need a resolved identity.' },
      { status: 409 },
    );
  }

  const mutationClient = createServiceClient({
    audit: { actorId: ctx.userId, actorRole: ctx.role, requestIp: ip },
  });
  const { data, error } = await mutationClient
    .from('identity_notes')
    .insert({
      merchant_id: ctx.merchantId,
      identity_id: identityId,
      body,
      created_by: user.id,
    })
    .select('id, body, created_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ note: data });
}

export const GET = withRequestLogging('/api/customers/[id]/notes', GETHandler);
export const POST = withRequestLogging('/api/customers/[id]/notes', POSTHandler);
