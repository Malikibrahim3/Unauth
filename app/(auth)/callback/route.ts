import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';
import { upsertMerchantForUser } from '@/lib/account/upsertMerchantForUser';
import { safeRedirectPath } from '@/lib/auth/safeRedirect';
import { parseRequestedPlanId } from '@/lib/billing/plans';
import { persistSubscriptionIntent } from '@/lib/billing/subscriptionIntent';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const queryPlan = parseRequestedPlanId(searchParams.get('plan'));
  const requestedNext = searchParams.get('next');

  if (code) {
    const supabase = createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const meta = data.user.user_metadata ?? {};
      const serviceClient = createServiceClient();

      // Always establish the authenticated workspace server-side. The plan in
      // signed user metadata is a proposal from signup, never an activation.
      const merchant = await upsertMerchantForUser(serviceClient, {
        userId: data.user.id,
        email: data.user.email,
        storeName: meta.store_name ? String(meta.store_name) : null,
        platform: meta.platform ? String(meta.platform) : null,
        monthlyOrderVolume: meta.monthly_order_volume ? String(meta.monthly_order_volume) : null,
        primaryFraudConcern: meta.primary_fraud_concern ? String(meta.primary_fraud_concern) : null,
        setupComplete: false,
      });
      const requestedPlan = parseRequestedPlanId(
        typeof meta.requested_plan === 'string' ? meta.requested_plan : null,
      ) ?? queryPlan;
      if (requestedPlan) {
        const metadataKey = typeof meta.subscription_intent_key === 'string'
          ? meta.subscription_intent_key
          : `signup-${data.user.id}-${requestedPlan}-v1`;
        await persistSubscriptionIntent(serviceClient, {
          merchantId: merchant.id,
          planId: requestedPlan,
          requestedBy: data.user.id,
          logicalOperationId: `signup:${data.user.id}:${metadataKey}`,
          source: 'signup',
        });
      }

      const onboardingParams = new URLSearchParams();
      if (requestedNext) onboardingParams.set('next', safeRedirectPath(requestedNext));
      return NextResponse.redirect(`${origin}/onboarding${onboardingParams.size ? `?${onboardingParams.toString()}` : ''}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
