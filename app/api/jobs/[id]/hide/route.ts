import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { logAction } from '@/lib/permissions/audit';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';

  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.HIDE_JOB);
  if (denied) return denied;

  const { error } = await serviceClient
    .from('processing_jobs')
    .update({ hidden_by_merchant: true } as any)
    .eq('id', params.id)
    .eq('merchant_id', ctx.merchantId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  logAction({
    ctx,
    action: 'hide_job',
    resourceType: 'processing_job',
    resourceId: params.id,
    ip,
  });

  return NextResponse.json({ ok: true });
}
