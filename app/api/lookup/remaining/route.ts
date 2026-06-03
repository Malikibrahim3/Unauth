import { NextResponse } from 'next/server';
import { getContextCreditSnapshot } from '@/lib/billing/contextCredits';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user ?? null;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const service = createServiceClient();
  const { denied, ctx } = await requirePermission(service, user.id, PERMISSIONS.LOOKUP_CUSTOMER);
  if (denied) return denied;

  const snapshot = await getContextCreditSnapshot(service, ctx.merchantId);
  return NextResponse.json({
    used: snapshot.used,
    limit: snapshot.allowance,
    remaining: snapshot.remaining,
    monthlyRemaining: snapshot.monthlyRemaining,
    topupRemaining: snapshot.topupRemaining,
    tier: snapshot.tier,
    periodStart: snapshot.periodStart,
    periodEnd: snapshot.periodEnd,
    subscriptionStatus: snapshot.subscriptionStatus,
    label: 'context credits',
  });
}
