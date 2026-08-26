import Link from 'next/link';
import { ChartFrame, ChartLegend, ChartState, type ChartDataTableModel } from '@/components/charts/authenticated/ChartFrame';
import { RankedContributionChart } from '@/components/charts/authenticated/RankedContributionChart';
import { StatusMatrix } from '@/components/charts/authenticated/StatusMatrix';
import { FinancialWaterfallChart } from '@/components/charts/authenticated/financial/WaterfallChart';
import { StageDotPlot, type StageDotPlotRow } from '@/components/charts/authenticated/operational/StageDotPlot';
import { FilterChip } from '@/components/ui';
import {
  financialMetricValue,
  financialReportRecordsHref,
  type IntelligenceReport,
} from '@/lib/reporting/intelligence';
import {
  buildEvidenceGapRows,
  buildFinancialWaterfall,
  buildMetricSeries,
  buildSlaPressureRows,
  coverageState,
  NAMED_REPORT_CONTRACTS,
  type IntervalCumulativePoint,
  type NamedReportId,
  type NamedReportMeasure,
} from '@/lib/reporting/namedReportContracts';
import { formatDateTime, formatMinorCurrencyNullable, formatNumber } from '@/lib/utils/format';
import { TIME_RANGE_LABELS } from '@/lib/ui/merchantCopy';
import { proportionalLength } from '@/lib/visualisation/proportionalLength';

function recordsHref(reportId: NamedReportId, report: IntelligenceReport, currency?: string) {
  const params = new URLSearchParams({ reportId, range: report.range, timezone: report.timezone });
  if (currency) params.set('currency', currency);
  return `/financials/reports/records?${params.toString()}`;
}

function measureHref(reportId: NamedReportId, report: IntelligenceReport, measure: NamedReportMeasure, currency: string | null) {
  const params = new URLSearchParams({ range: report.range, timezone: report.timezone, measure });
  if (currency) params.set('currency', currency);
  return `/financials/reports/${reportId}?${params.toString()}`;
}

function MeasureSwitch({ reportId, report, measure, currency, amountAvailable = true }: {
  reportId: NamedReportId;
  report: IntelligenceReport;
  measure: NamedReportMeasure;
  currency: string | null;
  amountAvailable?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Chart measure">
      <FilterChip active={measure === 'amount'} disabled={!amountAvailable} href={amountAvailable ? measureHref(reportId, report, 'amount', currency) : undefined}>Amount</FilterChip>
      <FilterChip active={measure === 'count'} href={measureHref(reportId, report, 'count', currency)}>Count</FilterChip>
    </div>
  );
}

function chartTable(points: IntervalCumulativePoint[], currency: string): ChartDataTableModel {
  return {
    caption: `Interval and cumulative values (${currency})`,
    columns: [
      { key: 'period', header: 'Period' },
      { key: 'interval', header: 'Added', numeric: true },
      { key: 'cumulative', header: 'To date', numeric: true },
    ],
    rows: points.map((point) => ({
      key: point.key,
      header: point.label,
      values: [
        formatMinorCurrencyNullable(point.intervalMinor, currency),
        formatMinorCurrencyNullable(point.cumulativeMinor, currency),
      ],
    })),
  };
}

