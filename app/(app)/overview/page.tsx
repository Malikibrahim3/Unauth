import { redirect } from 'next/navigation';
import { DashboardOverview } from '@/components/dashboard/DashboardOverview';
import { PERMISSIONS, resolveDefaultAppPath } from '@/lib/permissions';
import { getRequestServiceClient, getRequestUser, requirePagePermission } from '@/lib/auth/requestContext';
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
  const params = await searchParams;
  const range = parseReportRange(params.range);
  const timezone = params.timezone && params.timezone.length < 80 ? params.timezone : 'UTC';
  const compare = range !== 'all' && params.compare === 'previous' ? 'previous' : 'none';
  const asOf = now();
  const [report, comparison] = await Promise.all([
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
  ]);
  const requestedCurrency = params.currency?.toUpperCase();
  const selectedCurrency = report.bridges.some(
    (bridge) => bridge.currency === requestedCurrency,
  )
    ? requestedCurrency ?? null
    : report.bridges[0]?.currency ?? null;

  return (
    <DashboardOverview
      report={report}
      comparison={comparison}
      selectedCurrency={selectedCurrency}
      compare={compare}
    />
  );
}
