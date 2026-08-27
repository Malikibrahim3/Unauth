import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { parseRequestedPlanId } from '@/lib/billing/plans';
import {
  loadLatestSubscriptionIntent,
  persistSubscriptionIntent,
} from '@/lib/billing/subscriptionIntent';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { createClient, createServiceClient } from '@/lib/supabase/server';

const intentSchema = z.object({
  planId: z.string().min(1).max(32),
  source: z.enum(['signup', 'onboarding', 'billing']).default('signup'),
});

function operationId(request: NextRequest, userId: string, source: string, planId: string) {
  const supplied = request.headers.get('idempotency-key')?.trim();
  if (supplied && /^[A-Za-z0-9:_-]{8,128}$/.test(supplied)) {
    return `${source}:${userId}:${supplied}`;
  }
  return `${source}:${userId}:${planId}:v1`;
}

export async function POST(request: NextRequest) {
  const auth = createClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const parsed = intentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid plan selection.' }, { status: 400 });
  const planId = parseRequestedPlanId(parsed.data.planId);
  if (!planId) return NextResponse.json({ error: 'Unknown plan.' }, { status: 400 });

  const service = createServiceClient();
  const { denied, ctx } = await requirePermission(service, user.id, PERMISSIONS.MANAGE_SETTINGS);
  if (denied) return denied;

  const intent = await persistSubscriptionIntent(service, {
    merchantId: ctx.merchantId,
    planId,
    requestedBy: user.id,
    logicalOperationId: operationId(request, user.id, parsed.data.source, planId),
    source: parsed.data.source,
  });
  return NextResponse.json({ ok: true, intent });
}

export async function GET() {
  const auth = createClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  const service = createServiceClient();
  const { denied, ctx } = await requirePermission(service, user.id, PERMISSIONS.VIEW_SETTINGS);
  if (denied) return denied;
  const result = await loadLatestSubscriptionIntent(service, ctx.merchantId);
  return NextResponse.json(result);
}