function IntervalCumulativeChart({
  id,
  question,
  summary,
  report,
  currency,
  points,
  recordMetric,
}: {
  id: string;
  question: string;
  summary: string;
  report: IntelligenceReport;
  currency: string;
  points: IntervalCumulativePoint[];
  recordMetric: 'confirmed_loss' | 'prevented';
}) {
  const maximum = Math.max(0, ...points.map((point) => point.cumulativeMinor));
  const scale = maximum || 1;
  const linePoints = points.map((point, index) => {
    const x = points.length === 1 ? 50 : (index / (points.length - 1)) * 100;
    const y = 94 - (point.cumulativeMinor / scale) * 82;
    return `${x},${y}`;
  }).join(' ');
  const recordLink = financialReportRecordsHref({
    range: report.range,
    currency,
    metric: recordMetric,
    timezone: report.timezone,
  });

  return (
    <ChartFrame
      id={id}
      kind="interval-cumulative"
      question={question}
      summary={summary}
      scope={`${currency} · ${TIME_RANGE_LABELS[report.range]} · ${report.timezone}`}
      legend={<ChartLegend items={[{ label: 'Interval added', tone: 'analytical-secondary' }, { label: 'Cumulative to date', tone: 'analytical-actual' }]} />}
      freshness={`Generated ${formatDateTime(report.generatedAt)}`}
      records={{ href: recordLink, label: 'View contributing records' }}
      table={points.length ? chartTable(points, currency) : undefined}
    >
      {points.length ? (
        <div className="ua-interval-cumulative" aria-label={`${question}. Exact values are available in View chart data.`}>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <polyline points={linePoints} />
          </svg>
          <div className="ua-interval-cumulative__bars" aria-hidden="true">
            {points.map((point) => (
              <span key={point.key}>
                <i style={{ height: `${Math.max(point.intervalMinor > 0 ? 3 : 0, (point.intervalMinor / scale) * 100)}%` }} />
                <small title={point.label}>{point.label}</small>
              </span>
            ))}
          </div>
          <strong>{formatMinorCurrencyNullable(points.at(-1)?.cumulativeMinor ?? 0, currency)} to date</strong>
        </div>
      ) : (
        <ChartState kind="empty" title="No dated values in this scope" description="The query completed without a dated value for this metric. Nothing has been inferred." />
      )}
    </ChartFrame>
  );
}

function FinancialReport({ report }: { report: IntelligenceReport }) {
  if (!report.bridges.length) return <ReportUnavailable title="Financial stages are unavailable" description="No verified currency and financial-stage projection exists in this scope." />;
  return (
    <div className="space-y-6" data-report-identity="financial-stage-waterfall">
      {report.bridges.map((bridge) => {
        const waterfall = buildFinancialWaterfall(bridge);
        const stepRows: StageDotPlotRow[] = [
          ['requested', 'Requested value'],
          ['exposed', 'Maximum exposure'],
          ['paid', 'Observed payout'],
          ['confirmed_loss', 'Confirmed loss'],
          ['final_net_loss', 'Final net loss'],
        ].map(([metric, label]) => {
          const value = financialMetricValue(bridge, metric as Parameters<typeof financialMetricValue>[1]);
          return {
            key: metric,
            label,
            value,
            displayValue: value == null ? 'Unavailable' : formatMinorCurrencyNullable(value, bridge.currency),
            tone: metric === 'final_net_loss' ? 'negative' as const : 'primary' as const,
            href: financialReportRecordsHref({ range: report.range, currency: bridge.currency, metric: metric as Parameters<typeof financialMetricValue>[1], timezone: report.timezone }),
          };
        });
        return (
          <section key={bridge.currency} className="space-y-4" aria-label={`${bridge.currency} financial performance`}>
            <FinancialWaterfallChart
              id={`named-financial-waterfall-${bridge.currency}`}
              question="What remains after recovered cash?"
              summary="Confirmed loss minus reconciled recovered cash equals final net loss"
              currency={bridge.currency}
              steps={waterfall.steps.map((step) => ({ ...step, outcome: step.key === 'recovered' ? 'recovered' as const : 'realised' as const, href: financialReportRecordsHref({ range: report.range, currency: bridge.currency, metric: step.key === 'confirmed-loss' ? 'confirmed_loss' : step.key === 'recovered' ? 'recovered' : 'final_net_loss', timezone: report.timezone }) }))}
              reconciled={waterfall.reconciled}
              unavailableReason="Confirmed loss, recovered cash, and final net loss do not form a complete reconciled equation in this scope."
            />
            <ChartFrame
              id={`named-financial-stages-${bridge.currency}`}
              kind="financial-stage-dot-plot"
              question="Where does value sit across the decision ledger?"
              summary="Financial stages share one scale but do not imply a monotonic funnel"
              scope={`${bridge.currency} · ${TIME_RANGE_LABELS[report.range]}`}
              freshness={`Generated ${formatDateTime(report.generatedAt)}`}
              records={{ href: recordsHref('financial', report, bridge.currency), label: 'View stage records' }}
              table={{
                columns: [{ key: 'stage', header: 'Stage' }, { key: 'value', header: 'Value', numeric: true }],
                rows: stepRows.map((row) => ({ key: row.key, header: row.label, headerHref: row.href, values: [row.displayValue] })),
              }}
              compact
            >
              <StageDotPlot rows={stepRows} />
            </ChartFrame>
          </section>
        );
      })}
    </div>
  );
}

