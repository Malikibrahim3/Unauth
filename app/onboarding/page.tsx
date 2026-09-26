import { createServiceClient } from '@/lib/supabase/server';
import { getRequestUser, getRequestCallerContext } from '@/lib/auth/requestContext';
import { TABLES } from '@/lib/supabase/tables';
import { redirect } from 'next/navigation';
import OnboardingClient from '@/components/OnboardingClient';
import { resolveDefaultAppPath } from '@/lib/permissions';
import { shouldRequireOnboarding } from '@/lib/account/onboardingGate';
import { getMerchantProfileById } from '@/lib/account/merchantProfile';
import { getConnectionState } from '@/lib/connections/getConnectionState';
import { safeRedirectPath } from '@/lib/auth/safeRedirect';
import { loadConnectorCatalogue } from '@/lib/connectors/catalogue';
import { loadLatestSubscriptionIntent } from '@/lib/billing/subscriptionIntent';
import { PLANS } from '@/lib/billing/plans';
import { formatNumber } from '@/lib/utils/format';
import OnboardingLoading from './loading';
import { onboardingNextStep } from '@/lib/onboarding/nextStep';
import { pickPriorityClaim, type PriorityClaimRow } from '@/lib/claims/priority';
import { ACTIVE_CLAIM_STATUSES } from '@/lib/claims/sla';
import { acceptanceScenarioFromHeaders, delayForAcceptanceScenario, throwForAcceptanceScenario } from '@/lib/testing/acceptanceStateInjector';

