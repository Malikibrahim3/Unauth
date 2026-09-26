import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { TABLES } from '@/lib/supabase/tables';
import { deriveDuration } from '@/lib/capabilities/derived';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = createClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const svc = createServiceClient();
  const { denied, ctx } = await requirePermission(svc, user.id, PERMISSIONS.VIEW_SETTINGS);
  if (denied) return denied;
  const { id } = await params;
  const runResult = await svc.from(TABLES.WORKFLOW_RUNS).select('*').eq('merchant_id', ctx.merchantId).eq('id', id).maybeSingle();
  const run = runResult.data as Record<string, unknown> | null;
  if (!run) return NextResponse.json({ error: 'Run not found' }, { status: 404 });
  const steps = (await svc.from(TABLES.WORKFLOW_STEP_RUNS).select('*').eq('merchant_id', ctx.merchantId).eq('workflow_run_id', id).order('step_index')).data ?? [];
  return NextResponse.json({
    run: {
      ...run,
      duration: deriveDuration(
        typeof run.started_at === 'string' ? run.started_at : null,
        typeof run.completed_at === 'string' ? run.completed_at : null,
      ),
    },
    steps,
  });
}
