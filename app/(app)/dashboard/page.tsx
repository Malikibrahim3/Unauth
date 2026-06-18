import { createClient, createServiceClient } from '@/lib/supabase/server';
import { TABLES } from '@/lib/supabase/tables';
import { redirect } from 'next/navigation';
import { formatDateMode } from '@/lib/utils/format';
import type { TrendDataPoint } from '@/components/charts/WeeklyTrendChart';
import {
  countMerchantReviewQueueProfiles,
  fetchMerchantReviewQueueRows,
  fetchReviewQueueProfileIds,
} from '@/lib/supabase/merchantHelpers';
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
  buildGradeDist,
  buildKpis,
  buildWeeklyTrend,
  countClaimsNeedingAction,
  countEvidence,
} from '@/app/(app)/dashboard/dashboardPageUtils';
import type { ActivityItem, QueueRow, RunRow } from '@/app/(app)/dashboard/dashboardPageTypes';

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
        <EmptyDashboardHero />
      </div>
    );
  }

  if (setupState === 'shopify_only_empty' || setupState === 'helpdesk_only_empty') {
    return (
      <div className="p-4 md:p-6">
        <TrackPageView event="Dashboard Viewed" />
        <PartialSetupHero connection={connectionState} />
      </div>
    );
  }

  if (setupState === 'fully_connected_empty') {
    return (
      <div className="p-4 md:p-6">
        <TrackPageView event="Dashboard Viewed" />
        <DashboardSyncWaitingHero connection={connectionState} />
      </div>
    );
  }

  const config = buildConfig(setupState, connectionState);

  const [{ data: runs }, evidenceCounts, claimsNeedingAction, claimTrendRaw, exposureRaw] = await Promise.all([
    serviceClient
      .from(TABLES.PROCESSING_JOBS)
      .select('*')
      .eq('merchant_id', ctx.merchantId)
      .eq('hidden_by_merchant', false)
      .order('created_at', { ascending: false })
      .limit(20),
    countEvidence(serviceClient, ctx.merchantId),
    countClaimsNeedingAction(serviceClient, ctx.merchantId),
    serviceClient
      .from('claims')
      .select('submitted_at,created_at,amount_at_risk')
      .eq('merchant_id', ctx.merchantId)
      .gte('submitted_at', new Date(Date.now() - 56 * 24 * 3600 * 1000).toISOString())
      .then((r: { error: unknown; data: Array<{ submitted_at: string | null; created_at: string; amount_at_risk: number | null }> | null }) =>
        r.error ? [] : (r.data ?? [])),
    serviceClient
      .from('claims')
      .select('amount_at_risk')
      .eq('merchant_id', ctx.merchantId)
      .in('status', ['open', 'pending', 'escalated'])
      .then((r: { error: unknown; data: Array<{ amount_at_risk: number | null }> | null }) =>
        r.error ? [] : (r.data ?? [])),
  ]);

  const claimTrend: TrendDataPoint[] = buildWeeklyTrend(
    claimTrendRaw as Array<{ submitted_at: string | null; created_at: string }>,
  );
  const exposureAtRisk = (exposureRaw as Array<{ amount_at_risk: number | null }>).reduce(
    (sum, r) => sum + (r.amount_at_risk ?? 0),
    0,
  );

  const typedRuns = (runs ?? []) as unknown as RunRow[];
  const latestRun = typedRuns[0] ?? null;
  const recentRuns = typedRuns.slice(0, 4);
  const { total: totalPackages, ce3Eligible: priorMatchPackages } = evidenceCounts;

  let reviewQueue: number | null = null;
  try {
    reviewQueue = await countMerchantReviewQueueProfiles(serviceClient, ctx.merchantId);
  } catch {
    reviewQueue = null;
  }

  let reviewRows: QueueRow[] = [];
  let profileIdByTx = new Map<string, string>();
  try {
    const queue = await fetchMerchantReviewQueueRows(serviceClient, ctx.merchantId, { from: 0, to: 5 });
    reviewRows = (queue.rows as QueueRow[]) ?? [];
    const txIds = reviewRows.flatMap((r) => (typeof r.id === 'string' ? [r.id] : []));
    profileIdByTx = await fetchReviewQueueProfileIds(serviceClient, queue.ownedJobIds, txIds);
  } catch {
    reviewRows = [];
    profileIdByTx = new Map<string, string>();
  }

  const activity: ActivityItem[] = [];
  if (reviewRows[0]) {
    const row = reviewRows[0];
    activity.push({
      type: 'Queue',
      detail: `${row.customer_name ?? row.customer_email ?? 'Unidentified'} · ${row.match_status ?? 'candidate'}`,
      time: formatDateMode(row.processed_at, 'recent'),
      href: profileIdByTx.get(row.id) ? `/customers/${profileIdByTx.get(row.id)}` : '/customers',
    });
  }
  if (claimsNeedingAction > 0) {
    activity.push({
      type: 'Claims',
      detail: `${claimsNeedingAction} claim${claimsNeedingAction === 1 ? '' : 's'} awaiting a decision`,
      time: 'current',
      href: '/claims',
    });
  }
  if (priorMatchPackages > 0) {
    activity.push({
      type: 'Evidence',
      detail: `${priorMatchPackages} dispute-ready package${priorMatchPackages === 1 ? '' : 's'}`,
      time: 'current',
      href: '/chargebacks',
    });
  }
  if (latestRun) {
    activity.push({
      type: 'Legacy context',
      detail: `${latestRun.filename} · ${(latestRun.flagged_count ?? 0).toLocaleString()} records with signals`,
      time: formatDateMode(latestRun.created_at, 'recent'),
      href: '/reports',
    });
  }

  const kpis = buildKpis(setupState, connectionState, dataPresence, {
    reviewQueue,
    claimsNeedingAction,
    totalPackages,
  });

  const customerCount = dataPresence.sources.customerProfiles;
  const gradeDist = buildGradeDist(reviewRows);

  return (
    <DashboardPageCockpit
      config={config}
      connectionState={connectionState}
      setupState={setupState}
      kpis={kpis}
      claimTrend={claimTrend}
      exposureAtRisk={exposureAtRisk}
      gradeDist={gradeDist}
      reviewRows={reviewRows}
      profileIdByTx={profileIdByTx}
      customerCount={customerCount}
      claimsNeedingAction={claimsNeedingAction}
      totalPackages={totalPackages}
      priorMatchPackages={priorMatchPackages}
      activity={activity}
      recentRuns={recentRuns}
    />
  );
}
