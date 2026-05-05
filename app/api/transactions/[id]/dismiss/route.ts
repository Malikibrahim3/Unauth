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
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.DISMISS_TRANSACTION);
  if (denied) return denied;

  // Confirm the transaction belongs to a job owned by this merchant before updating
  const { data: tx } = await serviceClient
    .from('audit_transactions')
    .select('id, job_id')
    .eq('id', params.id)
    .single();

  if (!tx) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Verify job ownership
  const { data: job } = await serviceClient
    .from('processing_jobs')
    .select('merchant_id')
    .eq('id', tx.job_id)
    .single();

  if (!job || job.merchant_id !== ctx.merchantId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { error } = await serviceClient
    .from('audit_transactions')
    .update({ dismissed_by_merchant: true } as any)
    .eq('id', params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  logAction({
    ctx,
    action: 'dismiss_transaction',
    resourceType: 'transaction',
    resourceId: params.id,
    ip,
  });

  return NextResponse.json({ ok: true });

}
