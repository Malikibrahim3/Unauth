import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { signImpactProof } from '@/lib/rules/impactToken';
import { impactHash } from '@/lib/rules/impactRead';
import { readRuleImpact } from '@/lib/rules/impactRead';

const schema = z.object({
  contractVersion: z.literal(2),
  orderedRuleIds: z.array(z.string().uuid()).min(1).max(500),
  days: z.union([z.literal(7), z.literal(30), z.literal(90)]).default(30),
});
export async function POST(request: Request) {
  const { data: { user } } = await createClient().auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const client = createServiceClient();
  const { denied, ctx } = await requirePermission(client, user.id, PERMISSIONS.VIEW_SETTINGS);
  if (denied || !ctx) return denied ?? NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Use preview contractVersion 2 with orderedRuleIds and a 7, 30 or 90 day scope. The mixed-currency legacy preview is retired.', contractVersion: 2 }, { status: 400 });
  try {
    const result = await readRuleImpact(client, ctx.merchantId, parsed.data.days, rules => {
      const ids = parsed.data.orderedRuleIds;
      const byId = new Map(rules.map(rule => [rule.id, rule]));
      if (ids.length !== rules.length || new Set(ids).size !== ids.length || ids.some(id => !byId.has(id))) throw new Error('The proposed order must contain every active rule exactly once.');
      return ids.map((id, priority) => ({ ...byId.get(id)!, priority }));
    });
    return NextResponse.json({ ...result, impactToken: signImpactProof({ merchantId: ctx.merchantId, revision: result.revision, target: 'reorder', proposedHash: impactHash(parsed.data.orderedRuleIds), expiresAt: Date.now() + 15 * 60_000, evaluatedCount: result.evaluatedCount }) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Preview unavailable.', writesPerformed: 0 }, { status: 409 });
  }
}
