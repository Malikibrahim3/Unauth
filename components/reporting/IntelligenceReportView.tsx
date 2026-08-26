import Link from '@/components/navigation/AppNavLink';
import {
  activeWorkflowOperations,
  buildDashboardChartBuckets,
} from '@/components/dashboard/dashboardModel';
import {
  buildCumulativeFinancialSeries,
  type CumulativeFinancialPoint,
} from '@/components/reporting/reportChartModel';
import { ReportCommandIndex, ReportSourceCoverage } from '@/components/reporting/ReportCommandIndex';
import { FinancialStageLadder } from '@/components/reports/FinancialStageLadder';
import {
  financialMetricIsKnown,
  financialMetricValue,
  financialReportRecordsHref,
  type DashboardOperationRow,
  type IntelligenceReport,
  type MoneyBridge,
} from '@/lib/reporting/intelligence';
import { TIME_RANGE_LABELS } from '@/lib/ui/merchantCopy';
import {
  formatCurrencyCompact,
  formatDayMonthInTimeZone,
  formatMoney,
  formatMinorCurrencyNullable,
  formatNumber,
} from '@/lib/utils/format';

const CHART_WIDTH = 620;
const CHART_HEIGHT = 186;
const PLOT_LEFT = 40;
const PLOT_RIGHT = 610;
const PLOT_TOP = 12;
const PLOT_BOTTOM = 160;

const CAUSE_COLOURS = [
  'var(--uo-raw-B4271B)',
  'var(--uo-raw-D9573F)',
  'var(--uo-raw-D9A03C)',
] as const;

const OPERATION_COLOURS = [
  'var(--uo-raw-2563EB)',
  'var(--uo-raw-4A4F57)',
  'var(--uo-raw-B4271B)',
  'var(--uo-raw-8B9099)',
  'var(--uo-raw-12A672)',
] as const;

const RECOVERY_STAGES = [
  { key: 'paid', label: 'Paid', noun: 'payments' },
  { key: 'approved', label: 'Approved, awaiting payment', noun: 'claims' },
  { key: 'waiting_response', label: 'Waiting on partner response', noun: 'claims open' },
  { key: 'submitted', label: 'Submitted', noun: 'claims' },
  { key: 'ready_to_submit', label: 'Ready to submit', noun: 'claims' },
  { key: 'evidence_needed', label: 'Evidence needed', noun: 'claims' },
] as const;

const METRIC_DEFINITIONS = [
  {
    name: 'Requested value',
    text: 'The gross value customers asked for in range, taken from the source claim or ticket. It is not a liability and never implies approval.',
  },
  {
    name: 'Maximum exposure',
    text: 'The most the merchant could lose if every open request were paid in full. Bounded by requested value and reduced only by a recorded decision.',
  },
  {
    name: 'Merchant decision',
    text: 'Value a named person approved. Rule recommendations are advisory and are never counted here.',
  },
  {
    name: 'Confirmed loss',
    text: 'Ledger-recorded loss with a source-backed amount. Estimated loss is reported separately and never added to it.',
  },
  {
    name: 'Eligible recovery',
    text: 'Confirmed loss covered by a partner agreement and inside its deadline. Records with no confirmed-loss bound are excluded, not zeroed.',
  },
  {
    name: 'Recovered cash',
    text: 'Money actually received against a recovery, matched to an external payment reference.',
  },
  {
    name: 'Final net loss',
    text: 'Confirmed loss minus recovered cash and write-offs. Unavailable whenever any component fails source-to-ledger reconciliation.',
  },
] as const;

function scopedHref(
  path: string,
  report: IntelligenceReport,
  currency: string,
): string {
  const query = new URLSearchParams({
    range: report.range,
    timezone: report.timezone,
    currency,
  });
  return `${path}?${query.toString()}`;
}

function primaryBridgeFor(report: IntelligenceReport): MoneyBridge | null {
  return report.bridges.toSorted(
    (left, right) => right.caseIds.length - left.caseIds.length
      || right.requestedMinor - left.requestedMinor
      || left.currency.localeCompare(right.currency),
  )[0] ?? null;
}

function reportForBridge(
  report: IntelligenceReport,
  bridge: MoneyBridge,
): IntelligenceReport {
  return {
    ...report,
    bridges: [bridge],
    trend: report.trend.filter((point) => point.currency === bridge.currency),
    causes: report.causes.filter((row) => row.currency === bridge.currency),
    recoveries: report.recoveries.filter((row) => row.currency === bridge.currency),
  };
}

