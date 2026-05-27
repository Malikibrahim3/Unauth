import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { TABLES } from '@/lib/supabase/tables';
import Sidebar from '@/components/nav/Sidebar';
import AppHeader from '@/components/layout/AppHeader';
import DemoBanner from '@/components/common/DemoBanner';
import AmplitudeInit from '@/components/common/AmplitudeInit';
import { headers } from 'next/headers';
import { createServiceClient } from '@/lib/supabase/server';
import { shouldRequireOnboarding } from '@/lib/account/onboardingGate';
import { ensureMerchantContextForUser } from '@/lib/account/ensureMerchantContext';
import { ACTIVE_CLAIM_STATUSES } from '@/lib/claims/sla';
import { getShopifyConnectionStatus } from '@/lib/shopify/connectionStatus';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const serviceClient = createServiceClient();
  const { data } = await supabase.auth.getUser();
  const user = data?.user ?? null;

  if (!user) {
    redirect('/login');
  }

  // Onboarding redirect: skip if already on /onboarding
  const headerList = await headers();
  const pathname = headerList.get('x-pathname') ?? '';
  const isOnboarding = pathname.startsWith('/onboarding');

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
  const shopifyPromise = ctx
    ? getShopifyConnectionStatus(serviceClient, ctx.merchantId)
    : Promise.resolve({ connected: false, linkState: 'not_connected' as const, shopDomain: null, lastError: null });
  const claimsCountPromise = ctx
    ? serviceClient
      .from('merchant_claims' as any)
      .select('id', { count: 'exact', head: true })
      .eq('merchant_id', ctx.merchantId)
      .in('status', [...ACTIVE_CLAIM_STATUSES])
    : Promise.resolve({ count: 0 });

  const [{ data: merchantProfile }, { data: jobs }, shopifyStatus, { count: claimsCount }] = await Promise.all([merchantPromise, jobsPromise, shopifyPromise, claimsCountPromise]);

  if (!isOnboarding) {
    const merchantComplete =
      !!(merchantProfile as unknown as { setup_complete?: boolean } | null)?.setup_complete;

    if (shouldRequireOnboarding({
      hasMerchantContext: !!ctx,
      setupComplete: merchantComplete,
      auditRunCount: (jobs ?? []).length,
    })) {
      redirect('/onboarding');
    }
  }

  const allDemo =
    (jobs ?? []).length > 0 &&
    (jobs as unknown as Array<{ is_demo: boolean }>).every((j) => j.is_demo);

  const merchantName = ((merchantProfile as any)?.name as string | null) ?? null;
  const connectedShopDomain = shopifyStatus.shopDomain;
  const displayMerchantName = connectedShopDomain
    ? connectedShopDomain.replace(/^www\./i, '').split('.')[0]?.replace(/[-_]/g, ' ') ?? merchantName
    : merchantName;

  return (
    /*
     * Shell:  sidebar (sticky, full height) + right column (header sticky + scrollable body)
     * The sidebar handles its own collapse state in localStorage.
     * Only the page body scrolls — sidebar and header are fixed to the viewport.
     */
    <div
      className="flex h-screen overflow-hidden bg-[var(--surface-base)] text-[var(--ink-primary)]"
    >
      {/* ── Sidebar ── */}
      <Sidebar merchantName={displayMerchantName ?? null} userEmail={user.email ?? ''} claimsCount={claimsCount ?? 0} />

      {/* Amplitude — initialise after session confirmed */}
      <AmplitudeInit
        merchantId={(merchantProfile as any)?.id ?? null}
        storeName={(merchantProfile as any)?.name ?? null}
        monthlyOrderVolume={(merchantProfile as any)?.monthly_order_volume ?? null}
        primaryConcern={(merchantProfile as any)?.primary_fraud_concern ?? null}
      />

      {/* ── Right column ── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Sticky header */}
        <AppHeader
          merchantName={displayMerchantName ?? null}
          userEmail={user.email ?? null}
          shopifyConnected={shopifyStatus.connected}
          shopifyShopDomain={shopifyStatus.shopDomain}
          shopifyLinkState={shopifyStatus.linkState}
        />

        {/* Demo / data-quality banner (full-width, between header and page) */}
        {allDemo && (
          <div className="flex-shrink-0">
            <DemoBanner />
          </div>
        )}

        {/* Scrollable page body */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
