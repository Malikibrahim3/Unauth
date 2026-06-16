import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { TABLES } from '@/lib/supabase/tables';
import { mapRuleRow, RULE_COLUMNS, updateRuleSchema } from '@/lib/rules/store';
import { validateConditions } from '@/lib/rules/fields';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.MANAGE_SETTINGS);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = updateRuleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid rule payload' },
      { status: 400 },
    );
  }

  if (parsed.data.conditions !== undefined) {
    const conditionErrors = validateConditions(parsed.data.conditions);
    if (conditionErrors.length > 0) {
      return NextResponse.json({ error: conditionErrors[0]!.message }, { status: 422 });
    }
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of ['name', 'description', 'conditions', 'action', 'condition_operator', 'is_active', 'priority'] as const) {
    if (parsed.data[key] !== undefined) update[key] = parsed.data[key];
  }

  // Merchant scoping is the ownership check: the row must belong to ctx.merchantId.
  const { data, error } = await serviceClient
    .from(TABLES.MERCHANT_RULES)
    .update(update)
    .eq('id', id)
    .eq('merchant_id', ctx.merchantId)
    .select(RULE_COLUMNS)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: 'Failed to update rule' }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
  }

  return NextResponse.json({ rule: mapRuleRow(data as never) });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.MANAGE_SETTINGS);
  if (denied) return denied;

  const { data, error } = await serviceClient
    .from(TABLES.MERCHANT_RULES)
    .delete()
    .eq('id', id)
    .eq('merchant_id', ctx.merchantId)
    .select('id')
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: 'Failed to delete rule' }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
