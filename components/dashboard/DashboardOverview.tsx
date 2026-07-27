'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  CircleGauge,
  Database,
  RotateCcw,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import ExportMenu from '@/components/reports/ExportMenu';
import { Modal } from '@/components/ui';
import { ComboBarLineChart } from '@/components/charts/authenticated/cartesian/ComboBarLineChart';
import { MetricTabs, type MetricTabItem } from '@/components/charts/authenticated/micro/MetricTabs';
import { SegmentCompositionCard } from '@/components/charts/authenticated/operational/SegmentCompositionCard';
import { BlockRailChart } from '@/components/charts/authenticated/operational/BlockRailChart';
import type {
  DashboardPeriodComparison,
  IntelligenceReport,
} from '@/lib/reporting/intelligence';
import { financialReportRecordsHref, REPORT_RANGES, type FinancialReportMetric } from '@/lib/reporting/intelligence';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { MetricGroup } from '@/components/ui/MetricGroup';
import { RankedContributionChart } from '@/components/charts/authenticated/RankedContributionChart';
import {
  formatDateAbsolute,
  formatMoney,
  formatMinorCurrencyNullable,
  formatNumber,
} from '@/lib/utils/format';
import {
  bridgeMetricValue,
  buildDashboardChartBuckets,
  calculateDataHealth,
  comparisonLabel,
  DASHBOARD_METRICS,
  groupWorkflowOperations,
  type DashboardMetricKey,
} from './dashboardModel';
import { TIME_RANGE_LABELS } from '@/lib/ui/merchantCopy';
import styles from './dashboardPilot.module.css';
import dvStyles from '@/components/charts/authenticated/AuthenticatedCharts.module.css';

