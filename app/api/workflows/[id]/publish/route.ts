import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { TABLES } from '@/lib/supabase/tables';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = createClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const service = createServiceClient();
  const { denied, ctx } = await requirePermission(service, user.id, PERMISSIONS.MANAGE_SETTINGS);
  if (denied) return denied;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const draft = (await service.from(TABLES.WORKFLOW_DEFINITIONS).select('*').eq('merchant_id', ctx.merchantId).eq('id', id).eq('status', 'draft').maybeSingle()).data;
  if (!draft) return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
  const summary = {
    trigger: draft.trigger_event_type,
    conditionCount: Array.isArray(draft.conditions) ? draft.conditions.length : 0,
    actions: (Array.isArray(draft.outputs) ? draft.outputs : []).map((output: { type?: unknown }) => output.type),
  };
  if (!body.confirm) return NextResponse.json({ confirmationRequired: true, summary, notice: 'Publishing enables bounded workflow outputs for future matching events.' });

  const { data, error } = await (service as any).rpc('publish_workflow_definition', {
    p_merchant_id: ctx.merchantId,
    p_workflow_id: id,
    p_actor_id: user.id,
  });
  if (error) return NextResponse.json({ error: error.code === 'P0002' ? 'Draft no longer exists' : 'Atomic publish failed; no configuration was changed' }, { status: error.code === 'P0002' ? 409 : 500 });
  return NextResponse.json({ workflow: data, summary });
}
