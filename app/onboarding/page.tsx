import { createServiceClient } from '@/lib/supabase/server';
import { getRequestUser } from '@/lib/auth/requestContext';
import { TABLES } from '@/lib/supabase/tables';
import { redirect } from 'next/navigation';
import OnboardingClient from '@/components/OnboardingClient';
import { resolveDefaultAppPath } from '@/lib/permissions';
import { shouldRequireOnboarding } from '@/lib/account/onboardingGate';
import { ensureMerchantContextForUser } from '@/lib/account/ensureMerchantContext';
import { getMerchantProfileById } from '@/lib/account/merchantProfile';
import { getConnectionState } from '@/lib/connections/getConnectionState';

export const dynamic = 'force-dynamic';

export default async function OnboardingPage() {
  const serviceClient = createServiceClient();
  const user = await getRequestUser();
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
  const connectionPromise = ctx
    ? getConnectionState(serviceClient, ctx.merchantId)
    : Promise.resolve({
        orderSourceConnected: false,
        orderSourcePlatform: null,
        orderSourceStoreKey: null,
        shopify: false,
        helpdesk: false,
        helpdeskProvider: null,
        bothConnected: false,
        neitherConnected: true,
        orderSourceOnlyConnected: false,
        helpdeskOnlyConnected: false,
        shopDomain: null,
        linkState: 'not_connected' as const,
        trackingConnected: false,
      });
  const applicabilityPromise = ctx
    ? serviceClient
      .from(TABLES.CATEGORY_APPLICABILITY)
      .select('category,status')
      .eq('merchant_id', ctx.merchantId)
      .in('category', ['warehouse_3pl', 'returns'])
    : Promise.resolve({ data: [] });

  const [merchant, { data: jobs }, connectionState, { data: applicabilityRows }] = await Promise.all([
    merchantPromise,
    jobsPromise,
    connectionPromise,
    applicabilityPromise,
  ]);
  const applicability = new Map(
    ((applicabilityRows ?? []) as Array<{ category: string; status: string }>).map((row) => [row.category, row.status]),
  );

  const setupComplete =
    merchant?.setup_complete === true || user.user_metadata?.setup_complete === true;

  if (!shouldRequireOnboarding({
    hasMerchantContext: !!ctx,
    setupComplete,
    auditRunCount: (jobs ?? []).length,
    shopifyConnected: connectionState.shopify,
    helpdeskConnected: connectionState.helpdesk,
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
        (user.user_metadata?.primary_loss_concern as string | undefined) ??
        (user.user_metadata?.primary_fraud_concern as string | undefined) ??
        ''
      }
      initialUsesWms3pl={
        applicability.get('warehouse_3pl') === 'not_applicable'
          ? 'no'
          : applicability.has('warehouse_3pl')
            ? 'yes'
            : ''
      }
      initialUsesReturnsPlatform={
        applicability.get('returns') === 'not_applicable'
          ? 'no'
          : applicability.has('returns')
            ? 'yes'
            : ''
      }
      shopifyConnected={connectionState.shopify}
      shopifyShopDomain={connectionState.shopDomain ?? ''}
      helpdeskConnected={connectionState.helpdesk}
      helpdeskProvider={connectionState.helpdeskProvider}
    />
  );
}
