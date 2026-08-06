import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { TABLES } from "@/lib/supabase/tables";
import Sidebar from "@/components/nav/Sidebar";
import AppHeader from "@/components/layout/AppHeader";
import { BreadcrumbOverrideProvider } from "@/components/layout/BreadcrumbOverrideContext";
import DemoBanner from "@/components/common/DemoBanner";
import BillingStatusBanner from "@/components/billing/BillingStatusBanner";
import AmplitudeInit from "@/components/common/AmplitudeInit";
import { shouldRequireOnboarding } from "@/lib/account/onboardingGate";
import {
  getRequestCallerContext,
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
import { resolvePermissions } from "@/lib/permissions";
import { DesktopRequiredBoundary } from "@/components/system/DesktopRequiredBoundary";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const serviceClient = getRequestServiceClient();
  const user = await getRequestUser();

  if (!user) {
    redirect("/login");
  }

  const cookieStore = await cookies();
  const ctx = await getRequestCallerContext();

  const membershipsPromise = serviceClient
    .from(TABLES.MERCHANT_MEMBERS)
    .select("merchant_id, role, merchants(name)")
    .eq("user_id", user.id)
    .eq("invite_status", "active");

  const permissionsPromise = ctx
    ? resolvePermissions(serviceClient, ctx)
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

  const [
    merchantProfile,
    { data: jobs },
    connectionState,
    { data: memberships },
    permissions,
  ] = await Promise.all([
    merchantPromise,
    jobsPromise,
    connectionPromise,
    membershipsPromise,
    permissionsPromise,
  ]);

  const typedMemberships = (memberships ?? []) as Array<{
    merchant_id: string;
    role: string;
    merchants: { name: string | null } | null;
  }>;
  const workspaces = typedMemberships.map((membership) => ({
    id: membership.merchant_id,
    name: membership.merchants?.name ?? "Unnamed workspace",
    role: membership.role,
  }));
  const merchantComplete =
    merchantProfile?.setup_complete === true ||
    user.user_metadata?.setup_complete === true;
  const profileComplete =
    merchantProfile?.onboarding_profile_complete === true || merchantComplete;

  if (
    shouldRequireOnboarding({
      hasMerchantContext: !!ctx,
      profileComplete,
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
    <DesktopRequiredBoundary>
      <NavigationProvider>
        <DevPreviewProvider value={devPreview}>
          <div
            className="ua-app flex h-screen overflow-hidden"
            data-ui-version="decision-ledger-instrument-grade"
          >
            <span
              hidden
              aria-hidden="true"
              data-design-contract="Decision Ledger — Instrument Grade: one dominant operating object; visible source, fact, inference, decision, and outcome authority; exact financial scope; browser-native composition; no visual cohorts, iOS imitation, card soup, glass, or decorative elevation."
            />
            <ToastProvider>
              <AuthenticatedSurfaceTelemetry />
              <Sidebar
                merchantName={displayMerchantName ?? null}
                userName={userName}
                userEmail={user.email ?? ""}
                connectionState={connectionState}
                workspaces={workspaces}
                activeMerchantId={ctx?.merchantId ?? null}
                permissions={permissions}
              />

              <AmplitudeInit
                merchantId={merchantProfile?.id ?? null}
                storeName={merchantProfile?.name ?? null}
                monthlyOrderVolume={merchantProfile?.monthly_order_volume ?? null}
                primaryConcern={merchantProfile?.primary_fraud_concern ?? null}
              />

              <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                <BreadcrumbOverrideProvider>
                  <AppHeader
                    userName={userName}
                    userEmail={user.email ?? null}
                    unreadCount={0}
                    permissions={permissions}
                    connectionState={connectionState}
                  />

                  {allDemo && (
                    <div className="flex-shrink-0">
                      <DemoBanner />
                    </div>
                  )}

                  <BillingStatusBanner />

                  <main
                    id="app-scroll-container"
                    className="ua-operational-scrollbar min-w-0 flex-1 overflow-y-auto overflow-x-hidden"
                  >
                    <ConnectionStateProvider value={connectionState}>
                      <DemoModeProvider value={allDemo}>
                        {children}
                      </DemoModeProvider>
                    </ConnectionStateProvider>
                  </main>
                </BreadcrumbOverrideProvider>
              </div>
            </ToastProvider>
          </div>
        </DevPreviewProvider>
      </NavigationProvider>
    </DesktopRequiredBoundary>
  );
}
