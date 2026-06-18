import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { TABLES } from '@/lib/supabase/tables';
import { mapRuleRow, RULE_COLUMNS } from '@/lib/rules/store';
import { DEFAULT_RISK_CONTROLS, makeRiskScoreRangeConditions } from '@/lib/rules/riskBands';

export async function POST() {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.MANAGE_SETTINGS);
  if (denied) return denied;

  const { data: existingRows, error: existingError } = await serviceClient
    .from(TABLES.MERCHANT_RULES)
    .select('id')
    .eq('merchant_id', ctx.merchantId)
    .eq('is_active', true)
    .limit(1);
  if (existingError) {
    return NextResponse.json({ error: 'Failed to inspect existing controls' }, { status: 500 });
  }
  if ((existingRows ?? []).length > 0) {
    return NextResponse.json(
      { error: 'Default controls can only be created before custom active controls exist.' },
      { status: 409 },
    );
  }

  const rows = DEFAULT_RISK_CONTROLS.map((control, index) => ({
    merchant_id: ctx.merchantId,
    name: control.name,
    description: control.description,
    conditions: makeRiskScoreRangeConditions(control),
    action: control.action,
    condition_operator: 'and',
    priority: index,
  }));

  const { data, error } = await serviceClient
    .from(TABLES.MERCHANT_RULES)
    .insert(rows)
    .select(RULE_COLUMNS);
  if (error || !data) {
    return NextResponse.json({ error: 'Failed to create default controls' }, { status: 500 });
  }

  return NextResponse.json({ rules: data.map((row: unknown) => mapRuleRow(row as never)) }, { status: 201 });
}
