import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { TABLES } from '@/lib/supabase/tables';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = createClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const service = createServiceClient();
  const { denied, ctx } = await requirePermission(service, user.id, PERMISSIONS.MANAGE_SETTINGS);
  if (denied || !ctx) return denied ?? NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  const source = (await service.from(TABLES.WORKFLOW_DEFINITIONS).select('*').eq('merchant_id', ctx.merchantId).eq('id', id).maybeSingle()).data;
  if (!source || source.status === 'draft') return NextResponse.json({ error: 'Published or retired source version required' }, { status: 404 });
  const draft = (await service.from(TABLES.WORKFLOW_DEFINITIONS).select('id').eq('merchant_id', ctx.merchantId).eq('name', source.name).eq('status', 'draft').maybeSingle()).data;
  if (draft) return NextResponse.json({ error: 'Discard or publish the existing draft first', draftId: draft.id }, { status: 409 });
  const latest = (await service.from(TABLES.WORKFLOW_DEFINITIONS).select('version').eq('merchant_id', ctx.merchantId).eq('name', source.name).order('version', { ascending: false }).limit(1).maybeSingle()).data;
  const { data, error } = await service.from(TABLES.WORKFLOW_DEFINITIONS).insert({
    merchant_id: ctx.merchantId, name: source.name, description: source.description,
    trigger_event_type: source.trigger_event_type, conditions: source.conditions,
    outputs: source.outputs, active: false, status: 'draft',
    version: Number(latest?.version ?? source.version) + 1,
    created_by: user.id, updated_by: user.id,
  }).select().single();
  if (error) return NextResponse.json({ error: 'Rollback draft could not be created' }, { status: 500 });
  return NextResponse.json({ workflow: data, notice: `Version ${source.version} was copied into a new draft; history remains immutable.` }, { status: 201 });
}
