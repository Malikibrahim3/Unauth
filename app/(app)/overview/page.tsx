import { notFound, redirect } from 'next/navigation';
import SuppliedAuthenticatedRouteLoading from '@/components/visual-authority/SuppliedAuthenticatedRouteLoading';
import { ExactDashboardOverview } from '@/components/dashboard/ExactDashboardOverview';
import { FirstRunOverview } from '@/components/dashboard/FirstRunOverview';
import { PERMISSIONS, resolveDefaultAppPath } from '@/lib/permissions';
import { getRequestPermissions, getRequestServiceClient, getRequestUser, requirePagePermission } from '@/lib/auth/requestContext';
import { getMerchantProfileById } from '@/lib/account/merchantProfile';
import { getCachedConnectionState } from '@/lib/connections/getConnectionState';
import { TABLES } from '@/lib/supabase/tables';
import {
  loadDashboardPeriodComparison,
  loadIntelligenceReport,
  parseReportRange,
} from '@/lib/reporting/intelligence';
import { now } from '@/lib/time/clock';
import { acceptanceScenarioFromHeaders, acceptanceVariantFromHeaders, throwForAcceptanceScenario } from '@/lib/testing/acceptanceStateInjector';

export const dynamic = 'force-dynamic';

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; timezone?: string; compare?: string; currency?: string }>;
}) {
  const acceptanceScenario = await acceptanceScenarioFromHeaders();
  const acceptanceState = await acceptanceVariantFromHeaders(
    'overview-unavailable-and-no-work-states',
    ['unavailable', 'no-work'] as const,
  );
  if (acceptanceScenario === 'overview-dashboard-loading') return <SuppliedAuthenticatedRouteLoading />;
  await throwForAcceptanceScenario('overview-error');
  if (acceptanceScenario === 'authenticated-not-found') notFound();
  await throwForAcceptanceScenario('route-error-boundaries');
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
  const compare = range !== 'all' && params.compare !== 'none' ? 'previous' : 'none';
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
  if (!acceptanceState && report.recordCount === 0) {
    const [connection, orders] = await Promise.all([
      getCachedConnectionState(ctx.merchantId),
      service.from(TABLES.SOURCE_ORDERS).select('id', { count: 'exact', head: true }).eq('merchant_id', ctx.merchantId),
    ]);
    // A failed count is not an empty workspace. Existing imported orders also
    // keep the normal dashboard when a source becomes disconnected.
    if (connection.neitherConnected && !orders.error && orders.count === 0) {
      const [merchant, permissions] = await Promise.all([getMerchantProfileById(service, ctx.merchantId), getRequestPermissions()]);
      return <FirstRunOverview workspaceName={merchant?.name ?? null} permissions={permissions} />;
    }
  }
  const selectedCurrency = report.bridges.some(
    (bridge) => bridge.currency === requestedCurrency,
  )
    ? requestedCurrency ?? null
    : report.bridges[0]?.currency ?? null;

  return (
        <ExactDashboardOverview
          report={report}
          comparison={comparison}
          selectedCurrency={selectedCurrency}
          compare={compare}
          acceptanceState={acceptanceState}
        />
  );
}