function rangeDescription(report: IntelligenceReport, points: CumulativeFinancialPoint[]) {
  if (!points.length) return TIME_RANGE_LABELS[report.range];
  const first = formatDayMonthInTimeZone(points[0].key, report.timezone);
  const last = formatDayMonthInTimeZone(points[points.length - 1].key, report.timezone);
  return first === last ? first : `${first} – ${last}`;
}

function niceMaximum(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 1;
  const rawStep = value / 4;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalised = rawStep / magnitude;
  const step = normalised <= 1 ? 1 : normalised <= 2 ? 2 : normalised <= 5 ? 5 : 10;
  return step * magnitude * 4;
}

function compactAxisMoney(valueMinor: number, currency: string): string {
  return formatCurrencyCompact(valueMinor / 100, currency);
}

function wholeMoney(valueMinor: number, currency: string): string {
  return formatMoney(valueMinor, currency).replace(/\.00$/, '');
}

function lineSegments(
  points: CumulativeFinancialPoint[],
  maximum: number,
  select: (point: CumulativeFinancialPoint) => number | null,
): string[] {
  if (!points.length) return [];
  const segments: string[][] = [];
  let current: string[] = [];
  points.forEach((point, index) => {
    const value = select(point);
    if (value == null) {
      if (current.length) segments.push(current);
      current = [];
      return;
    }
    const x = points.length === 1
      ? PLOT_RIGHT
      : PLOT_LEFT + (index / (points.length - 1)) * (PLOT_RIGHT - PLOT_LEFT);
    const y = PLOT_BOTTOM - (value / maximum) * (PLOT_BOTTOM - PLOT_TOP);
    current.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  });
  if (current.length) segments.push(current);
  return segments.map((segment) => segment.join(' '));
}

function lastKnownPoint(
  points: CumulativeFinancialPoint[],
  maximum: number,
  select: (point: CumulativeFinancialPoint) => number | null,
) {
  for (let index = points.length - 1; index >= 0; index -= 1) {
    const value = select(points[index]);
    if (value == null) continue;
    const x = points.length === 1
      ? PLOT_RIGHT
      : PLOT_LEFT + (index / (points.length - 1)) * (PLOT_RIGHT - PLOT_LEFT);
    const y = PLOT_BOTTOM - (value / maximum) * (PLOT_BOTTOM - PLOT_TOP);
    return { x, y };
  }
  return null;
}

function CurrencyScopeStrip({
  report,
  bridge,
}: {
  report: IntelligenceReport;
  bridge: MoneyBridge;
}) {
  return (
    <section className="ua-report-currency-strip">
      <div>
        <h2>{bridge.currency} scope</h2>
        <p>
          {formatNumber(bridge.caseIds.length)} records are recorded in {bridge.currency}. Currencies are never combined, so {bridge.currency} is reported separately.
        </p>
      </div>
      <Link href={scopedHref('/financials/reports', report, bridge.currency)}>
        Open {bridge.currency} ledger →
      </Link>
    </section>
  );
}

