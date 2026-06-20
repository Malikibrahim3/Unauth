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
import { getMerchantProfileById } from '@/lib/account/merchantProfile';
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
    ? getMerchantProfileById(serviceClient, ctx.merchantId)
    : Promise.resolve(null);

  const jobsPromise = ctx
    ? serviceClient
      .from(TABLES.PROCESSING_JOBS)
      .select('id')
      .eq('merchant_id', ctx.merchantId)
      .limit(1)
    : Promise.resolve({ data: [] });

  const merchantFlagsPromise = ctx
    ? serviceClient
      .from(TABLES.MERCHANTS)
      .select('is_demo')
      .eq('id', ctx.merchantId)
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
        linkState: 'not_connected' as const,
      });

  const [merchantProfile, { data: jobs }, { data: merchantFlags }, connectionState] =
    await Promise.all([
      merchantPromise,
      jobsPromise,
      merchantFlagsPromise,
      connectionPromise,
    ]);

  const merchantComplete =
    merchantProfile?.setup_complete === true || user.user_metadata?.setup_complete === true;

  if (shouldRequireOnboarding({
    hasMerchantContext: !!ctx,
    setupComplete: merchantComplete,
    auditRunCount: (jobs ?? []).length,
  })) {
    redirect('/onboarding');
  }

  const allDemo = !!(merchantFlags as { is_demo?: boolean } | null)?.is_demo;

  const merchantName = merchantProfile?.name ?? null;
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
          merchantId={merchantProfile?.id ?? null}
          storeName={merchantProfile?.name ?? null}
          monthlyOrderVolume={merchantProfile?.monthly_order_volume ?? null}
          primaryConcern={merchantProfile?.primary_fraud_concern ?? null}
        />

        <div className="flex flex-1 flex-col overflow-hidden">
          <AppHeader
            merchantName={displayMerchantName ?? null}
            environment={process.env.VERCEL_ENV ?? 'development'}
            isDemo={allDemo}
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
