import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { TABLES } from '@/lib/supabase/tables';
import { mapRuleRow, RULE_COLUMNS, updateRuleSchema } from '@/lib/rules/store';
import { validateConditions } from '@/lib/rules/fields';
import {
  activeRiskScoreRanges,
  findOverlappingRiskControl,
  formatRiskScoreRange,
  parseRiskScoreRange,
  riskScorePolicyCoverageError,
} from '@/lib/rules/riskBands';
import type { MerchantRule, RuleCondition } from '@/lib/rules-engine';

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

  const parsedConditions = parsed.data.conditions as RuleCondition[] | undefined;
  if (parsedConditions !== undefined) {
    const conditionErrors = validateConditions(parsedConditions);
    if (conditionErrors.length > 0) {
      return NextResponse.json({ error: conditionErrors[0]!.message }, { status: 422 });
    }
  }

  const { data: currentRow, error: currentError } = await serviceClient
    .from(TABLES.MERCHANT_RULES)
    .select(RULE_COLUMNS)
    .eq('id', id)
    .eq('merchant_id', ctx.merchantId)
    .maybeSingle();
  if (currentError) {
    return NextResponse.json({ error: 'Failed to load rule' }, { status: 500 });
  }
  if (!currentRow) {
    return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
  }

  const currentRule = mapRuleRow(currentRow as never);
  const nextRule: MerchantRule = {
    ...currentRule,
    ...parsed.data,
    description: parsed.data.description === undefined ? currentRule.description : parsed.data.description,
    conditions: parsedConditions ?? currentRule.conditions,
    action: parsed.data.action ?? currentRule.action,
    condition_operator: parsed.data.condition_operator ?? currentRule.condition_operator,
    is_active: parsed.data.is_active ?? currentRule.is_active,
    priority: parsed.data.priority ?? currentRule.priority,
  };
  const candidateRange = nextRule.is_active ? parseRiskScoreRange(nextRule) : null;
  if (candidateRange) {
    const { data: existingRows, error: existingError } = await serviceClient
      .from(TABLES.MERCHANT_RULES)
      .select(RULE_COLUMNS)
      .eq('merchant_id', ctx.merchantId)
      .eq('is_active', true);
    if (existingError) {
      return NextResponse.json({ error: 'Failed to validate payout policy band' }, { status: 500 });
    }
    const overlap = findOverlappingRiskControl(
      (existingRows ?? []).map((row: unknown) => mapRuleRow(row as never)),
      candidateRange,
      id,
    );
    if (overlap) {
      return NextResponse.json(
        { error: `${formatRiskScoreRange(candidateRange)} overlaps "${overlap.name}". Payout policy bands cannot overlap.` },
        { status: 422 },
      );
    }
    const existingRules = (existingRows ?? []).map((row: unknown) => mapRuleRow(row as never));
    const ranges = activeRiskScoreRanges(existingRules, { range: candidateRange, excludeRuleId: id });
    const coverageError = riskScorePolicyCoverageError(ranges);
    if (coverageError) {
      return NextResponse.json({ error: coverageError }, { status: 422 });
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

  const { data: existingRows, error: existingError } = await serviceClient
    .from(TABLES.MERCHANT_RULES)
    .select(RULE_COLUMNS)
    .eq('merchant_id', ctx.merchantId)
    .eq('is_active', true);
  if (existingError) {
    return NextResponse.json({ error: 'Failed to validate payout policy bands' }, { status: 500 });
  }
  const activeRules = (existingRows ?? []).map((row: unknown) => mapRuleRow(row as never));
  const remainingRanges = activeRiskScoreRanges(activeRules.filter((rule: MerchantRule) => rule.id !== id));
  const deletingRiskControl = activeRules.some(
    (rule: MerchantRule) => rule.id === id && parseRiskScoreRange(rule) !== null,
  );
  if (deletingRiskControl) {
    const coverageError = riskScorePolicyCoverageError(remainingRanges);
    if (coverageError) {
      return NextResponse.json({ error: coverageError }, { status: 422 });
    }
  }

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