function ExposureRecoveryChart({
  report,
  bridge,
}: {
  report: IntelligenceReport;
  bridge: MoneyBridge;
}) {
  const exposureBuckets = buildDashboardChartBuckets({
    current: report.trend,
    range: report.range,
    currency: bridge.currency,
    metric: 'exposure',
    asOf: report.generatedAt,
  });
  const recoveredBuckets = buildDashboardChartBuckets({
    current: report.trend,
    range: report.range,
    currency: bridge.currency,
    metric: 'recovered',
    asOf: report.generatedAt,
  });
  const points = buildCumulativeFinancialSeries({
    exposure: exposureBuckets,
    recovered: recoveredBuckets,
  });
  const hasObservedValues = points.some((point) =>
    point.exposureIncrementMinor != null || point.recoveredIncrementMinor != null,
  );
  const knownValues = points.flatMap((point) => [
    point.cumulativeExposureMinor,
    point.cumulativeRecoveredMinor,
  ]).filter((value): value is number => hasObservedValues && value != null);
  const maximum = niceMaximum(Math.max(0, ...knownValues));
  const exposureSegments = lineSegments(points, maximum, (point) => point.cumulativeExposureMinor);
  const recoveredSegments = lineSegments(points, maximum, (point) => point.cumulativeRecoveredMinor);
  const exposureEnd = lastKnownPoint(points, maximum, (point) => point.cumulativeExposureMinor);
  const recoveredEnd = lastKnownPoint(points, maximum, (point) => point.cumulativeRecoveredMinor);
  const xLabelIndexes = [...new Set([0, .25, .5, .75, 1].map((ratio) => Math.round((points.length - 1) * ratio)))];
  const firstRecovery = points.find((point) => (point.recoveredIncrementMinor ?? 0) > 0);
  const scope = rangeDescription(report, points);
  const recordsHref = financialReportRecordsHref({
    range: report.range,
    currency: bridge.currency,
    metric: 'exposed',
    timezone: report.timezone,
  });

  return (
    <section className="ua-report-card ua-report-trend" aria-labelledby="reports-trend-title">
      <header>
        <div>
          <h2 id="reports-trend-title">Is exposure outpacing recovery?</h2>
          <p>Cumulative recorded value · {bridge.currency} · {scope}</p>
        </div>
        <div className="ua-report-trend__legend" aria-label="Chart legend">
          <span><i data-tone="exposure" />Maximum exposure</span>
          <span><i data-tone="recovered" />Recovered cash</span>
        </div>
      </header>

      {knownValues.length ? (
        <>
          <svg
            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
            width="100%"
            height={CHART_HEIGHT}
            role="img"
            aria-label={`Cumulative maximum exposure and recovered cash in ${bridge.currency}`}
          >
            {[0, 1, 2, 3, 4].map((index) => {
              const y = PLOT_TOP + index * ((PLOT_BOTTOM - PLOT_TOP) / 4);
              const value = maximum * (1 - index / 4);
              return (
                <g key={index}>
                  <line x1={PLOT_LEFT} y1={y} x2={PLOT_RIGHT} y2={y} className={index === 4 ? 'ua-report-chart-axis' : 'ua-report-chart-grid'} />
                  <text x={34} y={y + 3} textAnchor="end">{compactAxisMoney(value, bridge.currency)}</text>
                </g>
              );
            })}
            {exposureSegments.map((segment, index) => <polyline key={`exposure-${index}`} points={segment} className="ua-report-chart-line ua-report-chart-line--exposure" />)}
            {recoveredSegments.map((segment, index) => <polyline key={`recovered-${index}`} points={segment} className="ua-report-chart-line ua-report-chart-line--recovered" />)}
            {exposureEnd ? <circle cx={exposureEnd.x} cy={exposureEnd.y} r="2.6" className="ua-report-chart-dot ua-report-chart-dot--exposure" /> : null}
            {recoveredEnd ? <circle cx={recoveredEnd.x} cy={recoveredEnd.y} r="2.6" className="ua-report-chart-dot ua-report-chart-dot--recovered" /> : null}
            {xLabelIndexes.map((index) => {
              const x = points.length === 1
                ? PLOT_RIGHT
                : PLOT_LEFT + (index / (points.length - 1)) * (PLOT_RIGHT - PLOT_LEFT);
              const anchor = index === 0 ? 'start' : index === points.length - 1 ? 'end' : 'middle';
              return <text key={points[index].key} x={x} y={176} textAnchor={anchor}>{points[index].label}</text>;
            })}
          </svg>
          <table className="sr-only">
            <caption>Cumulative maximum exposure and recovered cash by period</caption>
            <thead><tr><th>Period</th><th>Maximum exposure</th><th>Recovered cash</th></tr></thead>
            <tbody>{points.map((point) => <tr key={point.key}><th>{point.label}</th><td>{point.cumulativeExposureMinor == null ? 'Unavailable' : formatMinorCurrencyNullable(point.cumulativeExposureMinor, bridge.currency)}</td><td>{point.cumulativeRecoveredMinor == null ? 'Unavailable' : formatMinorCurrencyNullable(point.cumulativeRecoveredMinor, bridge.currency)}</td></tr>)}</tbody>
          </table>
        </>
      ) : (
        <div className="ua-report-card__state">
          <strong>Dated values unavailable</strong>
          <span>No source-backed exposure or recovered-cash dates exist for this scope.</span>
        </div>
      )}

      <footer>
        <span>{firstRecovery ? `Recovery begins ${formatDayMonthInTimeZone(firstRecovery.key, report.timezone)}, when the first recovered amount was recorded.` : 'No recovered cash was recorded in this scope.'}</span>
        <Link href={recordsHref}>View chart data</Link>
      </footer>
    </section>
  );
}

