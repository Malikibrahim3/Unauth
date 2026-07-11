import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { TABLES } from '@/lib/supabase/tables';
import { workflowDefinitionSchema } from '@/lib/workflows/validation';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userClient = createClient(); const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const client = createServiceClient(); const { denied, ctx } = await requirePermission(client, user.id, PERMISSIONS.MANAGE_SETTINGS);
  if (denied || !ctx) return denied ?? NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  const { data: prior } = await client.from(TABLES.WORKFLOW_DEFINITIONS).select('*').eq('merchant_id', ctx.merchantId).eq('id', id).maybeSingle();
  if (!prior) return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
  const parsed = workflowDefinitionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid workflow', details: parsed.error.flatten() }, { status: 400 });
  const value = parsed.data;
  const { error: disableError } = await client.from(TABLES.WORKFLOW_DEFINITIONS).update({ active: false, updated_by: user.id }).eq('id', id).eq('merchant_id', ctx.merchantId);
  if (disableError) throw new Error(`workflow_disable_failed: ${disableError.message}`);
  const { data, error } = await client.from(TABLES.WORKFLOW_DEFINITIONS).insert({ merchant_id: ctx.merchantId, name: value.name, description: value.description ?? null, trigger_event_type: value.triggerEventType, conditions: value.conditions, outputs: value.outputs, active: value.active, version: prior.version + 1, created_by: user.id, updated_by: user.id }).select().single();
  if (error) throw new Error(`workflow_version_create_failed: ${error.message}`);
  return NextResponse.json({ workflow: data });
}
