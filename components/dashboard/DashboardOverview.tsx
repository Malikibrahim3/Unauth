'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
} from 'lucide-react';
import ExportMenu from '@/components/reports/ExportMenu';
import { Modal, SourceBeacon } from '@/components/ui';
import { ChartState, type ChartDataTableModel } from '@/components/charts/authenticated/ChartFrame';
import type {
  DashboardPeriodComparison,
  IntelligenceReport,
} from '@/lib/reporting/intelligence';
import {
  financialReportRecordsHref,
  REPORT_RANGES,
  type FinancialReportMetric,
} from '@/lib/reporting/intelligence';
import { ButtonLink } from '@/components/ui/ButtonLink';
import {
  formatCurrencyCompact,
  formatDateAbsolute,
  formatMoney,
  formatMinorCurrencyNullable,
  formatNumber,
} from '@/lib/utils/format';
import { fromMinorUnits } from '@/lib/canonical/money';
import {
  bridgeMetricValue,
  buildDashboardAttentionPriorities,
  buildDashboardChartBuckets,
  buildDashboardOperatingStatement,
  calculateDecisionSafety,
  calculateSourceFreshness,
  comparisonLabel,
  DASHBOARD_METRICS,
  dashboardBucketBasisLabel,
  summarizeDashboardWork,
  type DashboardAttentionPriority,
  type DashboardMetricKey,
} from './dashboardModel';
import { TIME_RANGE_LABELS } from '@/lib/ui/merchantCopy';
import { DashboardPositionChart } from './DashboardPositionChart';
import { DecisionHeader } from '@/components/authenticated/DecisionHeader';
import { ScopeStrip } from '@/components/authenticated/ScopeStrip';
import styles from './dashboardPilot.module.css';

type DashboardOverviewProps = {
  report: IntelligenceReport;
  comparison: DashboardPeriodComparison | null;
  selectedCurrency: string | null;
  compare: 'previous' | 'none';
};

const DASHBOARD_REPORT_METRICS: Record<DashboardMetricKey, FinancialReportMetric> = {
  exposure: 'exposed',
  recovered: 'recovered',
  prevented: 'prevented',
  realisedLoss: 'confirmed_loss',
};

function FilterSelect({
  label,
  value,
  disabled = false,
  onChange,
  children,
  capabilityId,
}: {
  label: string;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  children: React.ReactNode;
  capabilityId: string;
}) {
  return (
    <label className={styles.filterControl}>
      {label === 'Date range' ? <CalendarDays aria-hidden="true" size={13} /> : null}
      <span className="sr-only">{label}</span>
      <select
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        data-capability-id={capabilityId}
      >
        {children}
      </select>
      <ChevronDown aria-hidden="true" size={12} />
    </label>
  );
}

function attentionReasons(
  operation: DashboardAttentionPriority,
  selectedCurrency: string | null,
): string[] {
  const reasons: string[] = [];
  if (operation.overdueCount > 0) {
    reasons.push(`${formatNumber(operation.overdueCount)} overdue`);
  } else if (operation.approachingCount > 0) {
    reasons.push(
      `${formatNumber(operation.approachingCount)} approaching review SLA`,
    );
  }
  if (
    selectedCurrency
    && operation.selectedExposureMinor != null
    && reasons.length < 2
  ) {
    reasons.push(
      `${operation.unvaluedCaseCount > 0 ? 'At least ' : ''}${formatMoney(
        operation.selectedExposureMinor,
        selectedCurrency,
      )} exposure`,
    );
  }
  if (selectedCurrency && operation.unvaluedCaseCount > 0 && reasons.length < 2) {
    reasons.push(
      `No ${selectedCurrency} value for ${formatNumber(operation.unvaluedCaseCount)}`,
    );
  }
  if (reasons.length === 0) reasons.push(`${formatNumber(operation.activeCount)} active`);
  return reasons.slice(0, 2);
}

