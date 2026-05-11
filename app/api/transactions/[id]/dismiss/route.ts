import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { createScopedClient } from '@/lib/supabase/scoped';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { logAction } from '@/lib/permissions/audit';
import { withRequestLogging } from '@/lib/log';

async function PATCHHandler(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';

  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.DISMISS_TRANSACTION);
  if (denied) return denied;
  const scopedClient = createScopedClient(ctx.merchantId, serviceClient);

  // Confirm the transaction belongs to a job owned by this merchant before updating
  const { data: tx } = await serviceClient
    .from('audit_transactions')
    .select('id, job_id')
    .eq('id', resolvedParams.id)
    .single();

  if (!tx) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Verify job ownership
  const { data: job } = await scopedClient
    .from('processing_jobs')
    .select('merchant_id')
    .eq('id', tx.job_id)
    .single();

  if (!job) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { error } = await serviceClient
    .from('audit_transactions')
    .update({ dismissed_by_merchant: true } as any)
    .eq('id', resolvedParams.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  logAction({
    ctx,
    action: 'dismiss_transaction',
    resourceType: 'transaction',
    resourceId: resolvedParams.id,
    ip,
  });

  return NextResponse.json({ ok: true });

}

export const PATCH = withRequestLogging('/api/transactions/[id]/dismiss', PATCHHandler);
