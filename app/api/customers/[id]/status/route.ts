import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { logAction } from '@/lib/permissions/audit';
import { NextRequest, NextResponse } from 'next/server';

const VALID_STATUSES = ['new', 'under_review', 'contacted', 'resolved', 'cleared'] as const;
type InvestigationStatus = typeof VALID_STATUSES[number];

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';

  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.UPDATE_CUSTOMER_STATUS);
  if (denied) return denied;

  let body: { status: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!VALID_STATUSES.includes(body.status as InvestigationStatus)) {
    return NextResponse.json(
      { error: `status must be one of: ${VALID_STATUSES.join(', ')}` },
      { status: 400 }
    );
  }

  // Verify the customer profile belongs to this merchant
  const { data: profile } = await serviceClient
    .from('customer_profiles')
    .select('id')
    .eq('id', params.id)
    .contains('merchant_ids', JSON.stringify([ctx.merchantId]))
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { data, error } = await serviceClient
    .from('customer_profiles')
    .update({ investigation_status: body.status })
    .eq('id', params.id)
    .select('id, investigation_status')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  logAction({
    ctx,
    action: 'update_customer_status',
    resourceType: 'customer_profile',
    resourceId: params.id,
    metadata: { newStatus: body.status },
    ip,
  });

  return NextResponse.json(data);
}
