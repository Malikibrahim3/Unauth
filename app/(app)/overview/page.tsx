import { redirect } from 'next/navigation';
import { DashboardOverview } from '@/components/dashboard/DashboardOverview';
import { PERMISSIONS, resolveDefaultAppPath } from '@/lib/permissions';
import { getRequestPermissions, getRequestServiceClient, getRequestUser, requirePagePermission } from '@/lib/auth/requestContext';
import { getMerchantProfileById } from '@/lib/account/merchantProfile';
import {
  loadDashboardPeriodComparison,
  loadIntelligenceReport,
  parseReportRange,
} from '@/lib/reporting/intelligence';
import { now } from '@/lib/time/clock';

export const dynamic = 'force-dynamic';

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; timezone?: string; compare?: string; currency?: string }>;
}) {
  const user = await getRequestUser();
  if (!user) redirect('/login');
  const service = getRequestServiceClient();
  const ctx = await requirePagePermission(PERMISSIONS.VIEW_DASHBOARD);
  if (!ctx) {
    redirect(
      await resolveDefaultAppPath(service, user.id, { exclude: ['/overview'] }),
    );
  }
  const metadataName = [user.user_metadata?.full_name, user.user_metadata?.name]
    .find((value): value is string => typeof value === 'string' && value.trim().length > 0)
    ?.trim();
  const displayName = metadataName ?? user.email ?? null;
  const params = await searchParams;
  const range = parseReportRange(params.range);
  const timezone = params.timezone && params.timezone.length < 80 ? params.timezone : 'UTC';
  const compare = range !== 'all' && params.compare !== 'none' ? 'previous' : 'none';
  const asOf = now();
  const [report, comparison, merchantProfile, permissions] = await Promise.all([
    loadIntelligenceReport(service, ctx.merchantId, range, timezone, { asOf }),
    compare === 'previous'
      ? loadDashboardPeriodComparison(
          service,
          ctx.merchantId,
          range,
          asOf,
          timezone,
      )
      : Promise.resolve(null),
    getMerchantProfileById(service, ctx.merchantId),
    getRequestPermissions(),
  ]);
  const requestedCurrency = params.currency?.toUpperCase();
  const selectedCurrency = report.bridges.some(
    (bridge) => bridge.currency === requestedCurrency,
  )
    ? requestedCurrency ?? null
    : report.bridges[0]?.currency ?? null;

  return (
    <>
      <DashboardOverview
        report={report}
        comparison={comparison}
        selectedCurrency={selectedCurrency}
        compare={compare}
        userName={displayName}
        workspaceName={merchantProfile?.name ?? null}
        permissions={permissions}
      />
    </>
  );
}