export const dynamic = 'force-dynamic';

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string; step?: string; ux9State?: string; shopify_error?: string }>;
}) {
  await delayForAcceptanceScenario('onboarding-loading');
  await throwForAcceptanceScenario('onboarding-error');
  const onboardingScenario = await acceptanceScenarioFromHeaders();
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

  const ctx = await getRequestCallerContext();

  const merchantPromise = ctx
    ? getMerchantProfileById(serviceClient, ctx.merchantId)
    : Promise.resolve(null);

  const jobsPromise = ctx
    ? serviceClient
      .from(TABLES.PROCESSING_JOBS)
      .select('id,job_kind,status,failed_rows,total_rows,processed_rows,started_at,created_at')
      .eq('merchant_id', ctx.merchantId)
      .or('and(job_kind.eq.csv_import,cursor->>dataset.eq.orders),and(job_kind.eq.initial_import,source.eq.shopify)')
      .order('created_at', { ascending: false })
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

  const [merchant, jobsRead, connectionState, { data: applicabilityRows }, connectorCatalogue, subscriptionIntentRead] = await Promise.all([
    merchantPromise,
    jobsPromise,
    connectionPromise,
    applicabilityPromise,
    cataloguePromise,
    intentPromise,
  ]);
  const jobs = jobsRead.data;
  const applicability = new Map(
    ((applicabilityRows ?? []) as Array<{ category: string; status: string }>).map((row) => [row.category, row.status]),
  );
  let firstCase: PriorityClaimRow | null = null;
  let hasOrders = false;
  let hasLosses = false;
  let nextActionUnavailable = 'error' in jobsRead && Boolean(jobsRead.error);
  if (ctx) {
    const [orders, losses] = await Promise.all([
      serviceClient.from(TABLES.SOURCE_ORDERS).select('id').eq('merchant_id', ctx.merchantId).limit(1),
      serviceClient.from(TABLES.LOSS_CASES).select('id').eq('merchant_id', ctx.merchantId).limit(1),
    ]);
    nextActionUnavailable ||= Boolean(orders.error || losses.error);
    hasOrders = Boolean(orders.data?.length);
    hasLosses = Boolean(losses.data?.length);
    // Preserve the canonical SLA/value/age ordering across the full active set.
    for (let offset = 0; ; offset += 500) {
      const page = await serviceClient.from(TABLES.MERCHANT_CLAIMS)
        .select('id,status,submitted_at,created_at,amount_at_risk')
        .eq('merchant_id', ctx.merchantId).in('status', [...ACTIVE_CLAIM_STATUSES])
        .order('id').range(offset, offset + 499);
      if (page.error) { nextActionUnavailable = true; break; }
      const rows = (page.data ?? []) as PriorityClaimRow[];
      firstCase = pickPriorityClaim(firstCase ? [firstCase, ...rows] : rows);
      if (rows.length < 500) break;
    }
  }
  const requestedPlanDefinition = subscriptionIntentRead.intent
    ? PLANS[subscriptionIntentRead.intent.requestedPlanId]
    : null;
  const latestJob = (jobs ?? [])[0] as {
    id?: string;
    job_kind?: string;
    status?: string | null;
    failed_rows?: number | null;
    total_rows?: number | null;
    processed_rows?: number | null;
    started_at?: string | null;
    created_at?: string | null;
  } | undefined;

  const setupComplete = merchant
    ? merchant.setup_complete === true
    : user.user_metadata?.setup_complete === true;

  if (!onboardingScenario?.startsWith('workspace-onboarding-') && !shouldRequireOnboarding({
    hasMerchantContext: !!ctx,
    // A saved profile unlocks connector settings in the app shell, but does
    // not complete the onboarding journey itself.
    profileComplete: false,
    setupComplete,
    // An import attempt does not finish onboarding: failed/running/empty jobs
    // are inputs to the primary next action rendered below.
    auditRunCount: 0,
    shopifyConnected: connectionState.shopify,
    helpdeskConnected: connectionState.helpdesk,
  })) {
    redirect(await resolveDefaultAppPath(serviceClient, user.id, { selectedMerchantId: ctx?.merchantId }));
  }

  return (
    <OnboardingClient
      acceptanceScenarioId={onboardingScenario}
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
      initialProfileComplete={onboardingScenario?.startsWith('workspace-onboarding-') === true || merchant?.onboarding_profile_complete === true || setupComplete || ux9ProfileComplete}
      shopifyConnected={connectionState.shopify}
      shopifyShopDomain={connectionState.shopDomain ?? ''}
      helpdeskConnected={connectionState.helpdesk}
      helpdeskProvider={connectionState.helpdeskProvider}
      workspaceHref={workspaceHref}
      nextAction={nextActionUnavailable ? { label: 'Review source availability', href: '/sources' } : onboardingNextStep({
        commerceConnected: connectionState.shopify,
        importStatus: latestJob?.status ?? null,
        importHref: latestJob?.job_kind === 'csv_import' ? `/sources/imports/${latestJob.id}` : '/sources/shopify',
        usableRecords: hasOrders || hasLosses || Boolean(firstCase),
        firstCaseId: firstCase?.id ?? null,
        hasLosses,
        observedRows: latestJob?.total_rows ?? null,
      })}
      requestedPlan={requestedPlanDefinition?.name}
      requestedCredits={requestedPlanDefinition
        ? requestedPlanDefinition.creditsMonthly === 'custom'
          ? 'Custom allowance'
          : `${formatNumber(requestedPlanDefinition.creditsMonthly)} credits / month`
        : undefined}
      requestedPlanUnavailableReason={subscriptionIntentRead.availability === 'schema_pending'
        ? 'Saved plan requests will appear after the MR0 database update is applied to this environment.'
        : undefined}
      shopifyError={routeParams?.shopify_error?.slice(0, 80) ?? null}
      reportingCurrency={merchant?.reportingCurrency}
      reportingTimezone={merchant?.timezone}
      latestImport={latestJob ? {
        status: latestJob.status ?? 'unknown',
        failedRows: latestJob.failed_rows ?? null,
        totalRows: latestJob.total_rows ?? null,
        processedRows: latestJob.processed_rows ?? null,
        startedAt: latestJob.started_at ?? latestJob.created_at ?? null,
      } : null}
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