function LossCausesReport({ report, measure, selectedCurrency }: { report: IntelligenceReport; measure: NamedReportMeasure; selectedCurrency: string | null }) {
  return (
    <div className="space-y-6" data-report-identity="loss-cause-contribution">
      <MeasureSwitch reportId="loss-causes" report={report} measure={measure} currency={selectedCurrency} />
      {report.bridges.map((bridge) => {
        const causes = report.causes.filter((row) => row.currency === bridge.currency);
        return (
          <section key={bridge.currency} className="grid gap-4 xl:grid-cols-2">
            <RankedContributionChart
              id={`named-loss-causes-${bridge.currency}`}
              title="Which causes dominate confirmed loss?"
              description={`${measure === 'amount' ? 'Confirmed loss value' : 'Supporting record count'} · ${bridge.currency}`}
              items={causes.map((row) => ({
                label: row.label,
                value: measure === 'amount' ? row.amountMinor : row.count,
                displayValue: measure === 'amount' ? formatMinorCurrencyNullable(row.amountMinor, row.currency) : formatNumber(row.count),
                detail: `${formatNumber(row.count)} ${row.count === 1 ? 'record' : 'records'}`,
                href: row.href,
                tone: 'negative',
              }))}
              records={{ href: recordsHref('loss-causes', report, bridge.currency), label: 'View cause records' }}
              causeRamp
            />
            <IntervalCumulativeChart
              id={`named-loss-timing-${bridge.currency}`}
              question="When is confirmed loss landing?"
              summary="Interval additions and cumulative confirmed loss; cause split remains in the ranked view and disclosure"
              report={report}
              currency={bridge.currency}
              points={buildMetricSeries(report, bridge.currency, 'realisedLossMinor')}
              recordMetric="confirmed_loss"
            />
          </section>
        );
      })}
      {!report.bridges.length ? <ReportUnavailable title="Loss causes are unavailable" description="No confirmed-loss currency projection exists for this scope." /> : null}
    </div>
  );
}

function PreventionReport({ report }: { report: IntelligenceReport }) {
  return (
    <div className="space-y-6" data-report-identity="prevention-interval-cumulative">
      {report.bridges.map((bridge) => (
        <IntervalCumulativeChart
          key={bridge.currency}
          id={`named-prevention-${bridge.currency}`}
          question="How much observed exposure reached a verified prevented state?"
          summary="Interval prevented value and its unsmoothed cumulative total"
          report={report}
          currency={bridge.currency}
          points={buildMetricSeries(report, bridge.currency, 'preventedMinor')}
          recordMetric="prevented"
        />
      ))}
      {!report.bridges.length ? <ReportUnavailable title="Prevented value is unavailable" description="No verified currency projection exists for prevented exposure in this scope." /> : null}
    </div>
  );
}

function RecoveryReport({ report }: { report: IntelligenceReport }) {
  return (
    <div className="space-y-6" data-report-identity="recovery-stage-balance">
      {report.bridges.map((bridge) => {
        const stages = report.recoveries.filter((row) => row.currency === bridge.currency);
        return (
          <RankedContributionChart
            key={bridge.currency}
            id={`named-recovery-stage-${bridge.currency}`}
            title="Where is recorded recovered cash sitting now?"
            description={`Recovered cash grouped by current recovery status · ${bridge.currency}`}
            items={stages.map((row) => ({ label: row.label, value: row.amountMinor, displayValue: formatMinorCurrencyNullable(row.amountMinor, row.currency), detail: `${formatNumber(row.count)} records`, href: row.href, tone: 'secondary' }))}
            records={{ href: recordsHref('recovery', report, bridge.currency), label: 'View recovery records' }}
          />
        );
      })}
      <ChartFrame id="named-recovery-cohorts" kind="recovery-cohort-curves" question="How quickly do submission cohorts convert?" summary="Conversion by submission week requires immutable submission and conversion events" scope={TIME_RANGE_LABELS[report.range]}>
        <ChartState kind="unavailable" title="Cohort speed is unavailable" description="The current report projection has recovery status and recovered cash, but not an immutable conversion-event timestamp. Updated-at values are not used as a substitute." />
      </ChartFrame>
    </div>
  );
}

