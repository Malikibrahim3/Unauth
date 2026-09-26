import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { createRuleSchema } from '@/lib/rules/store';
import { validateConditions } from '@/lib/rules/fields';
import { readRuleImpact } from '@/lib/rules/impactRead';
import { signImpactProof } from '@/lib/rules/impactToken';
import { TABLES } from '@/lib/supabase/tables';

const schema = z.object({
  days: z.union([z.literal(7), z.literal(30), z.literal(90)]).default(30),
  ruleId: z.string().uuid().optional(),
  candidate: createRuleSchema,
});
export async function POST(request: Request) {
  const { data: { user } } = await createClient().auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const client = createServiceClient();
  const { denied, ctx } = await requirePermission(client, user.id, PERMISSIONS.VIEW_SETTINGS);
  if (denied || !ctx) return denied ?? NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid preview. Choose 7, 30 or 90 days and valid rule fields.' }, { status: 400 });
  const { candidate, days, ruleId } = parsed.data;
  const errors = validateConditions(candidate.conditions);
  if (errors.length) return NextResponse.json({ error: errors[0].message }, { status: 422 });
  if (ruleId) {
    const { data, error } = await client.from(TABLES.MERCHANT_RULES).select('id').eq('id', ruleId).eq('merchant_id', ctx.merchantId).is('archived_at', null).maybeSingle();
    if (error) return NextResponse.json({ error: 'Rule lookup unavailable.' }, { status: 503 });
    if (!data) return NextResponse.json({ error: 'Rule not found.' }, { status: 404 });
  }
  try {
    const result = await readRuleImpact(client, ctx.merchantId, days, rules => {
      const prior = rules.find(rule => rule.id === ruleId);
      const proposed = { ...candidate, id: ruleId ?? 'proposed-new-rule', merchant_id: ctx.merchantId,
        description: candidate.description ?? null, is_active: true,
        priority: candidate.priority ?? prior?.priority ?? Math.max(-1, ...rules.map(rule => rule.priority)) + 1 };
      return [...rules.filter(rule => rule.id !== ruleId), proposed];
    });
    return NextResponse.json({ ...result, impactToken: signImpactProof({ merchantId: ctx.merchantId, revision: result.revision, target: ruleId ?? 'new', proposedHash: result.proposedHash, expiresAt: Date.now() + 15 * 60_000, evaluatedCount: result.evaluatedCount }) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Preview unavailable.', writesPerformed: 0 }, { status: 409 });
  }
}
