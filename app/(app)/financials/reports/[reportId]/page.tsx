import { notFound, redirect } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { getRequestUser } from '@/lib/auth/requestContext';
import { PERMISSIONS, requirePermission, resolveDefaultAppPath } from '@/lib/permissions';
import { merchantHasEntitlement } from '@/lib/product/requireEntitlement';
import { loadIntelligenceReport, parseReportRange, REPORT_DEFINITIONS } from '@/lib/reporting/intelligence';
import { NamedReportDetail } from '@/components/reports/NamedReportDetail';
import type { NamedReportMeasure } from '@/lib/reporting/namedReportContracts';
import { isNamedReportId } from '@/lib/reporting/namedReportContracts';
import { loadLatestReportRun, scopeIntelligenceReport, type ReportRunScope } from '@/lib/reporting/reportRuns';
import {
  acceptanceScenarioFromHeaders,
  delayForAcceptanceScenario,
  throwForAcceptanceScenario,
} from '@/lib/testing/acceptanceStateInjector';

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
  await delayForAcceptanceScenario('reports-and-records-loading');
  await throwForAcceptanceScenario('named-report-error');

  const range = parseReportRange(one(incoming.range));
  const timezoneCandidate = one(incoming.timezone);
  const timezone = timezoneCandidate && timezoneCandidate.length < 80 ? timezoneCandidate : 'UTC';
  const loadedReport = await loadIntelligenceReport(service, ctx.merchantId, range, timezone);
  const forceUnavailable = await acceptanceScenarioFromHeaders() === 'named-report-unavailable';
  const report = forceUnavailable
    ? { ...loadedReport, bridges: [], trend: [], causes: [], recoveries: [], recordCount: 0 }
    : loadedReport;
  const requestedCurrency = one(incoming.currency)?.toUpperCase();
  const availableCurrencies = report.bridges.map((bridge) => bridge.currency);
  const selectedCurrency = requestedCurrency && report.bridges.some((bridge) => bridge.currency === requestedCurrency)
    ? requestedCurrency
    : null;
  const measure: NamedReportMeasure = one(incoming.measure) === 'count' ? 'count' : 'amount';
  const page = Math.max(1, Number(one(incoming.page)) || 1);
  const scopedReport = scopeIntelligenceReport(report, selectedCurrency);
  const runScope: ReportRunScope = { range, timezone, currency: selectedCurrency, measure };
  const previousRun = isNamedReportId(reportId)
    ? await loadLatestReportRun(service, ctx.merchantId, reportId, runScope)
    : null;

  return <NamedReportDetail reportId={reportId} report={scopedReport} availableCurrencies={availableCurrencies} selectedCurrency={selectedCurrency} measure={measure} page={page} previousRun={previousRun} runScope={runScope} />;
}
