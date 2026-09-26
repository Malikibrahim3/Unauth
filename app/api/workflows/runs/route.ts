import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { TABLES } from '@/lib/supabase/tables';
import { deriveDuration } from '@/lib/capabilities/derived';

export async function GET(request: Request) {
  const auth = createClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const svc = createServiceClient();
  const { denied, ctx } = await requirePermission(svc, user.id, PERMISSIONS.VIEW_SETTINGS);
  if (denied) return denied;
  const url = new URL(request.url);
  let q = svc
    .from(TABLES.WORKFLOW_RUNS)
    .select('id,workflow_definition_id,domain_event_id,status,error,started_at,completed_at', { count: 'exact' })
    .eq('merchant_id', ctx.merchantId)
    .order('started_at', { ascending: false })
    .limit(100);
  if (url.searchParams.get('workflow')) q = q.eq('workflow_definition_id', url.searchParams.get('workflow'));
  const result = await q;
  const runs = ((result.data ?? []) as Array<Record<string, unknown>>).map((run) => ({
    ...run,
    duration: deriveDuration(
      typeof run.started_at === 'string' ? run.started_at : null,
      typeof run.completed_at === 'string' ? run.completed_at : null,
    ),
  }));
  return NextResponse.json({ runs, total: result.count ?? 0 });
}
