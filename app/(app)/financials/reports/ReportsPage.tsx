import { ClaimPatternsView } from '@/components/reports/ClaimPatternsView';
import { PATTERN_DIMENSIONS, type PatternDimension } from '@/lib/reporting/claimPatterns';
import { loadClaimPatterns, claimPatternFingerprint } from '@/lib/reporting/claimPatternRead';
import { hasPermission } from '@/lib/permissions';
import { redirect } from "next/navigation";
import {
  getRequestServiceClient,
  getRequestUser,
  requirePagePermission,
} from "@/lib/auth/requestContext";
import {
  PERMISSIONS,
  resolveDefaultAppPath,
} from "@/lib/permissions";
import { SuppliedReportsView } from '@/components/reports/SuppliedReportsView';
import { loadDashboardPeriodComparison, loadIntelligenceReport, parseReportRange, REPORT_DEFINITIONS } from "@/lib/reporting/intelligence";
import { merchantHasEntitlement } from "@/lib/product/requireEntitlement";
import { now } from "@/lib/time/clock";
import {
  acceptanceScenarioFromHeaders,
  delayForAcceptanceScenario,
  throwForAcceptanceScenario,
} from "@/lib/testing/acceptanceStateInjector";

export const dynamic = "force-dynamic";
export default async function ReportsPage({
  searchParams,
}: {
    searchParams: Promise<{ range?: string; timezone?: string; currency?: string; compare?: string; report?: string }>;
}) {
  const [user, ctx] = await Promise.all([
    getRequestUser(),
    requirePagePermission(PERMISSIONS.VIEW_AUDIT),
  ]);
  if (!user) redirect("/login");
  const svc = getRequestServiceClient();
  if (!ctx) redirect(await resolveDefaultAppPath(svc, user.id));
  if (!(await merchantHasEntitlement(svc, ctx.merchantId, "REPORTS_ADVANCED")))
    redirect("/settings/billing?required=REPORTS_ADVANCED");
  await delayForAcceptanceScenario("reports-and-records-loading");
  await throwForAcceptanceScenario("reports-error");
  const sp = await searchParams;
  const range = parseReportRange(sp.range);
  const timezone = sp.timezone && sp.timezone.length < 80 ? sp.timezone : "UTC";
  const compare: 'none' | 'previous' = range !== 'all' && sp.compare === 'previous' ? 'previous' : 'none';
  const selectedReportId = REPORT_DEFINITIONS.some((definition) => definition.id === sp.report) ? sp.report ?? null : null;
  const asOf = now();
  if (PATTERN_DIMENSIONS.includes(sp.report as PatternDimension)) {
    const [patterns, canInvestigate, canExport] = await Promise.all([
      loadClaimPatterns(svc, ctx.merchantId, range, timezone, asOf),
      hasPermission(svc, ctx, PERMISSIONS.SUBMIT_PAYOUT_DECISIONS),
      hasPermission(svc, ctx, PERMISSIONS.EXPORT_AUDIT),
    ]);
    return <ClaimPatternsView key={claimPatternFingerprint(patterns)} report={patterns} dimension={sp.report as PatternDimension} range={range} fingerprint={claimPatternFingerprint(patterns)} canInvestigate={canInvestigate} canExport={canExport}/>;
  }
  const [loadedReport, previous] = await Promise.all([
    loadIntelligenceReport(svc, ctx.merchantId, range, timezone, { asOf }),
    loadDashboardPeriodComparison(svc, ctx.merchantId, range, asOf, timezone),
  ]);
  const forceUnavailableZero = await acceptanceScenarioFromHeaders() === "reports-unavailable-zero";
  const report = forceUnavailableZero
    ? { ...loadedReport, bridges: [], trend: [], causes: [], operations: [], recoveries: [], coverage: [], recordCount: 0 }
    : loadedReport;
  const requestedCurrency = sp.currency?.toUpperCase();
  const selectedCurrency = requestedCurrency && report.bridges.some((bridge) => bridge.currency === requestedCurrency) ? requestedCurrency : null;
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
  return <SuppliedReportsView report={scopedReport} selectedCurrency={selectedCurrency} compare={compare} selectedReportId={selectedReportId} previous={previous} />;
}
