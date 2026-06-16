import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';
import { TABLES } from '@/lib/supabase/tables';
import { redirect } from 'next/navigation';
import OnboardingClient from '@/components/OnboardingClient';
import { resolveDefaultAppPath } from '@/lib/permissions';
import { shouldRequireOnboarding } from '@/lib/account/onboardingGate';
import { ensureMerchantContextForUser } from '@/lib/account/ensureMerchantContext';
import { getMerchantProfileById } from '@/lib/account/merchantProfile';

export const dynamic = 'force-dynamic';

type StoreConnectionRow = {
  store_key: string | null;
};

export default async function OnboardingPage() {
  const supabase = createClient();
  const serviceClient = createServiceClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const ctx = await ensureMerchantContextForUser(serviceClient, user);

  const merchantPromise = ctx
    ? getMerchantProfileById(serviceClient, ctx.merchantId)
    : Promise.resolve(null);

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
      .select('store_key')
      .eq('merchant_id', ctx.merchantId)
      .eq('platform', 'shopify')
      .maybeSingle()
    : Promise.resolve({ data: null });

  const [merchant, { data: jobs }, { data: shopifyConnection }] = await Promise.all([
    merchantPromise,
    jobsPromise,
    shopifyPromise,
  ]);

  const setupComplete =
    merchant?.setup_complete === true || user.user_metadata?.setup_complete === true;

  if (!shouldRequireOnboarding({
    hasMerchantContext: !!ctx,
    setupComplete,
    auditRunCount: (jobs ?? []).length,
  })) {
    redirect(await resolveDefaultAppPath(serviceClient, user.id));
  }

  return (
    <OnboardingClient
      userId={user.id}
      initialStoreName={merchant?.name ?? (user.user_metadata?.store_name as string | undefined) ?? ''}
      initialPlatform={merchant?.platform ?? (user.user_metadata?.platform as string | undefined) ?? ''}
      initialAnnualVolume={
        merchant?.monthly_order_volume ??
        (user.user_metadata?.monthly_order_volume as string | undefined) ??
        ''
      }
      initialPrimaryConcern={
        merchant?.primary_fraud_concern ??
        (user.user_metadata?.primary_fraud_concern as string | undefined) ??
        ''
      }
      shopifyConnected={!!(shopifyConnection as StoreConnectionRow | null)?.store_key}
      shopifyShopDomain={(shopifyConnection as StoreConnectionRow | null)?.store_key ?? ''}
    />
  );
}
