import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { TABLES } from '@/lib/supabase/tables';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';

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
    .from(TABLES.AUDIT_TRANSACTIONS)
    .select('id, job_id')
    .in('id', ids);

  if (txError) return NextResponse.json({ error: txError.message }, { status: 500 });

  const txList = transactions ?? [];
  if (txList.length === 0) {
    return NextResponse.json({ ok: true, dismissed: 0 });
  }

  const jobIds = [...new Set(txList.flatMap((row: any) => (row.job_id ? [row.job_id] : [])))];
  const { data: jobs, error: jobError } = await serviceClient
    .from(TABLES.PROCESSING_JOBS)
    .select('id, merchant_id')
    .in('id', jobIds);

  if (jobError) return NextResponse.json({ error: jobError.message }, { status: 500 });

  const allowedJobs = new Set(
    (jobs ?? []).flatMap((job: any) => (job.merchant_id === ctx.merchantId && job.id ? [job.id] : [])),
  );
  const allowedIds = txList.flatMap((row: any) => (allowedJobs.has(row.job_id) && row.id ? [row.id] : []));

  if (allowedIds.length === 0) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const mutationClient = createServiceClient({
    audit: { actorId: ctx.userId, actorRole: ctx.role, requestIp: ip },
  });
  const { error } = await mutationClient
    .from(TABLES.AUDIT_TRANSACTIONS)
    .update({ dismissed_by_merchant: true } as any)
    .in('id', allowedIds);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, dismissed: allowedIds.length });
}
