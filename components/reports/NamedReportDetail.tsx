import Link from 'next/link';
import { notFound } from 'next/navigation';
import { NamedReportAnalytics } from '@/components/reports/NamedReportAnalytics';
import { PageFrame, Surface, UnavailableValue } from '@/components/ui';
import { ReportsActions, ReportsScope, ReportsTabs, ReportsTrustLine } from '@/components/reports/ReportsChrome';
import { NamedFinancialReport } from '@/components/reports/NamedFinancialReport';
import { REPORT_DEFINITIONS, type IntelligenceReport } from '@/lib/reporting/intelligence';
import {
  formatNamedReportReference,
  isNamedReportId,
  NAMED_REPORT_CONTRACTS,
  type NamedReportId,
  type NamedReportMeasure,
} from '@/lib/reporting/namedReportContracts';
import { formatDateTime } from '@/lib/utils/format';

export function NamedReportDetail({
  reportId,
  report,
  availableCurrencies,
  selectedCurrency,
  measure,
  page,
}: {
  reportId: string;
  report: IntelligenceReport;
  availableCurrencies: string[];
  selectedCurrency: string | null;
  measure: NamedReportMeasure;
  page: number;
}) {
  const definition = REPORT_DEFINITIONS.find((item) => item.id === reportId);
  if (!definition || !isNamedReportId(reportId)) notFound();
  const namedReportId: NamedReportId = reportId;
  const recordsParams = new URLSearchParams({ reportId: namedReportId, range: report.range, timezone: report.timezone });
  if (selectedCurrency) recordsParams.set('currency', selectedCurrency);
  if (page > 1) recordsParams.set('page', String(page));
  const reportsQuery = { range: report.range, timezone: report.timezone, currency: selectedCurrency, compare: 'none' as const, report: namedReportId };

  return (
    <PageFrame
      title={definition.name}
      subtitle="A single operating question, answered at the scope set above, with the records that produced it."
      breadcrumbs={[{ label: 'Financials', href: '/financials/losses' }, { label: 'Reports', href: '/financials/reports' }, { label: definition.name }]}
      showCurrentBreadcrumb
      surfaceId="named-report-record-view"
      archetype="P9/P7"
      headerCapabilityId="operations-reports"
      tabs={<ReportsTabs view="report" query={reportsQuery} />}
      actions={<ReportsActions query={reportsQuery} />}
      toolbar={<><ReportsScope report={report} selectedCurrency={selectedCurrency} compare="none" reportId={namedReportId} basePath={`/financials/reports/${namedReportId}`} currencies={availableCurrencies} /><ReportsTrustLine report={report} selectedCurrency={selectedCurrency} /></>}
    >
      <div className="ua-reports-content">
        {namedReportId === 'financial' ? <NamedFinancialReport report={report} recordsHref={`/financials/reports/records?${recordsParams.toString()}`} selectedCurrency={selectedCurrency} /> : <>
        <section className="ua-named-report-intent" aria-labelledby="named-report-question">
          <div>
            <h2 id="named-report-question">{NAMED_REPORT_CONTRACTS[namedReportId].question}</h2>
            <p>{definition.definition}</p>
          </div>
          <span>{report.recordCount} scoped {report.recordCount === 1 ? 'record' : 'records'}</span>
        </section>
        <div className="ua-named-report-layout">
          <div className="min-w-0"><NamedReportAnalytics reportId={namedReportId} report={report} measure={measure} selectedCurrency={selectedCurrency} /></div>
          <aside className="space-y-4" aria-label="Report definition and delivery">
            <Surface structure="working" className="overflow-hidden">
              <div className="border-b border-[var(--uo-route-border-subtle)] p-4"><h2 className="ua-text-section-title">Definition</h2><p className="ua-text-body mt-2 text-[var(--uo-route-text-secondary)]">{definition.definition}</p></div>
              <dl className="divide-y divide-[var(--uo-route-border-hairline)]">
                <div className="p-4"><dt className="ua-text-metadata">Report reference</dt><dd className="ua-text-dense mt-1 select-all font-mono [overflow-wrap:anywhere]">{formatNamedReportReference(namedReportId)}</dd></div>
                <div className="p-4" data-state-id="named-report-unavailable"><dt className="ua-text-metadata">Owner</dt><dd className="mt-1"><UnavailableValue reason="No persisted saved-report owner is available" /></dd></div>
                <div className="p-4"><dt className="ua-text-metadata">Schedule</dt><dd className="ua-text-dense mt-1">Manual run</dd><p className="ua-text-caption-role mt-1">No persisted schedule or delivery destination is available.</p></div>
              </dl>
            </Surface>
            <Surface structure="inset" className="p-4">
              <h2 className="ua-text-working-title">Run history</h2>
              <ol className="mt-3 border-t border-[var(--uo-route-border-subtle)]">
                <li className="flex items-start justify-between gap-3 border-b border-[var(--uo-route-border-subtle)] py-3"><span><span className="ua-text-dense block font-medium">Current on-demand run</span><span className="ua-text-metadata mt-1 block">{report.recordCount} scoped records</span></span><time className="ua-text-metadata shrink-0">{formatDateTime(report.generatedAt)}</time></li>
              </ol>
              <p className="ua-text-caption-role mt-3">Earlier runs are unavailable because this route is not backed by a persisted saved-report object.</p>
            </Surface>
          </aside>
        </div>
        <Surface structure="inset" className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div><h2 className="ua-text-working-title">Immutable supporting records</h2><p className="ua-text-caption-role mt-1">Open the scoped registry to inspect the rows behind this run.</p></div>
          <Link href={`/financials/reports/records?${recordsParams.toString()}`} className="ua-text-label text-[var(--uo-route-action-primary)] underline underline-offset-2">Open supporting records</Link>
        </Surface>
        </>}
      </div>
    </PageFrame>
  );
}