function PolicyReport({ report }: { report: IntelligenceReport }) {
  return (
    <div data-report-identity="policy-decision-composition">
      <ChartFrame id="named-policy-composition" kind="policy-decision-composition" question={NAMED_REPORT_CONTRACTS.policy.question} summary="Accepted, overridden, and declined outcomes must be joined to the policy version in force" scope={`${TIME_RANGE_LABELS[report.range]} · ${report.timezone}`}>
        <ChartState kind="unavailable" title="Policy outcome composition is unavailable" description="The current named-report projection does not load versioned recommendation snapshots and merchant decisions. Case status is not treated as a policy outcome." action={<Link className="ua-text-label text-[var(--uo-route-action-primary)]" href={recordsHref('policy', report)}>Inspect scoped records</Link>} />
      </ChartFrame>
    </div>
  );
}

function OperationsReport({ report }: { report: IntelligenceReport }) {
  const rows = buildSlaPressureRows(report);
  const maximum = Math.max(0, ...rows.map((row) => row.total));
  const table: ChartDataTableModel = {
    columns: [{ key: 'state', header: 'Workflow state' }, { key: 'healthy', header: 'Healthy', numeric: true }, { key: 'due', header: 'Due soon', numeric: true }, { key: 'overdue', header: 'Overdue', numeric: true }, { key: 'total', header: 'Open', numeric: true }],
    rows: rows.map((row) => ({ key: row.key, header: row.label, headerHref: row.href, values: [formatNumber(row.healthy), formatNumber(row.dueSoon), formatNumber(row.overdue), formatNumber(row.total)] })),
  };
  return (
    <div className="space-y-6" data-report-identity="operations-sla-pressure">
      <ChartFrame id="named-operations-sla" kind="operations-sla-pressure" question={NAMED_REPORT_CONTRACTS.operations.question} summary="Current healthy, due-soon, and overdue cases by workflow state" scope={`${TIME_RANGE_LABELS[report.range]} · count scale`} legend={<ChartLegend items={[{ label: 'Healthy', tone: 'analytical-remainder' }, { label: 'Due soon', tone: 'analytical-comparison' }, { label: 'Overdue', tone: 'outcome-realised' }]} />} freshness={`Generated ${formatDateTime(report.generatedAt)}`} records={{ href: recordsHref('operations', report), label: 'View owner and state records' }} table={rows.length ? table : undefined}>
        {rows.length ? (
          <div className="ua-sla-pressure" aria-label="SLA pressure by workflow state">
            {rows.slice(0, 8).map((row) => (
              <Link key={row.key} href={row.href} className="ua-sla-pressure__row">
                <span>{row.label}</span>
                <i aria-hidden="true"><span style={{ width: `${proportionalLength(row.total, maximum)}%` }}>
                  <b data-tone="healthy" style={{ width: `${proportionalLength(row.healthy, row.total)}%` }} />
                  <b data-tone="due" style={{ width: `${proportionalLength(row.dueSoon, row.total)}%` }} />
                  <b data-tone="overdue" style={{ width: `${proportionalLength(row.overdue, row.total)}%` }} />
                </span></i>
                <strong>{formatNumber(row.total)}</strong>
              </Link>
            ))}
          </div>
        ) : <ChartState kind="empty" title="No open SLA workload" description="The query completed without an active, unsnoozed workflow state in this scope." />}
      </ChartFrame>
      <ChartFrame id="named-operations-throughput" kind="operations-throughput-history" question="Is throughput keeping pace with opened work?" summary="Opened, completed, and closing backlog require immutable lifecycle event dates" scope={TIME_RANGE_LABELS[report.range]} compact>
        <ChartState kind="unavailable" title="Throughput history is unavailable" description="The current projection exposes present workload and SLA state, not a complete opened/completed event series. Mutable updated-at timestamps are not presented as completions." />
      </ChartFrame>
    </div>
  );
}

