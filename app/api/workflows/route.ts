import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { TABLES } from '@/lib/supabase/tables';
import { workflowDefinitionSchema } from '@/lib/workflows/validation';

export async function GET() {
  const userClient = createClient(); const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const client = createServiceClient(); const { denied, ctx } = await requirePermission(client, user.id, PERMISSIONS.VIEW_SETTINGS);
  if (denied || !ctx) return denied ?? NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { data, error } = await client.from(TABLES.WORKFLOW_DEFINITIONS).select('*').eq('merchant_id', ctx.merchantId).order('name').order('version', { ascending: false });
  if (error) throw new Error(`workflows_read_failed: ${error.message}`);
  return NextResponse.json({ workflows: data ?? [] });
}

export async function POST(request: Request) {
  const userClient = createClient(); const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const client = createServiceClient(); const { denied, ctx } = await requirePermission(client, user.id, PERMISSIONS.MANAGE_SETTINGS);
  if (denied || !ctx) return denied ?? NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const parsed = workflowDefinitionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid workflow', details: parsed.error.flatten() }, { status: 400 });
  const value = parsed.data;
  const { data, error } = await client.from(TABLES.WORKFLOW_DEFINITIONS).insert({ merchant_id: ctx.merchantId, name: value.name, description: value.description ?? null, trigger_event_type: value.triggerEventType, conditions: value.conditions, outputs: value.outputs, active: value.active, version: 1, created_by: user.id, updated_by: user.id }).select().single();
  if (error) return NextResponse.json({ error: error.code === '23505' ? 'A workflow with this name already exists' : error.message }, { status: error.code === '23505' ? 409 : 500 });
  return NextResponse.json({ workflow: data }, { status: 201 });
}
