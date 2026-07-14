import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { TABLES } from "@/lib/supabase/tables";
import Sidebar from "@/components/nav/Sidebar";
import AppHeader from "@/components/layout/AppHeader";
import { BreadcrumbOverrideProvider } from "@/components/layout/BreadcrumbOverrideContext";
import DemoBanner from "@/components/common/DemoBanner";
import BillingStatusBanner from "@/components/billing/BillingStatusBanner";
import AmplitudeInit from "@/components/common/AmplitudeInit";
import { createServiceClient } from "@/lib/supabase/server";
import { shouldRequireOnboarding } from "@/lib/account/onboardingGate";
import { ensureMerchantContextForUser } from "@/lib/account/ensureMerchantContext";
import { getMerchantProfileById } from "@/lib/account/merchantProfile";
import { getConnectionState } from "@/lib/connections/getConnectionState";
import {
  ConnectionStateProvider,
  DemoModeProvider,
} from "@/components/connections/ConnectionStateContext";
import { NavigationProvider } from "@/components/navigation/NavigationProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { DevPreviewProvider } from "@/components/product/DevPreviewContext";
import {
  DEV_TIER_COOKIE,
  getDevPreviewFromCookieValue,
} from "@/lib/product/devPreview";
import {
  ACTIVE_MERCHANT_COOKIE,
  hasPermission,
  PERMISSIONS,
  type Permission,
} from "@/lib/permissions";
import "../../styles/authenticated/index.css";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const serviceClient = createServiceClient();
  const { data } = await supabase.auth.getUser();
  const user = data?.user ?? null;

  if (!user) {
    redirect("/login");
  }

  const cookieStore = await cookies();
  const ctx = await ensureMerchantContextForUser(
    serviceClient,
    user,
    cookieStore.get(ACTIVE_MERCHANT_COOKIE)?.value,
  );

  const membershipsPromise = serviceClient
    .from(TABLES.MERCHANT_MEMBERS)
    .select("merchant_id, role")
    .eq("user_id", user.id)
    .eq("invite_status", "active");

  const permissionValues = Object.values(PERMISSIONS) as Permission[];
  const permissionsPromise = ctx
    ? Promise.all(
        permissionValues.map(
          async (permission) =>
            [
              permission,
              await hasPermission(serviceClient, ctx, permission),
            ] as const,
        ),
      )
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

  const merchantFlagsPromise = ctx
    ? serviceClient
        .from(TABLES.MERCHANTS)
        .select("is_demo")
        .eq("id", ctx.merchantId)
        .maybeSingle()
    : Promise.resolve({ data: null });

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
        shopifyOnlyConnected: false,
        helpdeskOnlyConnected: false,
        shopDomain: null,
        linkState: "not_connected" as const,
        trackingConnected: false,
      });

  const [
    merchantProfile,
    { data: jobs },
    { data: merchantFlags },
    connectionState,
    { data: memberships },
    permissionEntries,
  ] = await Promise.all([
    merchantPromise,
    jobsPromise,
    merchantFlagsPromise,
    connectionPromise,
    membershipsPromise,
    permissionsPromise,
  ]);

  const typedMemberships = (memberships ?? []) as Array<{
    merchant_id: string;
    role: string;
  }>;
  const merchantIds = typedMemberships.map(
    (membership) => membership.merchant_id,
  );
  const { data: workspaceMerchants } =
    merchantIds.length > 0
      ? await serviceClient
          .from(TABLES.MERCHANTS)
          .select("id, name")
          .in("id", merchantIds)
      : { data: [] as Array<{ id: string; name: string | null }> };
  const merchantNames = new Map(
    (
      (workspaceMerchants ?? []) as Array<{ id: string; name: string | null }>
    ).map((merchant) => [merchant.id, merchant.name]),
  );
  const workspaces = typedMemberships.map((membership) => ({
    id: membership.merchant_id,
    name: merchantNames.get(membership.merchant_id) ?? "Unnamed workspace",
    role: membership.role,
  }));
  const permissions = permissionEntries.reduce<Permission[]>(
    (allowedPermissions, [permission, allowed]) => {
      if (allowed) allowedPermissions.push(permission);
      return allowedPermissions;
    },
    [],
  );

  const { count: unreadCount } = ctx
    ? await serviceClient
        .from(TABLES.NOTIFICATIONS)
        .select("id", { count: "exact", head: true })
        .eq("merchant_id", ctx.merchantId)
        .eq("recipient_user_id", user.id)
        .is("read_at", null)
    : { count: 0 };

  const merchantComplete =
    merchantProfile?.setup_complete === true ||
    user.user_metadata?.setup_complete === true;

  if (
    shouldRequireOnboarding({
      hasMerchantContext: !!ctx,
      setupComplete: merchantComplete,
      auditRunCount: (jobs ?? []).length,
      shopifyConnected: connectionState.shopify,
      helpdeskConnected: connectionState.helpdesk,
    })
  ) {
    redirect("/onboarding");
  }

  const allDemo = !!(merchantFlags as { is_demo?: boolean } | null)?.is_demo;

  const merchantName = merchantProfile?.name ?? null;
  const connectedStoreKey =
    connectionState.orderSourceStoreKey ?? connectionState.shopDomain;
  const rawDisplayMerchantName = connectedStoreKey
    ? (connectedStoreKey
        .replace(/^www\./i, "")
        .split(".")[0]
        ?.replace(/[-_]/g, " ") ?? merchantName)
    : merchantName;
  // WS6.5: workspace label is Title-cased ("Elara and Co"), never raw lowercase.
  const WORKSPACE_MINOR_WORDS = new Set([
    "and", "or", "of", "the", "for", "to", "a", "an", "at", "by", "in", "on", "&",
  ]);
  const displayMerchantName = rawDisplayMerchantName
    ? rawDisplayMerchantName
        .split(/\s+/)
        .map((word, index) => {
          const lower = word.toLowerCase();
          if (index > 0 && WORKSPACE_MINOR_WORDS.has(lower)) return lower;
          return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(" ")
    : rawDisplayMerchantName;

  // Dev preview — read the tier cookie so the context is consistent with getMerchantProductPlan.
  const isProduction = process.env.VERCEL_ENV === "production";
  const devPreview = isProduction
    ? null
    : getDevPreviewFromCookieValue(cookieStore.get(DEV_TIER_COOKIE)?.value);

  return (
    <ToastProvider>
    <NavigationProvider>
      <DevPreviewProvider value={devPreview}>
        <div className="ua-app flex h-screen overflow-hidden">
          <Sidebar
            merchantName={displayMerchantName ?? null}
            userEmail={user.email ?? ""}
            shopifyConnected={connectionState.orderSourceConnected}
            helpdeskConnected={connectionState.helpdesk}
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
                merchantName={displayMerchantName ?? null}
                environment={process.env.VERCEL_ENV ?? "development"}
                isDemo={allDemo}
                userEmail={user.email ?? null}
                workspaces={workspaces}
                activeMerchantId={ctx?.merchantId ?? null}
                unreadCount={unreadCount ?? 0}
                permissions={permissions}
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
        </div>
      </DevPreviewProvider>
    </NavigationProvider>
    </ToastProvider>
  );
}