function EvidenceReport({ report, measure, selectedCurrency }: { report: IntelligenceReport; measure: NamedReportMeasure; selectedCurrency: string | null }) {
  const amountCurrency = selectedCurrency ?? (report.bridges.length === 1 ? report.bridges[0].currency : null);
  const effectiveMeasure = measure === 'amount' && !amountCurrency ? 'count' : measure;
  const rows = buildEvidenceGapRows(report, effectiveMeasure, amountCurrency);
  return (
    <div className="space-y-4" data-report-identity="evidence-gap-contribution">
      <MeasureSwitch reportId="evidence" report={report} measure={effectiveMeasure} currency={amountCurrency} amountAvailable={Boolean(amountCurrency)} />
      {measure === 'amount' && !amountCurrency ? <p role="status" className="ua-text-caption-role">Select one currency before comparing blocked value. Count remains visible.</p> : null}
      <RankedContributionChart
        id="named-evidence-gaps"
        title={NAMED_REPORT_CONTRACTS.evidence.question}
        description={effectiveMeasure === 'amount' ? `Known exposure in evidence-waiting workflow states · ${amountCurrency}` : 'Active cases in evidence-waiting workflow states'}
        items={rows.map((row) => ({ label: row.label, value: row.value, displayValue: effectiveMeasure === 'amount' ? formatMinorCurrencyNullable(row.amountMinor, amountCurrency) : formatNumber(row.count), detail: `${formatNumber(row.count)} blocked ${row.count === 1 ? 'case' : 'cases'}`, href: row.href, tone: 'attention' }))}
        records={{ href: recordsHref('evidence', report, amountCurrency ?? undefined), label: 'View missing-evidence records' }}
      />
    </div>
  );
}

function CoverageReport({ report }: { report: IntelligenceReport }) {
  return (
    <div data-report-identity="source-object-status-matrix">
      <StatusMatrix
        id="named-source-coverage"
        question={NAMED_REPORT_CONTRACTS.coverage.question}
        summary="Each object family stays explicit; unavailable families are never averaged into a health score"
        columns={['Merchant projection']}
        rows={report.coverage.map((row) => ({
          key: row.objectType,
          label: row.objectType,
          cells: [{
            label: coverageState(row),
            detail: `${formatNumber(row.freshRecords)} of ${formatNumber(row.records)} current${row.latestAt ? ` · ${formatDateTime(row.latestAt)}` : ''}`,
            state: coverageState(row),
            href: row.href,
          }],
        }))}
        freshness={`48-hour freshness window · generated ${formatDateTime(report.generatedAt)}`}
      />
    </div>
  );
}

function ReportUnavailable({ title, description }: { title: string; description: string }) {
  return <ChartFrame id="named-report-unavailable" kind="named-report-unavailable" question="What does this report show?" summary="The report remains scoped and traceable even when its required projection is absent"><ChartState kind="unavailable" title={title} description={description} /></ChartFrame>;
}

export function NamedReportAnalytics({
  reportId,
  report,
  measure,
  selectedCurrency,
}: {
  reportId: NamedReportId;
  report: IntelligenceReport;
  measure: NamedReportMeasure;
  selectedCurrency: string | null;
}) {
  if (reportId === 'financial') return <FinancialReport report={report} />;
  if (reportId === 'loss-causes') return <LossCausesReport report={report} measure={measure} selectedCurrency={selectedCurrency} />;
  if (reportId === 'prevention') return <PreventionReport report={report} />;
  if (reportId === 'recovery') return <RecoveryReport report={report} />;
  if (reportId === 'policy') return <PolicyReport report={report} />;
  if (reportId === 'operations') return <OperationsReport report={report} />;
  if (reportId === 'evidence') return <EvidenceReport report={report} measure={measure} selectedCurrency={selectedCurrency} />;
  return <CoverageReport report={report} />;
}
