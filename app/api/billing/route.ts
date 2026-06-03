import { NextResponse } from 'next/server';
import { getMerchantBillingState } from '@/lib/billing/merchantBilling';
import { PLANS, type PlanId } from '@/lib/billing/plans';
import { gracePeriodDaysRemaining } from '@/lib/billing/subscriptionAccess';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user ?? null;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const service = createServiceClient();
  const { denied, ctx } = await requirePermission(service, user.id, PERMISSIONS.MANAGE_SETTINGS);
  if (denied) return denied;
  return buildBillingResponse(service, ctx.merchantId);
}

async function buildBillingResponse(service: ReturnType<typeof createServiceClient>, merchantId: string) {
  const state = await getMerchantBillingState(service, merchantId);
  if (!state) {
    return NextResponse.json({ error: 'Billing state not found' }, { status: 404 });
  }

  const plan = PLANS[state.subscription.planId];
  const graceDays = gracePeriodDaysRemaining(state.subscription.gracePeriodEndsAt);

  return NextResponse.json({
    planId: state.subscription.planId,
    planName: plan.name,
    priceGbp: plan.priceGbp,
    status: state.subscription.status,
    monthlyCreditsRemaining: state.credits.monthlyCreditsRemaining,
    topupCreditsRemaining: state.credits.topupCreditsRemaining,
    monthlyAllowance: state.monthlyAllowance,
    totalRemaining: state.totalRemaining,
    usedThisCycle: state.usedThisCycle,
    cycleResetAt: state.credits.cycleResetAt,
    currentPeriodStart: state.subscription.currentPeriodStart,
    currentPeriodEnd: state.subscription.currentPeriodEnd,
    cancelAtPeriodEnd: state.subscription.cancelAtPeriodEnd,
    downgradeToPlanId: state.subscription.downgradeToPlanId,
    downgradeToPlanName: state.subscription.downgradeToPlanId
      ? PLANS[state.subscription.downgradeToPlanId as PlanId]?.name
      : null,
    gracePeriodDaysRemaining: graceDays,
    stripeCustomerId: state.subscription.stripeCustomerId,
    canTopUp: state.subscription.planId !== 'free',
  });
}
