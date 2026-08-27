import Link from '@/components/navigation/AppNavLink';
import { activeWorkflowOperations } from '@/components/dashboard/dashboardModel';
import {
  REPORT_DEFINITIONS,
  financialMetricIsKnown,
  financialMetricValue,
  type IntelligenceReport,
  type MoneyBridge,
} from '@/lib/reporting/intelligence';
import {
  formatDateTime,
  formatMinorCurrencyNullable,
  formatNumber,
} from '@/lib/utils/format';

const REPORT_QUESTIONS: Record<(typeof REPORT_DEFINITIONS)[number]['id'], string> = {
  financial: 'How did requested value become final net loss?',
  'loss-causes': 'Which recorded causes dominate, and which are worsening?',
  prevention: 'How much observed exposure was never paid out?',
  recovery: 'How much recoverable value converts, and how quickly?',
  policy: 'Where do rule recommendations and merchant decisions diverge?',
  operations: 'Where is decision and response pressure building?',
  evidence: 'Which missing evidence blocks the most value?',
  coverage: 'Which source and object combinations are current, stale or missing?',
};

function scopedBridge(report: IntelligenceReport, selectedCurrency: string | null): MoneyBridge | null {
  if (selectedCurrency) {
    return report.bridges.find((bridge) => bridge.currency === selectedCurrency) ?? null;
  }
  return report.bridges.toSorted(
    (left, right) => right.caseIds.length - left.caseIds.length
      || right.requestedMinor - left.requestedMinor,
  )[0] ?? null;
}

function evidenceGapCount(report: IntelligenceReport): number {
  return activeWorkflowOperations(report.operations)
    .filter((row) => row.key.includes('evidence'))
    .reduce((sum, row) => sum + row.activeCount, 0);
}

function summaryFor(
  reportId: (typeof REPORT_DEFINITIONS)[number]['id'],
  report: IntelligenceReport,
  bridge: MoneyBridge | null,
) {
  if (reportId === 'financial') {
    return bridge
      ? `${formatNumber(bridge.caseIds.length)} cases · ${formatNumber(report.bridges.length)} ${report.bridges.length === 1 ? 'currency' : 'currencies'}`
      : 'Financial values unavailable';
  }
  if (reportId === 'loss-causes') return `${formatNumber(report.causes.filter((row) => !bridge || row.currency === bridge.currency).length)} ranked causes`;
  if (reportId === 'prevention') {
    if (!bridge || !financialMetricIsKnown(bridge, 'prevented')) return 'Prevented value unavailable';
    return `${formatMinorCurrencyNullable(financialMetricValue(bridge, 'prevented') ?? 0, bridge.currency)} prevented`;
  }
  if (reportId === 'recovery') return `${formatNumber(report.recoveries.filter((row) => !bridge || row.currency === bridge.currency).length)} recovery groups`;
  if (reportId === 'operations') {
    const open = activeWorkflowOperations(report.operations).reduce((sum, row) => sum + row.activeCount, 0);
    return `${formatNumber(open)} open cases`;
  }
  if (reportId === 'evidence') return `${formatNumber(evidenceGapCount(report))} open gaps`;
  if (reportId === 'coverage') return `${formatNumber(report.coverage.length)} object families`;
  return `${formatNumber(report.recordCount)} scoped records`;
}

function objectFamilyLabel(value: string): string {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function ReportCommandIndex({
  report,
  selectedReportId = null,
  selectedCurrency = null,
}: {
  report: IntelligenceReport;
  selectedReportId?: string | null;
  selectedCurrency?: string | null;
}) {
  const queryParams = new URLSearchParams({ range: report.range, timezone: report.timezone });
  if (selectedCurrency) queryParams.set('currency', selectedCurrency);
  const query = queryParams.toString();
  const bridge = scopedBridge(report, selectedCurrency);

  return (
      <section className="ua-report-card ua-report-command" aria-labelledby="report-command-index-title">
        <header>
          <h2 id="report-command-index-title">Open a report</h2>
          <p>Each report inherits this range, timezone and currency scope, then opens its own supporting records.</p>
        </header>
        <div className="ua-report-command-index">
          {REPORT_DEFINITIONS.map((definition) => (
            <Link
              key={definition.id}
              href={`/financials/reports/${definition.id}?${query}`}
              className="ua-report-command-index__row"
              data-selected={definition.id === selectedReportId ? 'true' : undefined}
              aria-current={definition.id === selectedReportId ? 'page' : undefined}
            >
              <strong>{definition.name}</strong>
              <span title={REPORT_QUESTIONS[definition.id]}>{REPORT_QUESTIONS[definition.id]}</span>
              <small>{summaryFor(definition.id, report, bridge)}</small>
              <i aria-hidden="true">›</i>
            </Link>
          ))}
        </div>
      </section>
  );
}

export function ReportSourceCoverage({ report }: { report: IntelligenceReport }) {
  return (
      <section className="ua-report-card ua-report-coverage" aria-labelledby="reports-source-coverage-title">
        <header>
          <h2 id="reports-source-coverage-title">Are the records behind these reports current?</h2>
          <p>Coverage is stated as a labelled status. Stale records stay in the report and are counted here.</p>
        </header>
        <div className="ua-report-coverage__table" role="table" aria-label="Source record coverage">
          <div className="ua-report-coverage__columns" role="row">
            <span role="columnheader">Object family</span>
            <span role="columnheader">Available</span>
            <span role="columnheader">Current</span>
            <span role="columnheader">Needs review</span>
            <span role="columnheader">Latest source record</span>
          </div>
          {report.coverage.map((row) => {
            const unavailable = row.records === 0;
            return (
              <Link key={row.objectType} href={row.href} className="ua-report-coverage__row" role="row">
                <strong role="cell">{objectFamilyLabel(row.objectType)}</strong>
                <span role="cell">{unavailable ? '— No records' : formatNumber(row.records)}</span>
                <span role="cell"><i data-state={unavailable ? 'unavailable' : row.freshRecords === row.records ? 'current' : 'attention'}>{unavailable ? 'Unavailable' : formatNumber(row.freshRecords)}</i></span>
                <span role="cell"><i data-state={unavailable ? 'unavailable' : row.staleRecords > 0 ? 'attention' : 'current'}>{unavailable ? 'Unavailable' : formatNumber(row.staleRecords)}</i></span>
                <small role="cell">{row.latestAt ? `${formatDateTime(row.latestAt)} — ${row.scope === 'internal' ? 'created in Unauth' : row.staleRecords > 0 ? 'sync needs review' : 'source current'}` : row.scope === 'internal' ? 'No cases recorded' : 'No source records available'}</small>
              </Link>
            );
          })}
        </div>
        <footer>Object families with no available source records show freshness as unavailable rather than zero.</footer>
      </section>
  );
}
