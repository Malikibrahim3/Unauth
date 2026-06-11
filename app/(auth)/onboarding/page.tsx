import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';
import { TABLES } from '@/lib/supabase/tables';
import { redirect } from 'next/navigation';
import OnboardingClient from '@/components/OnboardingClient';
import { resolveDefaultAppPath } from '@/lib/permissions';
import { shouldRequireOnboarding } from '@/lib/account/onboardingGate';
import { ensureMerchantContextForUser } from '@/lib/account/ensureMerchantContext';

export const dynamic = 'force-dynamic';

type ShopifyConnectionRow = {
  shop_domain: string | null;
};

export default async function OnboardingPage() {
  const supabase = createClient();
  const serviceClient = createServiceClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const ctx = await ensureMerchantContextForUser(serviceClient, user);

  const merchantPromise = ctx
    ? serviceClient
      .from(TABLES.MERCHANTS)
      .select('name, platform, monthly_order_volume, primary_fraud_concern, setup_complete')
      .eq('id', ctx.merchantId)
      .maybeSingle()
    : Promise.resolve({ data: null });

  const jobsPromise = ctx
    ? serviceClient
      .from(TABLES.PROCESSING_JOBS)
      .select('id')
      .eq('merchant_id', ctx.merchantId)
      .limit(1)
    : Promise.resolve({ data: [] });
  const shopifyPromise = ctx
    ? serviceClient
      .from(TABLES.MERCHANT_SHOPIFY_CONNECTIONS)
      .select('shop_domain')
      .eq('merchant_id', ctx.merchantId)
      .maybeSingle()
    : Promise.resolve({ data: null });

  const [{ data: merchant }, { data: jobs }, { data: shopifyConnection }] = await Promise.all([merchantPromise, jobsPromise, shopifyPromise]);

  if (!shouldRequireOnboarding({
    hasMerchantContext: !!ctx,
    setupComplete: (merchant as { setup_complete?: boolean } | null)?.setup_complete,
    auditRunCount: (jobs ?? []).length,
  })) {
    redirect(await resolveDefaultAppPath(serviceClient, user.id));
  }

  return (
    <OnboardingClient
      userId={user.id}
      initialStoreName={(merchant as { name?: string | null } | null)?.name ?? (user.user_metadata?.store_name as string | undefined) ?? ''}
      initialPlatform={(merchant as { platform?: string | null } | null)?.platform ?? (user.user_metadata?.platform as string | undefined) ?? ''}
      initialAnnualVolume={(merchant as { monthly_order_volume?: string | null } | null)?.monthly_order_volume ?? (user.user_metadata?.monthly_order_volume as string | undefined) ?? ''}
      initialPrimaryConcern={(merchant as { primary_fraud_concern?: string | null } | null)?.primary_fraud_concern ?? (user.user_metadata?.primary_fraud_concern as string | undefined) ?? ''}
      shopifyConnected={!!(shopifyConnection as ShopifyConnectionRow | null)?.shop_domain}
      shopifyShopDomain={(shopifyConnection as ShopifyConnectionRow | null)?.shop_domain ?? ''}
    />
  );
}
