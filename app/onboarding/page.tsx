import { createServiceClient } from '@/lib/supabase/server';
import '@/styles/operations/index.css';
import { getRequestUser } from '@/lib/auth/requestContext';
import { TABLES } from '@/lib/supabase/tables';
import { redirect } from 'next/navigation';
import OnboardingClient from '@/components/OnboardingClient';
import { resolveDefaultAppPath } from '@/lib/permissions';
import { shouldRequireOnboarding } from '@/lib/account/onboardingGate';
import { ensureMerchantContextForUser } from '@/lib/account/ensureMerchantContext';
import { getMerchantProfileById } from '@/lib/account/merchantProfile';
import { getConnectionState } from '@/lib/connections/getConnectionState';
import { safeRedirectPath } from '@/lib/auth/safeRedirect';
import { loadConnectorCatalogue } from '@/lib/connectors/catalogue';
import { loadLatestSubscriptionIntent } from '@/lib/billing/subscriptionIntent';
import { PLANS } from '@/lib/billing/plans';
import { formatNumber } from '@/lib/utils/format';
import OnboardingLoading from './loading';

export const dynamic = 'force-dynamic';

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string; step?: string; ux9State?: string }>;
}) {
  const routeParams = await searchParams;
  if (process.env.RELEASE_E2E_LOCAL === '1' && routeParams?.ux9State === 'loading') {
    return <OnboardingLoading />;
  }
  const ux9ProfileComplete = process.env.RELEASE_E2E_LOCAL === '1' && routeParams?.ux9State === 'profile-complete';
  const safeNext = safeRedirectPath(routeParams?.next);
  const workspaceHref = safeNext.startsWith('/onboarding') ? '/overview' : safeNext;
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
  const cataloguePromise = ctx
    ? loadConnectorCatalogue(serviceClient, ctx.merchantId)
    : Promise.resolve([]);
  const intentPromise = ctx
    ? loadLatestSubscriptionIntent(serviceClient, ctx.merchantId)
    : Promise.resolve({ intent: null, availability: 'available' as const });

  const [merchant, { data: jobs }, connectionState, { data: applicabilityRows }, connectorCatalogue, subscriptionIntentRead] = await Promise.all([
    merchantPromise,
    jobsPromise,
    connectionPromise,
    applicabilityPromise,
    cataloguePromise,
    intentPromise,
  ]);
  const applicability = new Map(
    ((applicabilityRows ?? []) as Array<{ category: string; status: string }>).map((row) => [row.category, row.status]),
  );
  const requestedPlanDefinition = subscriptionIntentRead.intent
    ? PLANS[subscriptionIntentRead.intent.requestedPlanId]
    : null;

  const setupComplete =
    merchant?.setup_complete === true || user.user_metadata?.setup_complete === true;

  if (!shouldRequireOnboarding({
    hasMerchantContext: !!ctx,
    // A saved profile unlocks connector settings in the app shell, but does
    // not complete the onboarding journey itself.
    profileComplete: false,
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
      initialProfileComplete={
        merchant?.onboarding_profile_complete === true || setupComplete || ux9ProfileComplete
      }
      shopifyConnected={connectionState.shopify}
      shopifyShopDomain={connectionState.shopDomain ?? ''}
      helpdeskConnected={connectionState.helpdesk}
      helpdeskProvider={connectionState.helpdeskProvider}
      workspaceHref={workspaceHref}
      requestedPlan={requestedPlanDefinition?.name}
      requestedCredits={requestedPlanDefinition
        ? requestedPlanDefinition.creditsMonthly === 'custom'
          ? 'Custom allowance'
          : `${formatNumber(requestedPlanDefinition.creditsMonthly)} credits / month`
        : undefined}
      requestedPlanUnavailableReason={subscriptionIntentRead.availability === 'schema_pending'
        ? 'Saved plan requests will appear after the MR0 database update is applied to this environment.'
        : undefined}
      initialConnectors={connectorCatalogue.map((connector) => ({
        id: connector.id,
        name: connector.name,
        stage: connector.stage,
        status: connector.status,
        account: connector.account,
        importedRecords: connector.importedRecords,
        importedRecordsKnown: connector.importedRecordsKnown === true,
        connectEnabled: connector.connectEnabled,
      }))}
    />
  );
}
