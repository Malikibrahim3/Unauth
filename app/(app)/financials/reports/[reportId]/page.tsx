import { notFound, redirect } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { getRequestUser } from '@/lib/auth/requestContext';
import { PERMISSIONS, requirePermission, resolveDefaultAppPath } from '@/lib/permissions';
import { merchantHasEntitlement } from '@/lib/product/requireEntitlement';
import { loadIntelligenceReport, parseReportRange, REPORT_DEFINITIONS } from '@/lib/reporting/intelligence';
import { NamedReportDetail } from '@/components/reports/NamedReportDetail';
import type { NamedReportMeasure } from '@/lib/reporting/namedReportContracts';

export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ReportDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ reportId: string }>;
  searchParams?: Promise<SearchParams>;
}) {
  const [{ reportId }, incoming] = await Promise.all([params, searchParams ?? Promise.resolve({} as SearchParams)]);
  if (!REPORT_DEFINITIONS.some((definition) => definition.id === reportId)) notFound();
  const user = await getRequestUser();
  if (!user) redirect('/login');
  const service = createServiceClient();
  const { denied, ctx } = await requirePermission(service, user.id, PERMISSIONS.VIEW_AUDIT);
  if (denied) redirect(await resolveDefaultAppPath(service, user.id));
  if (!(await merchantHasEntitlement(service, ctx.merchantId, 'REPORTS_ADVANCED'))) redirect('/settings/billing?required=REPORTS_ADVANCED');

  const range = parseReportRange(one(incoming.range));
  const timezoneCandidate = one(incoming.timezone);
  const timezone = timezoneCandidate && timezoneCandidate.length < 80 ? timezoneCandidate : 'UTC';
  const report = await loadIntelligenceReport(service, ctx.merchantId, range, timezone);
  const requestedCurrency = one(incoming.currency)?.toUpperCase();
  const availableCurrencies = report.bridges.map((bridge) => bridge.currency);
  const selectedCurrency = requestedCurrency && report.bridges.some((bridge) => bridge.currency === requestedCurrency)
    ? requestedCurrency
    : null;
  const measure: NamedReportMeasure = one(incoming.measure) === 'count' ? 'count' : 'amount';
  const page = Math.max(1, Number(one(incoming.page)) || 1);
  const scopedReport = selectedCurrency
    ? {
        ...report,
        bridges: report.bridges.filter((bridge) => bridge.currency === selectedCurrency),
        trend: report.trend.filter((point) => point.currency === selectedCurrency),
        causes: report.causes.filter((row) => row.currency === selectedCurrency),
        recoveries: report.recoveries.filter((row) => row.currency === selectedCurrency),
        operations: report.operations.map((row) => ({ ...row, exposureByCurrency: row.exposureByCurrency.filter((entry) => entry.currency === selectedCurrency) })),
      }
    : report;

  return <NamedReportDetail reportId={reportId} report={scopedReport} availableCurrencies={availableCurrencies} selectedCurrency={selectedCurrency} measure={measure} page={page} />;
}