const METRIC_ICONS: Record<DashboardMetricKey, typeof TrendingUp> = {
  exposure: TrendingUp,
  recovered: RotateCcw,
  prevented: ShieldCheck,
  realisedLoss: TrendingDown,
};

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
  const hasChartData = chartData.some(
    (bucket) => bucket.currentMinor != null || bucket.previousMinor != null,
  );
  const selectedMetric = DASHBOARD_METRICS.find((item) => item.key === metric) ?? DASHBOARD_METRICS[0];
  const selectedMetricValue = bridgeMetricValue(bridge, metric);
  const workflowGroups = groupWorkflowOperations(report.operations);
  const health = calculateDataHealth(report.coverage, report.reconciliation.ok);
  const needsAction = workflowGroups[0].count;
  const readyForDecision = report.operations
    .filter((operation) => /ready/i.test(operation.label))
    .reduce((sum, operation) => sum + operation.count, 0);
  const actionPercent = report.recordCount > 0
    ? Math.round((needsAction / report.recordCount) * 100)
    : null;

  function updateQuery(changes: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value == null) next.delete(key);
      else next.set(key, value);
    }
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <div className={styles.dashboardPilot}>
      <header className={styles.pageHeading}>
        <div>
          <h1>Overview</h1>
          <p>Payout exposure, recovery, workflow, and source health.</p>
        </div>
        <div className={styles.headingActions}>
          <ButtonLink href="/work" size="sm" data-capability-id="work.open-header">
            Open work
          </ButtonLink>
          <Link
            href={`/reports?range=${report.range}&timezone=${encodeURIComponent(report.timezone)}`}
            className={styles.textAction}
            data-capability-id="reports.open-full"
          >
            Full reports <ArrowRight aria-hidden="true" size={13} />
          </Link>
        </div>
      </header>

      <MetricGroup
        className="mb-4"
        items={[
          {
            label: 'Cases in period',
            value: formatNumber(report.recordCount),
            description: TIME_RANGE_LABELS[report.range],
          },
          {
            label: 'Need action',
            value: formatNumber(needsAction),
            description: actionPercent == null ? 'No cases in this period' : `${actionPercent}% of cases`,
          },
          {
            label: 'Ready for decision',
            value: formatNumber(readyForDecision),
            description: 'Evidence complete',
          },
          {
            label: 'Source freshness',
            value: health.freshnessPercent == null ? 'Unavailable' : `${health.freshnessPercent}%`,
            description: `${formatNumber(health.staleRecords)} stale records`,
          },
        ]}
      />

      <section className="mb-4" aria-label="Priority work">
        <RankedContributionChart
          id="dashboard-priority-work"
          title="Priority work"
          description="Open cases by the next step they are waiting on."
          items={report.operations.slice(0, 6).map((operation, index) => ({
            label: operation.label,
            value: operation.count,
            displayValue: `${formatNumber(operation.count)} ${operation.count === 1 ? 'case' : 'cases'}`,
            href: operation.href,
            tone: index === 0 ? 'attention' : 'neutral',
          }))}
          annotation={{ value: formatNumber(report.recordCount), label: ' cases in period' }}
        />
      </section>

      <div className={styles.filterBar} aria-label="Dashboard filters">
        <div className={styles.filterGroup}>
          <FilterSelect
            label="Date range"
            capabilityId="reports.range"
            value={report.range}
            onChange={(value) => updateQuery({
              range: value,
              compare: value === 'all' ? 'none' : compare,
            })}
          >
          {REPORT_RANGES.map((range) => (
            <option key={range} value={range}>{TIME_RANGE_LABELS[range]}</option>
          ))}
          </FilterSelect>

          <span className={styles.compareCopy}>Compare to</span>
          <FilterSelect
            label="Comparison period"
            capabilityId="reports.compare"
            value={report.range === 'all' ? 'none' : compare}
            disabled={report.range === 'all'}
            onChange={(value) => updateQuery({ compare: value })}
          >
            <option value="previous">Previous period</option>
            <option value="none">No comparison</option>
          </FilterSelect>
        </div>

        <div className={styles.filterGroup}>
          {report.bridges.length > 0 && selectedCurrency ? (
            <FilterSelect
              label="Currency"
              capabilityId="reports.currency"
              value={selectedCurrency}
              onChange={(value) => updateQuery({ currency: value })}
            >
              {report.bridges.map((item) => (
                <option key={item.currency} value={item.currency}>{item.currency}</option>
              ))}
            </FilterSelect>
          ) : null}
          <div className={styles.exportWrap}>
            <ExportMenu range={report.range} timezone={report.timezone} currency={selectedCurrency} />
          </div>
        </div>
      </div>

      <section className={styles.performanceCard} aria-label="Value this period">
        <div className={styles.cardHeader}>
          <div>
            <div className={styles.titleRow}>
              <h2>Case financials</h2>
              <span className={styles.infoDot} title="Canonical financial entries for the selected period">i</span>
            </div>
            <p>{TIME_RANGE_LABELS[report.range]}{selectedCurrency ? ` · ${selectedCurrency}` : ''}</p>
          </div>
        </div>

        {!report.reconciliation.ok ? (
          <div className={styles.reconciliationNotice} role="status">
            <AlertTriangle aria-hidden="true" size={14} />
            Some ledger entries need review. Valid currency data remains visible.
          </div>
        ) : null}

        {bridge && selectedCurrency ? (
          <>
            <div className={styles.chartHeader}>
              <div>
                <span>{selectedMetric.label}</span>
                <strong>{selectedMetricValue == null ? 'Unavailable' : formatMoney(selectedMetricValue, selectedCurrency)}</strong>
                <Link
                  href={financialReportRecordsHref({
                    range: report.range,
                    currency: selectedCurrency,
                    metric: DASHBOARD_REPORT_METRICS[metric],
                    timezone: report.timezone,
                  })}
                  className={styles.textAction}
                >
                  View underlying records
                </Link>
              </div>
              {compare === 'previous' ? (
                <div className={styles.legend} aria-label="Chart legend">
                  <span><i className={dvStyles[selectedMetric.tone]} /> Current</span>
                  <span><i className={styles.dashedLegend} /> Previous</span>
                </div>
              ) : null}
            </div>

            <div className={styles.chartRegion} role="region" aria-label="Case financial charts">
              {selectedMetricValue != null && chartData.length > 0 && hasChartData ? (
                <ComboBarLineChart
                  data={chartData.map((bucket) => ({
                    key: bucket.key,
                    label: bucket.label,
                    current: bucket.currentMinor,
                    previous: bucket.previousMinor,
                  }))}
                  colourVar={selectedMetric.colourVar}
                  comparison={compare === 'previous'}
                  valueFormatter={(value) => formatMinorCurrencyNullable(value, selectedCurrency)}
                  tooltipFormatter={(value) => formatMoney(value, selectedCurrency)}
                  height={230}
                />
              ) : (
                <div className={styles.chartEmpty}>
                  No dated {selectedMetric.label.toLowerCase()} entries were recorded in this period.
                </div>
              )}
            </div>

            <MetricTabs
              aria-label="Payout metric"
              active={metric}
              onSelect={(key) => setMetric(key as DashboardMetricKey)}
              items={DASHBOARD_METRICS.map<MetricTabItem>((item) => {
                const current = bridgeMetricValue(bridge, item.key);
                const previous = compare === 'previous'
                  ? bridgeMetricValue(previousBridge, item.key)
                  : null;
                const Icon = METRIC_ICONS[item.key];
                return {
                  key: item.key,
                  label: item.label,
                  icon: <Icon aria-hidden="true" size={14} />,
                  value: current == null ? 'Unavailable' : formatMoney(current, selectedCurrency),
                  delta: compare === 'previous' ? comparisonLabel(current, previous) : item.description,
                };
              })}
            />
          </>
        ) : (
          <div className={styles.incompleteState}>
            <Database aria-hidden="true" size={20} />
            <div>
              <h3>Financial data is incomplete</h3>
              <p>No financial history with a valid currency was found. Unavailable is not zero.</p>
            </div>
            <Link href="/integrations">Review sources</Link>
          </div>
        )}
      </section>

      <div className={styles.lowerGrid}>
        <section className={styles.detailCard} aria-labelledby="workflow-breakdown-title">
          <div className={styles.detailHeader}>
            <div>
              <div className={styles.titleRow}>
                <h2 id="workflow-breakdown-title">Workflow breakdown</h2>
                <span className={styles.infoDot} title="Cases grouped by canonical workflow status">i</span>
              </div>
              <strong>{actionPercent == null ? 'Unavailable' : `${actionPercent}%`}</strong>
              <p>{actionPercent == null ? 'No cases in this period' : 'of cases currently need action'}</p>
            </div>
          </div>

          {report.recordCount > 0 ? (
            <SegmentCompositionCard
              segments={workflowGroups
                .filter((group) => group.count > 0)
                .map((group) => ({ key: group.key, label: group.label, value: group.count, tone: group.tone }))}
              rows={report.operations.slice(0, 4).map((operation) => ({
                key: operation.key,
                label: operation.label,
                displayValue: String(operation.count),
                href: operation.href,
              }))}
            />
          ) : (
            <p className={styles.cardEmpty}>No payout-case records were found in the selected period.</p>
          )}
        </section>

        <section className={styles.detailCard} aria-labelledby="data-health-title">
          <div className={styles.detailHeader}>
            <div>
              <div className={styles.titleRow}>
                <h2 id="data-health-title">Data health</h2>
                <span className={styles.infoDot} title="Source records refreshed within the last 48 hours">i</span>
              </div>
              <strong>{health.freshnessPercent == null ? 'Unavailable' : `${health.freshnessPercent}%`}</strong>
              <p>{health.label}</p>
            </div>
            <button type="button" className={styles.detailButton} onClick={() => setHealthOpen(true)} data-capability-id="reports.data-health.details">Details</button>
          </div>

          {health.freshnessPercent != null ? (
            <BlockRailChart
              blocks={[{ key: 'fresh', label: 'Fresh records', value: health.freshRecords, tone: 'primary' }]}
              remainder={health.staleRecords}
              pins={[{ label: `${health.freshnessPercent}%`, emphasis: true }]}
              compact
            />
          ) : (
            <p className={styles.cardEmpty}>Source freshness unavailable.</p>
          )}
          <div className={styles.healthSummary}>
            <div><span>Current records</span><strong>{formatNumber(health.freshRecords)}</strong></div>
            <div><span>Stale records</span><strong>{formatNumber(health.staleRecords)}</strong></div>
            <div>
              <span>Ledger checks</span>
              <strong className={report.reconciliation.ok ? styles.healthOkay : styles.healthWarning}>
                {report.reconciliation.ok ? <Check aria-hidden="true" size={13} /> : <AlertTriangle aria-hidden="true" size={13} />}
                {report.reconciliation.ok ? 'Passed' : 'Review'}
              </strong>
            </div>
          </div>
        </section>
      </div>

      <Modal
        open={healthOpen}
        onClose={() => setHealthOpen(false)}
        title="Data health"
        description="Freshness and reconciliation across connected source projections."
        size="md"
        footer={
          <button type="button" className={styles.modalClose} onClick={() => setHealthOpen(false)}>Close</button>
        }
      >
        <div className={styles.modalScore}>
          <CircleGauge aria-hidden="true" size={18} />
          <div>
            <strong>{health.freshnessPercent == null ? 'Unavailable' : `${health.freshnessPercent}% current`}</strong>
            <span>{health.label}</span>
          </div>
        </div>

        {!report.reconciliation.ok ? (
          <div className={styles.modalIssues}>
            <strong>Ledger reconciliation needs attention</strong>
            <ul>{report.reconciliation.issues.map((issue) => <li key={issue}>{issue}</li>)}</ul>
          </div>
        ) : null}

        <div className={styles.coverageList}>
          {report.coverage.map((row) => (
            <Link href={row.href} key={row.objectType}>
              <div>
                <strong>{row.objectType}</strong>
                <span>{row.latestAt ? `Latest ${formatDateAbsolute(row.latestAt)}` : 'No refresh recorded'}</span>
              </div>
              <dl>
                <div><dt>Records</dt><dd>{formatNumber(row.records)}</dd></div>
                <div><dt>Current</dt><dd>{formatNumber(row.freshRecords)}</dd></div>
                <div><dt>Stale</dt><dd>{formatNumber(row.staleRecords)}</dd></div>
              </dl>
            </Link>
          ))}
        </div>
      </Modal>
    </div>
  );
}
