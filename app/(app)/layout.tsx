import { isScreenshotAccount } from '@/lib/demo/screenshotAccount';
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { TABLES } from "@/lib/supabase/tables";
import AuthenticatedDesignShell from "@/components/layout/AuthenticatedDesignShell";
import { BreadcrumbOverrideProvider } from "@/components/layout/BreadcrumbOverrideContext";
import AmplitudeInit from "@/components/common/AmplitudeInit";
import { shouldRequireOnboarding } from "@/lib/account/onboardingGate";
import {
  getRequestCallerContext,
  getRequestPermissions,
  getRequestServiceClient,
  getRequestUser,
} from "@/lib/auth/requestContext";
import { getMerchantProfileById } from "@/lib/account/merchantProfile";
import { getCachedConnectionState } from "@/lib/connections/getConnectionState";
import {
  ConnectionStateProvider,
  DemoModeProvider,
} from "@/components/connections/ConnectionStateContext";
import { NavigationProvider } from "@/components/navigation/NavigationProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { DevPreviewProvider } from "@/components/product/DevPreviewContext";
import { AuthenticatedSurfaceTelemetry } from "@/components/product/AuthenticatedSurfaceTelemetry";
import {
  DEV_TIER_COOKIE,
  getDevPreviewFromCookieValue,
} from "@/lib/product/devPreview";
import { AUTH_RETURN_COOKIE, loginHrefForReturnPath } from "@/lib/auth/routeContinuity";
import { loadMerchantCapabilitySummary } from "@/lib/integrations/merchantCapabilitySummary";
import { listUserWorkspaces } from "@/lib/workspaces/listUserWorkspaces";
import { WorkspaceSelectionBoundary } from "@/components/layout/WorkspaceSelectionBoundary";
import { RouteReadinessBoundary } from "@/components/system/RouteReadinessBoundary";
import { acceptanceScenarioFromHeaders } from "@/lib/testing/acceptanceStateInjector";
import { now } from "@/lib/time/clock";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const serviceClient = getRequestServiceClient();
  const user = await getRequestUser();
  const cookieStore = await cookies();
  const acceptanceScenarioId = await acceptanceScenarioFromHeaders();

  if (!user) {
    redirect(loginHrefForReturnPath(cookieStore.get(AUTH_RETURN_COOKIE)?.value));
  }

  const ctx = await getRequestCallerContext();

  const permissionsPromise = ctx
    ? getRequestPermissions()
    : Promise.resolve([]);

  const merchantPromise = ctx
    ? getMerchantProfileById(serviceClient, ctx.merchantId)
    : Promise.resolve(null);

  const jobsPromise = ctx
    ? serviceClient
        .from(TABLES.PROCESSING_JOBS)
        .select("id")
        .eq("merchant_id", ctx.merchantId)
        .limit(1)
    : Promise.resolve({ data: [] });

  const connectionPromise = ctx
    ? getCachedConnectionState(ctx.merchantId)
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
        linkState: "not_connected" as const,
        trackingConnected: false,
      });
  const capabilitySummaryPromise = ctx
    ? loadMerchantCapabilitySummary(serviceClient, ctx.merchantId)
    : Promise.resolve({
        providerId: "none",
        label: "Selected sources · unavailable",
        tone: "neutral" as const,
      });
  const workCountPromise = ctx
    ? (async () => {
        const result = await serviceClient
          .from(TABLES.WORK_TASKS)
          .select('id', { count: 'exact', head: true })
          .eq('merchant_id', ctx.merchantId)
          .neq('status', 'completed')
          .neq('status', 'cancelled');
        return result.error ? null : result.count;
      })()
    : Promise.resolve(null);
  const navigationAsOf = now();
  const caseNavigationCutoffDate = new Date(navigationAsOf.getTime() - 30 * 86_400_000);
  caseNavigationCutoffDate.setUTCHours(0, 0, 0, 0);
  const caseNavigationCutoff = caseNavigationCutoffDate.toISOString();
  const caseCountPromise = ctx
    ? serviceClient
        .from(TABLES.MERCHANT_CLAIMS)
        .select('id', { count: 'exact', head: true })
        .eq('merchant_id', ctx.merchantId)
        .gte('created_at', caseNavigationCutoff)
        .lte('created_at', navigationAsOf.toISOString())
    : Promise.resolve({ count: null });
  const reconciliationCountPromise = ctx
    ? serviceClient
        .from(TABLES.CASE_EXCEPTIONS)
        .select('id', { count: 'exact', head: true })
        .eq('merchant_id', ctx.merchantId)
        .eq('status', 'open')
    : Promise.resolve({ count: null });
  const workspacesPromise = listUserWorkspaces(serviceClient, user.id);

  const [
    merchantProfile,
    { data: jobs },
    connectionState,
    permissions,
    capabilitySummary,
    workCount,
    caseCountResult,
    reconciliationCountResult,
    workspaces,
  ] = await Promise.all([
    merchantPromise,
    jobsPromise,
    connectionPromise,
    permissionsPromise,
    capabilitySummaryPromise,
    workCountPromise,
    caseCountPromise,
    reconciliationCountPromise,
    workspacesPromise,
  ]);
  const merchantComplete = merchantProfile
    ? merchantProfile.setup_complete === true
    : user.user_metadata?.setup_complete === true;
  const profileComplete =
    merchantProfile?.onboarding_profile_complete === true || merchantComplete;
  const metadataDeferredAt = user.user_metadata?.onboarding_deferred_at;
  const onboardingDeferred = merchantProfile
    ? typeof merchantProfile.onboarding_deferred_at === "string"
    : typeof metadataDeferredAt === "string" && metadataDeferredAt.trim().length > 0;

  if (!ctx && workspaces.length > 1) {
    return <WorkspaceSelectionBoundary workspaces={workspaces} />;
  }

  if (
    shouldRequireOnboarding({
      hasMerchantContext: !!ctx,
      profileComplete,
      onboardingDeferred,
      setupComplete: merchantComplete,
      auditRunCount: (jobs ?? []).length,
      shopifyConnected: connectionState.shopify,
      helpdeskConnected: connectionState.helpdesk,
    })
  ) {
    redirect("/onboarding");
  }

  // RUN-13: `is_demo` now arrives with the merchant profile the layout already
  // reads, removing a duplicate `merchants` round trip from every navigation.
  const allDemo = merchantProfile?.is_demo === true;
  // Keep the shell bound to the merchant profile. A connected store key is an
  // account identifier, not a merchant-facing workspace name.
  const displayMerchantName = merchantProfile?.name ?? null;
  const userName =
    typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()
      ? user.user_metadata.full_name.trim()
      : user.email ?? null;

  // Dev preview — read the tier cookie so the context is consistent with getMerchantProductPlan.
  const isProduction = process.env.VERCEL_ENV === "production";
  const devPreview = isProduction
    ? null
    : getDevPreviewFromCookieValue(cookieStore.get(DEV_TIER_COOKIE)?.value);

  return (
      <RouteReadinessBoundary>
        <NavigationProvider>
          <DevPreviewProvider value={devPreview}>
            <ToastProvider>
              <AuthenticatedSurfaceTelemetry />
              <AmplitudeInit
                merchantId={merchantProfile?.id ?? null}
                storeName={merchantProfile?.name ?? null}
                monthlyOrderVolume={merchantProfile?.monthly_order_volume ?? null}
                primaryConcern={merchantProfile?.primary_fraud_concern ?? null}
              />
              <BreadcrumbOverrideProvider>
                <AuthenticatedDesignShell
                  workspaceName={displayMerchantName}
                  reportingCurrency={merchantProfile?.reportingCurrency ?? null}
                  timezone={merchantProfile?.timezone ?? null}
                  workspaces={workspaces}
                  activeMerchantId={ctx?.merchantId ?? null}
                  userName={userName}
                  userEmail={user.email ?? ""}
                  userRole={ctx?.role ?? "Workspace member"}
                  permissions={permissions}
                  sourceTone={capabilitySummary.tone}
                  sourceLabel={capabilitySummary.label}
                  screenshotMode={isScreenshotAccount(merchantProfile)}
                  workCount={workCount ?? undefined}
                  caseCount={caseCountResult.count ?? undefined}
                  reconciliationCount={reconciliationCountResult.count ?? undefined}

                  acceptanceScenarioId={acceptanceScenarioId}
                >
                  <ConnectionStateProvider value={connectionState}>
                    <DemoModeProvider value={allDemo} screenshot={isScreenshotAccount(merchantProfile)}>
                      {children}
                    </DemoModeProvider>
                  </ConnectionStateProvider>
                </AuthenticatedDesignShell>
              </BreadcrumbOverrideProvider>
            </ToastProvider>
          </DevPreviewProvider>
        </NavigationProvider>
      </RouteReadinessBoundary>
  );
}
