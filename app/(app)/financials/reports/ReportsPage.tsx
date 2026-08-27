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
import { IntelligenceReportView } from "@/components/reporting/IntelligenceReportView";
import { loadIntelligenceReport, parseReportRange, REPORT_DEFINITIONS } from "@/lib/reporting/intelligence";
import { merchantHasEntitlement } from "@/lib/product/requireEntitlement";
import { PageFrame } from "@/components/ui/PageFrame";
import { ReportsActions, ReportsScope, ReportsTabs, ReportsTrustLine } from "@/components/reports/ReportsChrome";
import { now } from "@/lib/time/clock";

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
  const sp = await searchParams;
  const range = parseReportRange(sp.range);
  const timezone = sp.timezone && sp.timezone.length < 80 ? sp.timezone : "UTC";
  const compare: 'none' | 'previous' = range !== 'all' && sp.compare === 'previous' ? 'previous' : 'none';
  const selectedReportId = REPORT_DEFINITIONS.some((definition) => definition.id === sp.report) ? sp.report ?? null : null;
  const asOf = now();
  const report = await loadIntelligenceReport(svc, ctx.merchantId, range, timezone, { asOf });
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
  const reportsQuery = { range, timezone: report.timezone, currency: selectedCurrency, compare, report: selectedReportId };
  return (
    <PageFrame
      title="Reports"
      subtitle="One scope, applied to every report. Trace requested value through final net loss, and open the immutable records behind any figure."
      breadcrumbs={[{ label: 'Financials', href: '/financials/losses' }, { label: 'Reports' }]}
      showCurrentBreadcrumb
      actions={<ReportsActions query={reportsQuery} />}
      tabs={<ReportsTabs view="index" query={reportsQuery} />}
      headerCapabilityId="operations-reports"
      surfaceId="financial-reports"
      archetype="P9"
      toolbar={<><ReportsScope report={report} selectedCurrency={selectedCurrency} compare={compare} reportId={selectedReportId} /><ReportsTrustLine report={report} selectedCurrency={selectedCurrency} /></>}
    >
        <section className="ua-reports-workspace">
          <IntelligenceReportView report={scopedReport} selectedReportId={selectedReportId} selectedCurrency={selectedCurrency ?? null} />
        </section>
    </PageFrame>
  );
}
