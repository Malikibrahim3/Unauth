import { createClient, createServiceClient } from '@/lib/supabase/server';
import { TABLES } from '@/lib/supabase/tables';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { logAction } from '@/lib/permissions/audit';
import { fetchMerchantScopedCustomerProfile } from '@/lib/supabase/merchantHelpers';
import { NextRequest, NextResponse } from 'next/server';
import { withRequestLogging } from '@/lib/log';

const VALID_STATUSES = ['new', 'under_review', 'contacted', 'resolved', 'cleared'] as const;
type InvestigationStatus = typeof VALID_STATUSES[number];

async function PATCHHandler(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
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

  // Verify the customer profile belongs to this merchant.
  // `identities` is a network-level table with NO merchant_id column, so we
  // cannot rely on the scoped client to isolate it — ownership must be proven
  // by confirming this merchant has emitted an identity signal for one of the
  // identity's member hashes. Without this, any authenticated user could mutate
  // another tenant's identity by guessing its id.
  const profile = await fetchMerchantScopedCustomerProfile(
    serviceClient,
    ctx.merchantId,
    resolvedParams.id,
  );

  if (!profile) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { data, error } = await serviceClient
    .from(TABLES.MERCHANT_IDENTITY_STATE)
    .upsert({
      merchant_id: ctx.merchantId,
      identity_id: resolvedParams.id,
      investigation_status: body.status,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'merchant_id,identity_id' })
    .select('identity_id, investigation_status')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  logAction({
    ctx,
    action: 'update_customer_status',
    resourceType: 'customer_profile',
    resourceId: resolvedParams.id,
    metadata: { newStatus: body.status },
    ip,
  });

  return NextResponse.json({
    id: data.identity_id,
    investigation_status: data.investigation_status,
  });
}

export const PATCH = withRequestLogging('/api/customers/[id]/status', PATCHHandler);
