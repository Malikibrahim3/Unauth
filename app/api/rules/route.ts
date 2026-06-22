import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { TABLES } from '@/lib/supabase/tables';
import { createRuleSchema, mapRuleRow, RULE_COLUMNS } from '@/lib/rules/store';
import { validateConditions } from '@/lib/rules/fields';
import type { RuleCondition } from '@/lib/rules-engine';

export async function GET() {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_SETTINGS);
  if (denied) return denied;

  const { data, error } = await serviceClient
    .from(TABLES.MERCHANT_RULES)
    .select(RULE_COLUMNS)
    .eq('merchant_id', ctx.merchantId)
    .order('priority', { ascending: true });
  if (error) {
    return NextResponse.json({ error: 'Failed to load rules' }, { status: 500 });
  }

  return NextResponse.json({ rules: (data ?? []).map((row: unknown) => mapRuleRow(row as never)) });
}

export async function POST(request: NextRequest) {
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

  const parsed = createRuleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid rule payload' },
      { status: 400 },
    );
  }

  const conditionErrors = validateConditions(parsed.data.conditions);
  if (conditionErrors.length > 0) {
    return NextResponse.json({ error: conditionErrors[0]!.message }, { status: 422 });
  }
  const parsedConditions = parsed.data.conditions as RuleCondition[];

  // Default priority = end of the merchant's list.
  let priority = parsed.data.priority;
  if (priority === undefined) {
    const { data: last } = await serviceClient
      .from(TABLES.MERCHANT_RULES)
      .select('priority')
      .eq('merchant_id', ctx.merchantId)
      .order('priority', { ascending: false })
      .limit(1)
      .maybeSingle();
    priority = ((last?.priority as number | undefined) ?? -1) + 1;
  }

  const { data, error } = await serviceClient
    .from(TABLES.MERCHANT_RULES)
    .insert({
      merchant_id: ctx.merchantId,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      conditions: parsedConditions,
      action: parsed.data.action,
      condition_operator: parsed.data.condition_operator,
      priority,
    })
    .select(RULE_COLUMNS)
    .single();
  if (error || !data) {
    return NextResponse.json({ error: 'Failed to create rule' }, { status: 500 });
  }

  return NextResponse.json({ rule: mapRuleRow(data as never) }, { status: 201 });
}
