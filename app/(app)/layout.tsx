import { redirect } from "next/navigation";
import "@/styles/operations/index.css";
import { cookies } from "next/headers";
import { TABLES } from "@/lib/supabase/tables";
import AuthenticatedDesignShell from "@/components/layout/AuthenticatedDesignShell";
import { BreadcrumbOverrideProvider } from "@/components/layout/BreadcrumbOverrideContext";
import BillingStatusBanner from "@/components/billing/BillingStatusBanner";
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
import { DesktopRequiredBoundary } from "@/components/system/DesktopRequiredBoundary";
import { AUTH_RETURN_COOKIE, loginHrefForReturnPath } from "@/lib/auth/routeContinuity";
import { AuthenticatedThemeProvider } from "@/components/theme/AuthenticatedThemeProvider";
import { AUTHENTICATED_THEME_COOKIE, readAuthenticatedTheme } from "@/lib/theme/authenticatedTheme";
import { loadMerchantCapabilitySummary } from "@/lib/integrations/merchantCapabilitySummary";
import { loadWorkNavigationCount } from "@/lib/work/store";
import { listUserWorkspaces } from "@/lib/workspaces/listUserWorkspaces";
import { WorkspaceSelectionBoundary } from "@/components/layout/WorkspaceSelectionBoundary";
import { PERMISSIONS } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const serviceClient = getRequestServiceClient();
  const user = await getRequestUser();
  const cookieStore = await cookies();

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
    ? loadWorkNavigationCount(serviceClient, ctx.merchantId, user.id)
    : Promise.resolve(null);
  const workspacesPromise = listUserWorkspaces(serviceClient, user.id);

  const [
    merchantProfile,
    { data: jobs },
    connectionState,
    permissions,
    capabilitySummary,
    workCount,
    workspaces,
  ] = await Promise.all([
    merchantPromise,
    jobsPromise,
    connectionPromise,
    permissionsPromise,
    capabilitySummaryPromise,
    workCountPromise,
    workspacesPromise,
  ]);
  const merchantComplete =
    merchantProfile?.setup_complete === true ||
    user.user_metadata?.setup_complete === true;
  const profileComplete =
    merchantProfile?.onboarding_profile_complete === true || merchantComplete;
  const metadataDeferredAt = user.user_metadata?.onboarding_deferred_at;
  const onboardingDeferred =
    typeof merchantProfile?.onboarding_deferred_at === "string"
    || (typeof metadataDeferredAt === "string" && metadataDeferredAt.trim().length > 0);

  if (!ctx && workspaces.length > 1) {
    return (
      <AuthenticatedThemeProvider initialTheme={readAuthenticatedTheme(cookieStore.get(AUTHENTICATED_THEME_COOKIE)?.value)}>
        <DesktopRequiredBoundary>
          <WorkspaceSelectionBoundary workspaces={workspaces} />
        </DesktopRequiredBoundary>
      </AuthenticatedThemeProvider>
    );
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
      : null;

  // Dev preview — read the tier cookie so the context is consistent with getMerchantProductPlan.
  const isProduction = process.env.VERCEL_ENV === "production";
  const devPreview = isProduction
    ? null
    : getDevPreviewFromCookieValue(cookieStore.get(DEV_TIER_COOKIE)?.value);

  return (
    <AuthenticatedThemeProvider initialTheme={readAuthenticatedTheme(cookieStore.get(AUTHENTICATED_THEME_COOKIE)?.value)}>
      <DesktopRequiredBoundary>
        <NavigationProvider>
          <DevPreviewProvider value={devPreview}>
            <div
              className="ua-app ua-app-shell"
              data-unauth-ui="evidence-operations-v1"
              data-ui-version="evidence-operations-v1"
              data-readiness="shell-ready auth-resolved"
              data-shell-ready="true"
              data-auth-resolved="true"
            >
              <span
                hidden
                aria-hidden="true"
                data-design-contract="THESIS: a light-first evidence workspace for source-backed operational decisions. STORY: source evidence, recommendation, merchant decision, external action, recovery and ledger outcome remain distinct. FORM: 220px rail, 44px utility bar, compact work planes, bounded inspectors, light default with authenticated dark option in Settings → Appearance."
              />
              <ToastProvider>
                <AuthenticatedSurfaceTelemetry />

                <AmplitudeInit
                  merchantId={merchantProfile?.id ?? null}
                  storeName={merchantProfile?.name ?? null}
                  monthlyOrderVolume={merchantProfile?.monthly_order_volume ?? null}
                  primaryConcern={merchantProfile?.primary_fraud_concern ?? null}
                />

                <div className="ua-app-shell__main">
                  <BreadcrumbOverrideProvider>
                    <AuthenticatedDesignShell
                      workspaceName={displayMerchantName}
                      workspaces={workspaces}
                      activeMerchantId={ctx?.merchantId ?? null}
                      userName={userName}
                      userEmail={user.email ?? ""}
                      userRole={ctx?.role ?? "Workspace member"}
                      permissions={permissions}
                      sourceTone={capabilitySummary.tone}
                      sourceLabel={capabilitySummary.label}
                      workCount={workCount ?? undefined}
                    >
                      {permissions.includes(PERMISSIONS.MANAGE_SETTINGS) ? <BillingStatusBanner /> : null}

                      <main
                        id="app-scroll-container"
                        className="ua-app-shell__scroll"
                      >
                        <ConnectionStateProvider value={connectionState}>
                          <DemoModeProvider value={allDemo}>
                            {children}
                          </DemoModeProvider>
                        </ConnectionStateProvider>
                      </main>
                    </AuthenticatedDesignShell>
                  </BreadcrumbOverrideProvider>
                </div>
              </ToastProvider>
            </div>
          </DevPreviewProvider>
        </NavigationProvider>
      </DesktopRequiredBoundary>
    </AuthenticatedThemeProvider>
  );
}
