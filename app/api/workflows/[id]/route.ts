import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { TABLES } from '@/lib/supabase/tables';
import { workflowDefinitionSchema } from '@/lib/workflows/validation';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const client = createServiceClient();
  const { denied, ctx } = await requirePermission(client, user.id, PERMISSIONS.MANAGE_SETTINGS);
  if (denied || !ctx) return denied ?? NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  const { data: prior } = await client.from(TABLES.WORKFLOW_DEFINITIONS).select('*').eq('merchant_id', ctx.merchantId).eq('id', id).maybeSingle();
  if (!prior) return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
  const parsed = workflowDefinitionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid workflow', details: parsed.error.flatten() }, { status: 400 });
  const value = parsed.data;

  if (prior.status === 'draft') {
    const { data, error } = await client.from(TABLES.WORKFLOW_DEFINITIONS).update({
      name: value.name,
      description: value.description ?? null,
      trigger_event_type: value.triggerEventType,
      conditions: value.conditions,
      outputs: value.outputs,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    }).eq('merchant_id', ctx.merchantId).eq('id', id).eq('status', 'draft').select().maybeSingle();
    if (error) return NextResponse.json({ error: 'Draft update failed; the published flow is unchanged' }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'Editable draft not found' }, { status: 409 });
    return NextResponse.json({ workflow: data, notice: 'Draft updated. Publish explicitly after testing.' });
  }

  const existingDraft = (await client.from(TABLES.WORKFLOW_DEFINITIONS).select('id').eq('merchant_id', ctx.merchantId).eq('name', prior.name).eq('status', 'draft').maybeSingle()).data;
  if (existingDraft) return NextResponse.json({ error: 'Edit the existing draft before creating another version', draftId: existingDraft.id }, { status: 409 });
  const latest = (await client.from(TABLES.WORKFLOW_DEFINITIONS).select('version').eq('merchant_id', ctx.merchantId).eq('name', prior.name).order('version', { ascending: false }).limit(1).maybeSingle()).data;
  const { data, error } = await client.from(TABLES.WORKFLOW_DEFINITIONS).insert({
    merchant_id: ctx.merchantId,
    name: prior.name,
    description: value.description ?? null,
    trigger_event_type: value.triggerEventType,
    conditions: value.conditions,
    outputs: value.outputs,
    active: false,
    status: 'draft',
    version: Number(latest?.version ?? prior.version) + 1,
    created_by: user.id,
    updated_by: user.id,
  }).select().single();
  if (error) return NextResponse.json({ error: 'New draft version could not be created' }, { status: 500 });
  return NextResponse.json({ workflow: data, notice: 'A new inactive draft was created. Publish explicitly after testing.' });
}
