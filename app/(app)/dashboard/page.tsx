import { createClient, createServiceClient } from '@/lib/supabase/server';
import { TABLES } from '@/lib/supabase/tables';
import { redirect } from 'next/navigation';
import { requirePermission, PERMISSIONS, resolveDefaultAppPath } from '@/lib/permissions';
import TrackPageView from '@/components/common/TrackPageView';
import EmptyDashboardHero from '@/components/EmptyDashboardHero';
import PartialSetupHero from '@/components/PartialSetupHero';
import { getConnectionState } from '@/lib/connections/getConnectionState';
import { getMerchantDataPresence } from '@/lib/supabase/getMerchantDataPresence';
import { resolveMerchantSetupState } from '@/lib/connections/getMerchantSetupState';
import { DashboardPageCockpit } from '@/app/(app)/dashboard/DashboardPageCockpit';
import { DashboardSyncWaitingHero } from '@/app/(app)/dashboard/DashboardSyncWaitingHero';
import {
  buildConfig,
  buildKpis,
  buildWeeklyTrend,
  countClaimsNeedingAction,
  countEvidence,
} from '@/app/(app)/dashboard/dashboardPageUtils';
import type { ActivityItem } from '@/app/(app)/dashboard/dashboardPageTypes';
import { loadPayoutDashboardMetrics } from '@/lib/dashboard/payoutDashboardMetrics';
import SetupSummaryCard from '@/components/Onboarding/SetupSummaryCard';

export default async function DashboardPage() {
  const supabase = createClient();
  const serviceClient = createServiceClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_DASHBOARD);
  if (denied) {
    redirect(await resolveDefaultAppPath(serviceClient, user.id, { exclude: ['/dashboard'] }));
  }

  const [connectionState, dataPresence] = await Promise.all([
    getConnectionState(serviceClient, ctx.merchantId),
    getMerchantDataPresence(serviceClient, ctx.merchantId, user.id),
  ]);

  const setupState = resolveMerchantSetupState(connectionState, dataPresence);

  if (setupState === 'fresh') {
    return (
      <div className="p-4 md:p-6">
        <TrackPageView event="Dashboard Viewed" />
        <div className="mb-4"><SetupSummaryCard /></div>
        <EmptyDashboardHero />
      </div>
    );
  }

  if (setupState === 'shopify_only_empty' || setupState === 'helpdesk_only_empty') {
    return (
      <div className="p-4 md:p-6">
        <TrackPageView event="Dashboard Viewed" />
        <div className="mb-4"><SetupSummaryCard /></div>
        <PartialSetupHero connection={connectionState} />
      </div>
    );
  }

  if (setupState === 'fully_connected_empty') {
    return (
      <div className="p-4 md:p-6">
        <TrackPageView event="Dashboard Viewed" />
        <div className="mb-4"><SetupSummaryCard /></div>
        <DashboardSyncWaitingHero connection={connectionState} />
      </div>
    );
  }

  const config = buildConfig(setupState, connectionState);

  const [evidenceCounts, claimsNeedingAction, claimTrendRaw, payoutMetrics] = await Promise.all([
    countEvidence(serviceClient, ctx.merchantId),
    countClaimsNeedingAction(serviceClient, ctx.merchantId),
    serviceClient
      .from(TABLES.MERCHANT_CLAIMS)
      .select('submitted_at,created_at,amount_at_risk')
      .eq('merchant_id', ctx.merchantId)
      .gte('submitted_at', new Date(Date.now() - 56 * 24 * 3600 * 1000).toISOString())
      .then((r: { error: unknown; data: Array<{ submitted_at: string | null; created_at: string }> | null }) =>
        r.error ? [] : (r.data ?? [])),
    loadPayoutDashboardMetrics(serviceClient, ctx.merchantId),
  ]);

  const claimTrend = buildWeeklyTrend(
    claimTrendRaw as Array<{ submitted_at: string | null; created_at: string }>,
  );

  const { total: totalPackages } = evidenceCounts;

  const activity: ActivityItem[] = [];
  if (claimsNeedingAction > 0) {
    activity.push({
      type: 'Payout',
      detail: `${claimsNeedingAction} open payout case${claimsNeedingAction === 1 ? '' : 's'} need action`,
      time: '',
      href: '/claims',
    });
  }
  if (payoutMetrics.chaseDue > 0) {
    activity.push({
      type: 'Recovery',
      detail: `${payoutMetrics.chaseDue} recovery case${payoutMetrics.chaseDue === 1 ? '' : 's'} chase due`,
      time: '',
      href: '/recoveries',
    });
  }
  if (payoutMetrics.casesMissingEvidence > 0) {
    activity.push({
      type: 'Evidence',
      detail: `${payoutMetrics.casesMissingEvidence} case${payoutMetrics.casesMissingEvidence === 1 ? '' : 's'} missing evidence`,
      time: '',
      href: '/claims?queue=evidence',
    });
  }

  const kpis = buildKpis(setupState, connectionState, dataPresence, {
    reviewQueue: null,
    claimsNeedingAction,
    totalPackages,
    recoveryOpen: payoutMetrics.recoveryCasesOpen,
    chaseDue: payoutMetrics.chaseDue,
    amountRecovered: payoutMetrics.amountRecovered,
    payoutExposureOpen: payoutMetrics.payoutExposureOpen,
    displayCurrency: payoutMetrics.displayCurrency,
  });

  return (
    <DashboardPageCockpit
      config={config}
      connectionState={connectionState}
      setupState={setupState}
      kpis={kpis}
      claimTrend={claimTrend}
      metrics={payoutMetrics}
      claimsNeedingAction={claimsNeedingAction}
      activity={activity}
    />
  );
}