function LossCausesCard({
  report,
  bridge,
}: {
  report: IntelligenceReport;
  bridge: MoneyBridge;
}) {
  const causes = report.causes
    .filter((row) => row.currency === bridge.currency && row.amountMinor > 0)
    .slice(0, 3);
  const confirmedKnown = financialMetricIsKnown(bridge, 'confirmed_loss');
  const confirmedLoss = confirmedKnown ? financialMetricValue(bridge, 'confirmed_loss') ?? 0 : null;
  const total = confirmedLoss ?? causes.reduce((sum, row) => sum + row.amountMinor, 0);
  const circumference = 2 * Math.PI * 46;
  const causeSegments = causes.map((cause, index) => {
    const share = total > 0 ? cause.amountMinor / total : 0;
    const priorShare = causes
      .slice(0, index)
      .reduce((sum, row) => sum + (total > 0 ? row.amountMinor / total : 0), 0);
    const length = Math.max(0, share * circumference - (causes.length > 1 ? 2 : 0));
    return {
      ...cause,
      colour: CAUSE_COLOURS[index],
      dashArray: `${length} ${Math.max(0, circumference - length)}`,
      dashOffset: -(priorShare * circumference),
    };
  });

  return (
    <section className="ua-report-card ua-report-causes" aria-labelledby="reports-causes-title">
      <header>
        <h2 id="reports-causes-title">Which causes make up confirmed loss?</h2>
        <p>{confirmedLoss == null ? 'Confirmed loss unavailable' : `${formatMinorCurrencyNullable(confirmedLoss, bridge.currency)} confirmed`} · {bridge.currency} · recorded cause</p>
      </header>
      <div className="ua-report-causes__body">
        <svg width="142" height="142" viewBox="0 0 120 120" role="img" aria-label="Confirmed loss grouped by merchant-recorded cause">
          <circle cx="60" cy="60" r="46" className="ua-report-donut-track" />
          {causeSegments.map((cause) => (
            <circle
              key={cause.key}
              cx="60"
              cy="60"
              r="46"
              className="ua-report-donut-segment"
              style={{ stroke: cause.colour }}
              strokeDasharray={cause.dashArray}
              strokeDashoffset={cause.dashOffset}
            />
          ))}
          <text x="60" y="57" textAnchor="middle" className="ua-report-donut-value">{confirmedLoss == null ? '—' : wholeMoney(confirmedLoss, bridge.currency)}</text>
          <text x="60" y="71" textAnchor="middle" className="ua-report-donut-label">confirmed</text>
        </svg>
        <div className="ua-report-causes__list">
          {causes.length ? causes.map((cause, index) => (
            <Link key={cause.key} href={cause.href} className="ua-report-cause-row">
              <i style={{ background: CAUSE_COLOURS[index] }} />
              <span>
                <b title={cause.label}>{cause.label}</b>
                <small>{formatNumber(cause.count)} {cause.count === 1 ? 'case' : 'cases'} · merchant-recorded cause</small>
              </span>
              <strong>{formatMinorCurrencyNullable(cause.amountMinor, cause.currency)}</strong>
              <em>{total > 0 ? `${Math.round(cause.amountMinor / total * 100)}%` : '—'}</em>
            </Link>
          )) : <p className="ua-report-card__empty">No confirmed-loss causes were recorded in this scope.</p>}
        </div>
      </div>
      <footer>
        <span>Causes are merchant-recorded, not inferred.</span>
        <Link href={scopedHref('/financials/reports/loss-causes', report, bridge.currency)}>Open loss causes →</Link>
      </footer>
    </section>
  );
}

function OperationsCard({ report }: { report: IntelligenceReport }) {
  const allRows = activeWorkflowOperations(report.operations);
  const rows = allRows.slice(0, 5);
  const total = allRows.reduce((sum, row) => sum + row.activeCount, 0);

  return (
    <section className="ua-report-card ua-report-operations" aria-labelledby="reports-operations-title">
      <header>
        <div>
          <h2 id="reports-operations-title">Which open operations need attention?</h2>
          <p>Current cases grouped by the next operational step</p>
        </div>
        <strong>{formatNumber(total)} <small>open</small></strong>
      </header>
      {total > 0 ? <div className="ua-report-operation-bar" aria-hidden="true">{rows.map((row, index) => <i key={row.key} title={`${row.label} · ${formatNumber(row.activeCount)} cases`} style={{ flexGrow: row.activeCount, background: OPERATION_COLOURS[index] }} />)}</div> : null}
      <div className="ua-report-operation-list">
        {rows.length ? rows.map((row, index) => <OperationRow key={row.key} row={row} colour={OPERATION_COLOURS[index]} />) : <p className="ua-report-card__empty">No cases are waiting on an operational next step.</p>}
      </div>
      <footer>
        <span>Counts are cases, not amounts.</span>
        <Link href="/work">Open work queue →</Link>
      </footer>
    </section>
  );
}