export function DashboardOverview({
  report,
  comparison,
  selectedCurrency,
  compare,
}: DashboardOverviewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [metric, setMetric] = useState<DashboardMetricKey>('exposure');
  const [healthOpen, setHealthOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const bridge = report.bridges.find((item) => item.currency === selectedCurrency) ?? null;
  const previousBridge = comparison?.bridges.find((item) => item.currency === selectedCurrency) ?? null;
  const previousTrend = compare === 'previous' ? comparison?.trend : null;
  const chartData = useMemo(
    () => selectedCurrency
      ? buildDashboardChartBuckets({
          current: report.trend,
          previous: previousTrend,
          range: report.range,
          currency: selectedCurrency,
          metric,
          asOf: report.generatedAt,
        })
      : [],
    [metric, previousTrend, report.generatedAt, report.range, report.trend, selectedCurrency],
  );
  const recoveryChartData = useMemo(
    () => selectedCurrency && metric === 'exposure'
      ? buildDashboardChartBuckets({
          current: report.trend,
          range: report.range,
          currency: selectedCurrency,
          metric: 'recovered',
          asOf: report.generatedAt,
        })
      : [],
    [metric, report.generatedAt, report.range, report.trend, selectedCurrency],
  );
  const hasChartData = chartData.some(
    (bucket) => bucket.currentMinor != null || bucket.previousMinor != null,
  );
  const selectedMetric = DASHBOARD_METRICS.find((item) => item.key === metric) ?? DASHBOARD_METRICS[0];
  const selectedReportMetric = DASHBOARD_REPORT_METRICS[metric];
  const selectedMetricValue = bridgeMetricValue(bridge, metric);
  const recoveredMetricValue = bridgeMetricValue(bridge, 'recovered');
  const work = summarizeDashboardWork(report.operations);
  const sourceFreshness = calculateSourceFreshness(report.coverage);
  const decisionSafety = calculateDecisionSafety({
    hasFinancialValue: selectedMetricValue != null && selectedCurrency != null,
    confidence: report.reconciliation.confidence,
    sourceFreshness,
  });
  const attentionRows = buildDashboardAttentionPriorities(
    report.operations,
    selectedCurrency,
  );
  const attentionRankingMode = attentionRows[0]?.rankingMode ?? 'composite';
  const operatingStatement = buildDashboardOperatingStatement({
    work,
    sourceFreshness,
    confidence: report.reconciliation.confidence,
    hasFinancialValue: selectedMetricValue != null && selectedCurrency != null,
  });
  const financialRecordsHref = selectedCurrency
    ? financialReportRecordsHref({
        range: report.range,
        currency: selectedCurrency,
        metric: selectedReportMetric,
        timezone: report.timezone,
      })
    : null;
  const supportingOutcomes = DASHBOARD_METRICS
    .filter((item) => item.key !== metric)
    .map((item) => ({
      ...item,
      value: bridgeMetricValue(bridge, item.key),
    }));
  const coverageNeedingAttention = [...sourceFreshness.rows]
    .filter((row) => row.staleRecords > 0)
    .sort((a, b) => b.staleRecords - a.staleRecords);
  const leadingStaleSource = coverageNeedingAttention[0] ?? null;
  const financialScope = `${TIME_RANGE_LABELS[report.range]}${selectedCurrency ? ` · ${selectedCurrency}` : ''}`;
  const comparisonSummary = compare === 'previous'
    ? comparisonLabel(selectedMetricValue, bridgeMetricValue(previousBridge, metric))
    : selectedMetric.description;
  const chartCoverageSummary = compare === 'previous'
    ? comparisonSummary
    : chartData.length > 0
      ? `${formatNumber(chartData.filter((bucket) => (bucket.currentMinor ?? 0) > 0).length)} of ${formatNumber(chartData.length)} intervals carry ${selectedMetric.label.toLowerCase()}`
      : comparisonSummary;
  const selectedMetricIsAffected = report.reconciliation.confidence.state === 'qualified'
    && (
      report.reconciliation.confidence.affectedCurrencies.length === 0
      || !selectedCurrency
      || report.reconciliation.confidence.affectedCurrencies.includes(selectedCurrency)
    )
    && report.reconciliation.confidence.affectedMetrics.includes(selectedReportMetric);
  const chartTable: ChartDataTableModel | undefined = (() => {
    if (!selectedCurrency || !hasChartData) return undefined;
    const columns = [
      { key: 'period', header: 'Period' },
      { key: 'current', header: selectedMetric.label, numeric: true },
    ];
    if (metric === 'exposure' && recoveredMetricValue != null) {
      columns.push({ key: 'recovered', header: 'Recovered', numeric: true });
    }
    if (compare === 'previous') {
      columns.push({ key: 'previous', header: 'Previous period', numeric: true });
    }
    return {
      caption: `${selectedMetric.label} by period — ${selectedCurrency}`,
      columns,
      rows: chartData.map((bucket, index) => ({
        key: bucket.key,
        header: bucket.label,
        values: [
          formatMinorCurrencyNullable(bucket.currentMinor, selectedCurrency),
          ...(metric === 'exposure' && recoveredMetricValue != null
            ? [formatMinorCurrencyNullable(recoveryChartData[index]?.currentMinor ?? null, selectedCurrency)]
            : []),
          ...(compare === 'previous'
            ? [formatMinorCurrencyNullable(bucket.previousMinor, selectedCurrency)]
            : []),
        ],
      })),
    };
  })();

  function updateQuery(changes: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value == null) next.delete(key);
      else next.set(key, value);
    }
    startTransition(() => {
      router.push(`${pathname}?${next.toString()}`);
    });
  }

  return (
    <div className={styles.dashboardPilot}>
      <DecisionHeader
        title="Overview"
        sentence={operatingStatement}
        scope={
          <ScopeStrip
            primary={<div className={styles.filterGroup} role="group" aria-label="Dashboard controls" aria-busy={isPending}>
          <FilterSelect
            label="Date range"
            capabilityId="reports.range"
            value={report.range}
            disabled={isPending}
            onChange={(value) => updateQuery({
              range: value,
              compare: value === 'all' ? 'none' : compare,
            })}
          >
            {REPORT_RANGES.map((range) => (
              <option key={range} value={range}>{TIME_RANGE_LABELS[range]}</option>
            ))}
          </FilterSelect>

          <span className={styles.compareCopy}>Compare</span>
          <FilterSelect
            label="Comparison period"
            capabilityId="reports.compare"
            value={report.range === 'all' ? 'none' : compare}
            disabled={report.range === 'all' || isPending}
            onChange={(value) => updateQuery({ compare: value })}
          >
            <option value="previous">Previous period</option>
            <option value="none">Off</option>
          </FilterSelect>

          {report.bridges.length > 0 && selectedCurrency ? (
            <FilterSelect
              label="Currency"
              capabilityId="reports.currency"
              value={selectedCurrency}
              disabled={isPending}
              onChange={(value) => updateQuery({ currency: value })}
            >
              {report.bridges.map((item) => (
                <option key={item.currency} value={item.currency}>{item.currency}</option>
              ))}
            </FilterSelect>
          ) : null}

            </div>}
            utility={<>
          <div className={styles.exportWrap}>
            <ExportMenu
              range={report.range}
              timezone={report.timezone}
              currency={selectedCurrency}
              metric={selectedReportMetric}
              triggerLabel="Reports"
              reportsHref={`/reports?range=${report.range}&timezone=${encodeURIComponent(report.timezone)}`}
            />
          </div>

          <span className={styles.pendingStatus} role="status" aria-live="polite">
            {isPending ? 'Updating…' : ''}
          </span>
            </>}
          />
        }
      />

      <section className={styles.positionCanvas} aria-labelledby="payout-position-title">
        <header className={styles.positionHeader}>
          <h2 id="payout-position-title">Payout position</h2>
          {bridge && selectedCurrency ? (
            <div className={styles.metricSwitcher} role="group" aria-label="Payout metric">
              {DASHBOARD_METRICS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  aria-pressed={item.key === metric}
                  onClick={() => setMetric(item.key)}
                >
                  {item.label === 'Payout exposure' ? 'Exposure' : item.label}
                </button>
              ))}
            </div>
          ) : null}
        </header>

        <div className={styles.positionBody}>
          <div className={styles.positionReading}>
            <div className={styles.positionLead}>
              <span className={styles.positionMetricLabel}>{selectedMetric.label}</span>
              <strong
                className={styles.positionValue}
                data-qualified={selectedMetricIsAffected ? 'true' : undefined}
              >
                {selectedMetricValue == null || !selectedCurrency
                  ? 'Unavailable'
                  : formatMoney(selectedMetricValue, selectedCurrency)}
              </strong>
              <p className={styles.positionDefinition}>{selectedMetric.description}</p>
              <p className={styles.positionComparison}>
                {TIME_RANGE_LABELS[report.range]}
                {selectedCurrency ? ` · ${selectedCurrency}` : ''}
                {` · ${formatNumber(report.recordCount)} ${report.recordCount === 1 ? 'case' : 'cases'}`}
              </p>
            </div>

            <p className={styles.workHierarchy} aria-label={`${work.activeCount} active cases, ${work.needsActionCount} need action, ${work.readyCount} of those are ready now`}>
              <span><strong>{formatNumber(work.activeCount)}</strong> active cases</span>
              <i aria-hidden="true">·</i>
              <span><strong>{formatNumber(work.needsActionCount)}</strong> need action</span>
              <i aria-hidden="true">·</i>
              <span><strong>{formatNumber(work.readyCount)}</strong> ready now</span>
            </p>

            <dl className={styles.outcomeLine} aria-label="Supporting financial outcomes">
              {supportingOutcomes.map((item) => (
                <div key={item.key}>
                  <dt>{item.label}</dt>
                  <dd>
                    {item.value == null || !selectedCurrency
                      ? 'Unavailable'
                      : formatMoney(item.value, selectedCurrency)}
                  </dd>
                </div>
              ))}
            </dl>

            <div className={styles.positionActions}>
              <ButtonLink href="/work" size="sm" data-capability-id="work.open-header">
                Open work
              </ButtonLink>
              {financialRecordsHref ? (
                <Link
                  className={styles.textAction}
                  href={financialRecordsHref}
                  aria-label="View underlying records"
                >
                  View records <ArrowRight aria-hidden="true" size={13} />
                </Link>
              ) : null}
            </div>

            <p className={styles.positionProvenance}>
              {report.reconciliation.confidence.state === 'qualified'
                ? 'Validated entries only'
                : 'Validated ledger values'}
              {' · '}
              generated {formatDateAbsolute(report.generatedAt)}
            </p>
          </div>

          <div className={styles.timelineRegion}>
            {bridge && selectedCurrency ? (
              selectedMetricValue != null && chartData.length > 0 && hasChartData ? (
                <DashboardPositionChart
                  key={`${metric}-${report.range}-${selectedCurrency}-${compare}`}
                  data={chartData}
                  secondary={
                    metric === 'exposure' && recoveredMetricValue != null
                      ? recoveryChartData.map((bucket) => bucket.currentMinor)
                      : null
                  }
                  comparison={compare === 'previous'}
                  metricLabel={selectedMetric.label}
                  scope={financialScope}
                  basisLabel={dashboardBucketBasisLabel(report.range)}
                  idleDetail={chartCoverageSummary}
                  formatValue={(value) => (
                    value == null ? 'Unavailable' : formatMoney(value, selectedCurrency)
                  )}
                  formatAxisValue={(value) => (
                    value == null
                      ? '—'
                      : formatCurrencyCompact(fromMinorUnits(value, selectedCurrency), selectedCurrency)
                  )}
                  table={chartTable}
                />
              ) : (
                <ChartState
                  kind="empty"
                  title={`No dated ${selectedMetric.label.toLowerCase()} entries`}
                  description="The period total remains visible. Choose another metric or review the underlying records."
                  minHeight={226}
                />
              )
            ) : (
              <ChartState
                kind="unavailable"
                title="Financial position unavailable"
                description="Case work remains available, but no verified financial history with a valid currency was found."
                action={<Link href="/integrations">Review sources</Link>}
                minHeight={226}
              />
            )}
          </div>
        </div>

        <div
          className={styles.financialQualifier}
          data-state={decisionSafety.state}
          role="status"
        >
          {decisionSafety.state === 'complete'
            ? <Check aria-hidden="true" size={15} />
            : <AlertTriangle aria-hidden="true" size={15} />}
          <div>
            <strong>{decisionSafety.label}</strong>
            <span>{decisionSafety.detail}</span>
          </div>
          {report.reconciliation.issues.length > 0 || leadingStaleSource ? (
            <button type="button" onClick={() => setHealthOpen(true)}>Review details</button>
          ) : null}
        </div>
      </section>

      <div className={styles.operationalGrid}>
        <section className={styles.attentionSurface} aria-labelledby="attention-title">
          <header className={styles.sectionHeader}>
            <div>
              <h2 id="attention-title">What needs attention</h2>
              <p>
                {attentionRows.length > 0
                  ? attentionRankingMode === 'composite'
                    ? `Prioritised by review SLA, decision readiness${selectedCurrency ? ` and ${selectedCurrency} exposure` : ''}`
                    : 'Priority signals unavailable; ordered by active case count'
                  : 'No active work is waiting in this period'}
              </p>
            </div>
            <Link href="/work" className={styles.textAction}>
              Open work <ArrowRight aria-hidden="true" size={13} />
            </Link>
          </header>

          {attentionRows.length > 0 ? (
            <div className={styles.attentionList}>
              {attentionRows.slice(0, 4).map((operation) => {
                const reasons = attentionReasons(operation, selectedCurrency);
                return (
                  <Link href={operation.href} key={operation.key} className={styles.attentionRow}>
                    <span className={styles.attentionIdentity}>
                      <strong>{operation.label}</strong>
                      <span>{operation.supportCopy}</span>
                    </span>
                    <span className={styles.attentionReasons}>
                      {reasons.map((reason) => <span key={reason}>{reason}</span>)}
                    </span>
                    <span className={styles.attentionMeasure} aria-hidden="true">
                      <i style={{ width: `${Math.max(5, operation.priority)}%` }} />
                    </span>
                    <strong className={styles.attentionCount}>{formatNumber(operation.activeCount)}</strong>
                    <ArrowRight className={styles.attentionArrow} aria-hidden="true" size={14} />
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className={styles.attentionEmpty}>
              <Check aria-hidden="true" size={18} />
              <div>
                <strong>No active work is waiting</strong>
                <span>New evidence and decisions will appear here.</span>
              </div>
            </div>
          )}
        </section>

        <section className={styles.trustSurface} aria-labelledby="data-trust-title">
          <header className={styles.sectionHeader}>
            <div>
              <h2 id="data-trust-title">Data trust</h2>
              <p>Source, ledger and usable scope</p>
            </div>
            {leadingStaleSource ? (
              <Link href={leadingStaleSource.href} className={styles.textAction}>
                Review {leadingStaleSource.objectType} <ArrowRight aria-hidden="true" size={13} />
              </Link>
            ) : (
              <button
                type="button"
                className={styles.detailButton}
                onClick={() => setHealthOpen(true)}
                data-capability-id="reports.data-health.details"
              >
                View details
              </button>
            )}
          </header>

          <div className={styles.trustAxes}>
            <div className={styles.trustAxis}>
              <div>
                <span>Source freshness</span>
                <strong data-tone={sourceFreshness.state === 'current' ? 'positive' : sourceFreshness.state === 'stale' ? 'warning' : 'neutral'}>
                  {sourceFreshness.state === 'unavailable'
                    ? 'Unavailable'
                    : sourceFreshness.state === 'stale'
                      ? `${formatNumber(sourceFreshness.staleRecords)} stale`
                      : 'All current'}
                </strong>
              </div>
              <p>
                {sourceFreshness.freshnessPercent == null
                  ? 'No connected-source denominator is available.'
                  : `${formatNumber(sourceFreshness.freshRecords)} of ${formatNumber(sourceFreshness.totalRecords)} current · ${sourceFreshness.freshnessPercent}%`}
              </p>
              {sourceFreshness.freshnessPercent != null ? (
                <div
                  className={styles.freshnessTrack}
                  data-state={sourceFreshness.state}
                  role="img"
                  aria-label={`${sourceFreshness.freshnessPercent}% of connected-source records are current`}
                >
                  <span style={{ width: `${sourceFreshness.freshnessPercent}%` }} />
                </div>
              ) : null}
            </div>

            <div className={styles.trustAxis}>
              <div>
                <span>Ledger validation</span>
                <strong data-tone={report.reconciliation.ok ? 'positive' : 'warning'}>
                  {report.reconciliation.ok ? 'Passed' : 'Needs review'}
                </strong>
              </div>
              <p>
                {report.reconciliation.ok
                  ? 'Displayed financial totals reconcile.'
                  : `${formatNumber(report.reconciliation.confidence.issueCount)} ${report.reconciliation.confidence.issueCount === 1 ? 'issue affects' : 'issues affect'} confidence.`}
              </p>
            </div>

            <div className={styles.trustAxis}>
              <div>
                <span>Decision-safe scope</span>
                <strong data-tone={
                  decisionSafety.state === 'complete'
                    ? 'positive'
                    : decisionSafety.state === 'qualified'
                      ? 'warning'
                      : 'neutral'
                }>
                  {decisionSafety.label}
                </strong>
              </div>
              <p>{decisionSafety.detail}</p>
            </div>
          </div>

          {leadingStaleSource ? (
            <button
              type="button"
              className={styles.trustDetailsButton}
              onClick={() => setHealthOpen(true)}
              data-capability-id="reports.data-health.details"
            >
              View all trust details
            </button>
          ) : null}
        </section>
      </div>

      <Modal
        open={healthOpen}
        onClose={() => setHealthOpen(false)}
        title="Data trust details"
        description="Connected-source freshness, financial validation, and the scope safe to use."
        size="md"
        footer={
          <button type="button" className={styles.modalClose} onClick={() => setHealthOpen(false)}>Close</button>
        }
      >
        <div className={styles.modalTrustGrid}>
          <div>
            <span>Source freshness</span>
            <strong>
              {sourceFreshness.state === 'unavailable'
                ? 'Unavailable'
                : sourceFreshness.state === 'stale'
                  ? `${formatNumber(sourceFreshness.staleRecords)} stale · ${sourceFreshness.freshnessPercent}% current`
                  : 'All current'}
            </strong>
          </div>
          <div>
            <span>Ledger validation</span>
            <strong>{report.reconciliation.ok ? 'Passed' : 'Needs review'}</strong>
          </div>
          <div>
            <span>Decision-safe scope</span>
            <strong>{decisionSafety.label}</strong>
          </div>
        </div>

        {!report.reconciliation.ok ? (
          <div className={styles.modalIssues}>
            <strong>Ledger validation needs attention</strong>
            <ul>{report.reconciliation.issues.map((issue) => <li key={issue}>{issue}</li>)}</ul>
          </div>
        ) : null}

        {report.coverage.length > 0 ? (
          <div className={styles.coverageList}>
            {report.coverage.map((row) => (
              <SourceBeacon
                key={row.objectType}
                source={row.objectType}
                authority={row.scope === 'internal' ? 'Internal projection' : 'Connected source'}
                observedAt={row.latestAt ? `Latest ${formatDateAbsolute(row.latestAt)}` : 'No refresh recorded'}
                state={row.records === 0 ? 'unavailable' : row.staleRecords > 0 ? 'stale' : 'current'}
                limitation={`${formatNumber(row.freshRecords)} current · ${formatNumber(row.staleRecords)} stale · ${formatNumber(row.records)} total`}
                href={row.href}
              />
            ))}
          </div>
        ) : (
          <div className={styles.coverageEmpty}>
            <div>
              <strong>No connected-source coverage is available</strong>
              <span>Case work and verified financial values remain available; activity counts and timing are not decision-safe.</span>
            </div>
            <Link href="/integrations">Review integrations</Link>
          </div>
        )}
      </Modal>
    </div>
  );
}
