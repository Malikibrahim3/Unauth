import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { logAction } from '@/lib/permissions/audit';

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
  const { ids } = (await req.json().catch(() => ({}))) as { ids?: string[] };

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'No transaction ids supplied' }, { status: 400 });
  }

  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.DISMISS_TRANSACTION);
  if (denied) return denied;

  const { data: transactions, error: txError } = await serviceClient
    .from('audit_transactions')
    .select('id, job_id')
    .in('id', ids);

  if (txError) return NextResponse.json({ error: txError.message }, { status: 500 });

  const txList = transactions ?? [];
  if (txList.length === 0) {
    return NextResponse.json({ ok: true, dismissed: 0 });
  }

  const jobIds = [...new Set(txList.map((row: any) => row.job_id).filter(Boolean))];
  const { data: jobs, error: jobError } = await serviceClient
    .from('processing_jobs')
    .select('id, merchant_id')
    .in('id', jobIds);

  if (jobError) return NextResponse.json({ error: jobError.message }, { status: 500 });

  const allowedJobs = new Set((jobs ?? []).filter((job: any) => job.merchant_id === ctx.merchantId).map((job: any) => job.id));
  const allowedIds = txList.filter((row: any) => allowedJobs.has(row.job_id)).map((row: any) => row.id);

  if (allowedIds.length === 0) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { error } = await serviceClient
    .from('audit_transactions')
    .update({ dismissed_by_merchant: true } as any)
    .in('id', allowedIds);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  for (const id of allowedIds) {
    logAction({
      ctx,
      action: 'dismiss_transaction',
      resourceType: 'transaction',
      resourceId: id,
      ip,
    });
  }

  return NextResponse.json({ ok: true, dismissed: allowedIds.length });
}