function OperationRow({ row, colour }: { row: DashboardOperationRow; colour: string }) {
  return (
    <div className="ua-report-operation-row">
      <i style={{ background: colour }} />
      <span title={row.label}>{row.label}</span>
      <strong>{formatNumber(row.activeCount)} {row.activeCount === 1 ? 'case' : 'cases'}</strong>
      <Link href={row.href}>Open</Link>
    </div>
  );
}

function RecoveryCard({
  report,
  bridge,
}: {
  report: IntelligenceReport;
  bridge: MoneyBridge;
}) {
  const recoveryByStatus = new Map(
    report.recoveries
      .filter((row) => row.currency === bridge.currency)
      .map((row) => [row.key, row]),
  );
  const recoveredKnown = financialMetricIsKnown(bridge, 'recovered');
  const recovered = recoveredKnown ? financialMetricValue(bridge, 'recovered') ?? 0 : null;

  return (
    <section className="ua-report-card ua-report-recovery" aria-labelledby="reports-recovery-title">
      <header>
        <div>
          <h2 id="reports-recovery-title">Where is recovered value coming from?</h2>
          <p>Recovered cash by source-backed recovery stage · {bridge.currency}</p>
        </div>
        <strong>{recovered == null ? '— Unavailable' : formatMinorCurrencyNullable(recovered, bridge.currency)}</strong>
      </header>
      <div className="ua-report-recovery-list">
        {RECOVERY_STAGES.map((stage) => {
          const row = recoveryByStatus.get(stage.key);
          const amount = row?.amountMinor ?? 0;
          const count = row?.count ?? 0;
          return (
            <Link key={stage.key} href={row?.href ?? `/financials/recovery?stage=${stage.key}`} className="ua-report-recovery-row">
              <span title={stage.label}>{stage.label}</span>
              <strong data-tone={amount > 0 ? 'cash' : undefined}>{recoveredKnown ? formatMinorCurrencyNullable(amount, bridge.currency) : '— Unavailable'}</strong>
              <small>{count > 0 ? `${formatNumber(count)} ${stage.noun}` : 'No records'}</small>
            </Link>
          );
        })}
      </div>
      <footer>
        <span>Only source-backed recovered cash is shown; earlier stages do not imply payment.</span>
        <Link href="/financials/recovery">Recovery board →</Link>
      </footer>
    </section>
  );
}

function MetricDefinitions() {
  return (
    <section className="ua-report-card ua-report-definitions" aria-labelledby="report-definitions-title">
      <header>
        <h2 id="report-definitions-title">Metric definitions</h2>
        <p>Definitions travel with every export so a figure can be read against the same scope later.</p>
      </header>
      <dl>
        {METRIC_DEFINITIONS.map((definition) => (
          <div key={definition.name}>
            <dt>{definition.name}</dt>
            <dd>{definition.text}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function IntelligenceReportView({
  report,
  selectedReportId = null,
  selectedCurrency = null,
}: {
  report: IntelligenceReport;
  selectedReportId?: string | null;
  selectedCurrency?: string | null;
}) {
  const primaryBridge = primaryBridgeFor(report);
  const primaryReport = primaryBridge ? reportForBridge(report, primaryBridge) : report;
  const secondaryBridges = selectedCurrency || !primaryBridge
    ? []
    : report.bridges.filter((bridge) => bridge.currency !== primaryBridge.currency);

  return (
    <div className="ua-reports-content">
      <ReportCommandIndex report={report} selectedReportId={selectedReportId} selectedCurrency={selectedCurrency} />

      <FinancialStageLadder report={primaryReport} />

      {secondaryBridges.map((bridge) => <CurrencyScopeStrip key={bridge.currency} report={report} bridge={bridge} />)}

      {primaryBridge ? (
        <>
          <div className="ua-report-index-grid ua-report-index-grid--lead">
            <ExposureRecoveryChart report={primaryReport} bridge={primaryBridge} />
            <LossCausesCard report={primaryReport} bridge={primaryBridge} />
          </div>
          <div className="ua-report-index-grid">
            <OperationsCard report={report} />
            <RecoveryCard report={primaryReport} bridge={primaryBridge} />
          </div>
        </>
      ) : (
        <section className="ua-report-card ua-report-card__state">
          <strong>Financial report data unavailable</strong>
          <span>No source-backed financial values exist for this scope. Unavailable values have not been replaced with zero.</span>
        </section>
      )}

      <ReportSourceCoverage report={report} />
      <MetricDefinitions />
    </div>
  );
}
