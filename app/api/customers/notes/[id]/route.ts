import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { logAction } from '@/lib/permissions/audit';
import { NextRequest, NextResponse } from 'next/server';
import { withRequestLogging } from '@/lib/log';

// Soft-deletes an identity_notes row (merchant-scoped, deleted_at timestamp).

async function DELETEHandler(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';

  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.DELETE_CUSTOMER_NOTE);
  if (denied) return denied;

  const { error } = await serviceClient
    .from('identity_notes')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', resolvedParams.id)
    .eq('merchant_id', ctx.merchantId)
    .is('deleted_at', null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  logAction({
    ctx,
    action: 'delete_customer_note',
    resourceType: 'identity_note',
    resourceId: resolvedParams.id,
    ip,
  });

  return NextResponse.json({ ok: true });
}

export const DELETE = withRequestLogging('/api/customers/notes/[id]', DELETEHandler);
