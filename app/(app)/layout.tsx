import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { TABLES } from '@/lib/supabase/tables';
import Sidebar from '@/components/nav/Sidebar';
import AppHeader from '@/components/layout/AppHeader';
import DemoBanner from '@/components/common/DemoBanner';
import BillingStatusBanner from '@/components/billing/BillingStatusBanner';
import AmplitudeInit from '@/components/common/AmplitudeInit';
import { createServiceClient } from '@/lib/supabase/server';
import { shouldRequireOnboarding } from '@/lib/account/onboardingGate';
import { ensureMerchantContextForUser } from '@/lib/account/ensureMerchantContext';
import { getConnectionState } from '@/lib/connections/getConnectionState';
import { ConnectionStateProvider } from '@/components/connections/ConnectionStateContext';
import { NavigationProvider } from '@/components/navigation/NavigationProvider';
import { DevPreviewProvider } from '@/components/product/DevPreviewContext';
import { DEV_TIER_COOKIE, getDevPreviewFromCookieValue } from '@/lib/product/devPreview';
import MobileOptimizationNotice from '@/components/mobile/MobileOptimizationNotice';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const serviceClient = createServiceClient();
  const { data } = await supabase.auth.getUser();
  const user = data?.user ?? null;

  if (!user) {
    redirect('/login');
  }

  const ctx = await ensureMerchantContextForUser(serviceClient, user);

  const merchantPromise = ctx
    ? serviceClient
      .from(TABLES.MERCHANTS)
      .select('id, name, monthly_order_volume, primary_fraud_concern, setup_complete')
      .eq('id', ctx.merchantId)
      .maybeSingle()
    : Promise.resolve({ data: null });

  const jobsPromise = ctx
    ? serviceClient
      .from(TABLES.PROCESSING_JOBS)
      .select('is_demo')
      .eq('merchant_id', ctx.merchantId)
      .limit(20)
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
        shopifyOnlyConnected: false,
        helpdeskOnlyConnected: false,
        shopDomain: null,
        linkState: 'not_connected' as const,
      });

  const [{ data: merchantProfile }, { data: jobs }, connectionState] = await Promise.all([
    merchantPromise,
    jobsPromise,
    connectionPromise,
  ]);

  const merchantComplete =
    !!(merchantProfile as unknown as { setup_complete?: boolean } | null)?.setup_complete;

  if (shouldRequireOnboarding({
    hasMerchantContext: !!ctx,
    setupComplete: merchantComplete,
    auditRunCount: (jobs ?? []).length,
  })) {
    redirect('/onboarding');
  }

  const allDemo =
    (jobs ?? []).length > 0 &&
    (jobs as unknown as Array<{ is_demo: boolean }>).every((j) => j.is_demo);

  const merchantName = ((merchantProfile as { name?: string | null })?.name) ?? null;
  const connectedStoreKey =
    connectionState.orderSourceStoreKey ?? connectionState.shopDomain;
  const displayMerchantName = connectedStoreKey
    ? connectedStoreKey.replace(/^www\./i, '').split('.')[0]?.replace(/[-_]/g, ' ') ?? merchantName
    : merchantName;

  // Dev preview — read the tier cookie so the context is consistent with getMerchantProductPlan.
  const isProduction = process.env.VERCEL_ENV === 'production';
  const devPreview = isProduction
    ? null
    : getDevPreviewFromCookieValue((await cookies()).get(DEV_TIER_COOKIE)?.value);

  return (
    <NavigationProvider>
    <DevPreviewProvider value={devPreview}>
      <MobileOptimizationNotice />
      <div
        className="flex h-screen overflow-hidden bg-[var(--surface-base)] text-[var(--text-primary)]"
      >
        <Sidebar
          merchantName={displayMerchantName ?? null}
          userEmail={user.email ?? ''}
          shopifyConnected={connectionState.orderSourceConnected}
          helpdeskConnected={connectionState.helpdesk}
        />

        <AmplitudeInit
          merchantId={(merchantProfile as { id?: string })?.id ?? null}
          storeName={(merchantProfile as { name?: string })?.name ?? null}
          monthlyOrderVolume={(merchantProfile as { monthly_order_volume?: string })?.monthly_order_volume ?? null}
          primaryConcern={(merchantProfile as { primary_fraud_concern?: string })?.primary_fraud_concern ?? null}
        />

        <div className="flex flex-1 flex-col overflow-hidden">
          <AppHeader
            merchantName={displayMerchantName ?? null}
            userEmail={user.email ?? null}
          />

          {allDemo && (
            <div className="flex-shrink-0">
              <DemoBanner />
            </div>
          )}

          <BillingStatusBanner />

          <main id="app-scroll-container" className="flex-1 overflow-y-auto overflow-x-hidden">
            <ConnectionStateProvider value={connectionState}>
              {children}
            </ConnectionStateProvider>
          </main>
        </div>
      </div>
    </DevPreviewProvider>
    </NavigationProvider>
  );
}
