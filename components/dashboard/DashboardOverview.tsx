'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronDown,
  CircleGauge,
  Database,
  ExternalLink,
} from 'lucide-react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import ExportMenu from '@/components/reports/ExportMenu';
import { Modal } from '@/components/ui';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import type {
  DashboardPeriodComparison,
  IntelligenceReport,
  ReportRange,
} from '@/lib/reporting/intelligence';
import {
  formatCurrencyCompact,
  formatDateAbsolute,
  formatDateTime,
  formatMoney,
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
import styles from './dashboardPilot.module.css';

type DashboardOverviewProps = {
  report: IntelligenceReport;
  comparison: DashboardPeriodComparison | null;
  selectedCurrency: string | null;
  compare: 'previous' | 'none';
};

const RANGE_LABELS: Record<ReportRange, string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  all: 'All time',
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
  const reducedMotion = useReducedMotion();
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
  const selectedMetric = DASHBOARD_METRICS.find((item) => item.key === metric) ?? DASHBOARD_METRICS[0];
  const workflowGroups = groupWorkflowOperations(report.operations);
  const health = calculateDataHealth(report.coverage, report.reconciliation.ok);
  const needsAction = workflowGroups[0].count;
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
    <div className={`${styles.dashboardPilot} ua-dashboard-pilot`}>
      <header className={styles.pageHeading}>
        <div>
          <h1>Overview</h1>
          <p>Payout exposure, recovery, workflow, and source health.</p>
        </div>
        <div className={styles.headingActions}>
          <Link href="/work" className={styles.secondaryAction} data-capability-id="work.open-header">
            Open work
          </Link>
          <Link href="/claims?sort=value" className={styles.secondaryAction} data-capability-id="claims.review-high-value">
            Review high-value cases
          </Link>
          <Link
            href={`/reports?range=${report.range}&timezone=${encodeURIComponent(report.timezone)}`}
            className={styles.textAction}
            data-capability-id="reports.open-full"
          >
            Full reports <ArrowUpRight aria-hidden="true" size={13} />
          </Link>
        </div>
      </header>

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
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="all">All time</option>
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
            <ExportMenu range={report.range} />
          </div>
        </div>
      </div>

      <section className={styles.performanceCard} aria-label="Value this period">
        <div className={styles.cardHeader}>
          <div>
            <div className={styles.titleRow}>
              <h2>Payout performance</h2>
              <span className={styles.infoDot} title="Canonical financial entries for the selected period">i</span>
            </div>
            <p>{RANGE_LABELS[report.range]}{selectedCurrency ? ` · ${selectedCurrency}` : ''}</p>
          </div>
          <span className={styles.generated}>Generated {formatDateTime(report.generatedAt)}</span>
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
                <strong>{formatMoney(bridgeMetricValue(bridge, metric) ?? 0, selectedCurrency)}</strong>
              </div>
              {compare === 'previous' ? (
                <div className={styles.legend} aria-label="Chart legend">
                  <span><i style={{ background: selectedMetric.colour }} /> Current</span>
                  <span><i className={styles.dashedLegend} /> Previous</span>
                </div>
              ) : null}
            </div>

            <div className={styles.chartRegion} role="region" aria-label="Payout performance charts">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 12, right: 18, bottom: 2, left: 0 }}>
                    <CartesianGrid stroke="var(--dashboard-grid)" vertical={false} />
                    <XAxis
                      dataKey="label"
                      axisLine={false}
                      tickLine={false}
                      minTickGap={22}
                      tick={{ fontSize: 10, fill: 'var(--dashboard-muted)' }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      width={58}
                      tickCount={5}
                      tick={{ fontSize: 10, fill: 'var(--dashboard-muted)' }}
                      tickFormatter={(value: number) => formatCurrencyCompact(value / 100, selectedCurrency)}
                    />
                    <Tooltip
                      cursor={{ fill: 'var(--dashboard-hover)' }}
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        const row = payload[0]?.payload as { currentMinor: number; previousMinor: number | null };
                        return (
                          <div className={styles.chartTooltip}>
                            <span>{label}</span>
                            <strong>{formatMoney(row.currentMinor, selectedCurrency)}</strong>
                            {row.previousMinor != null ? (
                              <small>Previous {formatMoney(row.previousMinor, selectedCurrency)}</small>
                            ) : null}
                          </div>
                        );
                      }}
                    />
                    <Bar
                      dataKey="currentMinor"
                      fill={selectedMetric.colour}
                      radius={[2, 2, 0, 0]}
                      maxBarSize={20}
                      isAnimationActive={!reducedMotion}
                      animationBegin={100}
                      animationDuration={620}
                      animationEasing="ease-out"
                    />
                    {compare === 'previous' ? (
                      <Line
                        type="linear"
                        dataKey="previousMinor"
                        stroke="var(--dashboard-previous)"
                        strokeWidth={1.5}
                        strokeDasharray="4 4"
                        dot={false}
                        activeDot={{ r: 3 }}
                        connectNulls
                        isAnimationActive={!reducedMotion}
                        animationBegin={180}
                        animationDuration={680}
                        animationEasing="ease-out"
                      />
                    ) : null}
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className={styles.chartEmpty}>
                  No dated {selectedMetric.label.toLowerCase()} entries were recorded in this period.
                </div>
              )}
            </div>

            <div className={styles.metricTabs} role="tablist" aria-label="Payout metric">
              {DASHBOARD_METRICS.map((item) => {
                const current = bridgeMetricValue(bridge, item.key);
                const previous = compare === 'previous'
                  ? bridgeMetricValue(previousBridge, item.key)
                  : null;
                const active = metric === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    className={active ? styles.activeMetric : undefined}
                    onClick={() => setMetric(item.key)}
                    data-capability-id={`reports.metric.${item.key}`}
                  >
                    <span className={styles.metricLabel}>
                      <i style={{ background: item.colour }} /> {item.label}
                    </span>
                    <strong>{current == null ? 'Unavailable' : formatMoney(current, selectedCurrency)}</strong>
                    <small>{compare === 'previous' ? comparisonLabel(current, previous) : item.description}</small>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <div className={styles.incompleteState}>
            <Database aria-hidden="true" size={20} />
            <div>
              <h3>Financial data is incomplete</h3>
              <p>No canonical financial entries with a valid currency were found. Missing ledger data is not reported as zero.</p>
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
              <p>{actionPercent == null ? 'No payout cases in this period' : 'of cases currently need action'}</p>
            </div>
            <Link href="/work" className={styles.detailButton} data-capability-id="work.open">Open work</Link>
          </div>

          {report.recordCount > 0 ? (
            <>
              <div className={styles.workflowBar} aria-label="Workflow distribution">
                {workflowGroups.map((group) => group.count > 0 ? (
                  <span
                    key={group.key}
                    title={`${group.label}: ${group.count}`}
                    style={{
                      background: group.colour,
                      width: `${Math.max(2, (group.count / report.recordCount) * 100)}%`,
                    }}
                  />
                ) : null)}
              </div>
              <div className={styles.workflowLegend}>
                {workflowGroups.map((group) => (
                  <span key={group.key}><i style={{ background: group.colour }} /> {group.label} · {group.count}</span>
                ))}
              </div>
              <div className={styles.workflowRows}>
                {report.operations.slice(0, 4).map((operation) => (
                  <Link key={operation.key} href={operation.href}>
                    <span>{operation.label}</span>
                    <strong>{operation.count}</strong>
                    <ExternalLink aria-hidden="true" size={12} />
                  </Link>
                ))}
              </div>
            </>
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

          <div className={styles.healthVisual} aria-label={health.freshnessPercent == null ? 'Source freshness unavailable' : `${health.freshnessPercent}% of source records are current`}>
            {Array.from({ length: 24 }, (_, index) => {
              const filled = health.freshnessPercent != null && index < Math.round((health.freshnessPercent / 100) * 24);
              return <span key={index} className={filled ? styles.healthFilled : undefined} />;
            })}
          </div>
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
