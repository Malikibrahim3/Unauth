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
  '#b0431a',
  '#9f4f08',
  '#7a5310',
] as const;

const OPERATION_COLOURS = [
  '#247388',
  '#40454a',
  '#b0431a',
  '#6f6a63',
  '#1a6b43',
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
    <section className="report-currency-strip">
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
    <section className="report-card report-trend" aria-labelledby="reports-trend-title">
      <header>
        <div>
          <h2 id="reports-trend-title">Is exposure outpacing recovery?</h2>
          <p>Cumulative recorded value · {bridge.currency} · {scope}</p>
        </div>
        <div className="flex items-center gap-3" aria-label="Chart legend">
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
                  <line x1={PLOT_LEFT} y1={y} x2={PLOT_RIGHT} y2={y} className={index === 4 ? 'relative' : 'grid gap-4'} />
                  <text x={34} y={y + 3} textAnchor="end">{compactAxisMoney(value, bridge.currency)}</text>
                </g>
              );
            })}
            {exposureSegments.map((segment, index) => <polyline key={`exposure-${index}`} points={segment} className="relative relative" />)}
            {recoveredSegments.map((segment, index) => <polyline key={`recovered-${index}`} points={segment} className="relative relative" />)}
            {exposureEnd ? <circle cx={exposureEnd.x} cy={exposureEnd.y} r="2.6" className="relative relative" /> : null}
            {recoveredEnd ? <circle cx={recoveredEnd.x} cy={recoveredEnd.y} r="2.6" className="relative relative" /> : null}
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
        <div className="rounded-xl border border-[#e4e3e0] bg-white">
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
    <section className="report-card report-causes" aria-labelledby="reports-causes-title">
      <header>
        <h2 id="reports-causes-title">Which causes make up confirmed loss?</h2>
        <p>{confirmedLoss == null ? 'Confirmed loss unavailable' : `${formatMinorCurrencyNullable(confirmedLoss, bridge.currency)} confirmed`} · {bridge.currency} · recorded cause</p>
      </header>
      <div className="flex flex-col gap-3">
        <svg width="142" height="142" viewBox="0 0 120 120" role="img" aria-label="Confirmed loss grouped by merchant-recorded cause">
          <circle cx="60" cy="60" r="46" className="relative" />
          {causeSegments.map((cause) => (
            <circle
              key={cause.key}
              cx="60"
              cy="60"
              r="46"
              style={{ stroke: cause.colour }}
              strokeDasharray={cause.dashArray}
              strokeDashoffset={cause.dashOffset}
            />
          ))}
          <text x="60" y="57" textAnchor="middle" className="font-semibold tabular-nums text-[#1c1f23]">{confirmedLoss == null ? '—' : wholeMoney(confirmedLoss, bridge.currency)}</text>
          <text x="60" y="71" textAnchor="middle" className="text-[11px] leading-[1.45] text-[#64686d]">confirmed</text>
        </svg>
        <div className="flex flex-col gap-3">
          {causes.length ? causes.map((cause, index) => (
            <Link key={cause.key} href={cause.href} className="border-t border-[#e4e3e0]">
              <i style={{ background: CAUSE_COLOURS[index] }} />
              <span>
                <b title={cause.label}>{cause.label}</b>
                <small>{formatNumber(cause.count)} {cause.count === 1 ? 'case' : 'cases'} · merchant-recorded cause</small>
              </span>
              <strong>{formatMinorCurrencyNullable(cause.amountMinor, cause.currency)}</strong>
              <em>{total > 0 ? `${Math.round(cause.amountMinor / total * 100)}%` : '—'}</em>
            </Link>
          )) : <p className="rounded-xl border border-[#e4e3e0] bg-white">No confirmed-loss causes were recorded in this scope.</p>}
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
    <section className="report-card report-operations" aria-labelledby="reports-operations-title">
      <header>
        <div>
          <h2 id="reports-operations-title">Which open operations need attention?</h2>
          <p>Current cases grouped by the next operational step</p>
        </div>
        <strong>{formatNumber(total)} <small>open</small></strong>
      </header>
      {total > 0 ? <div className="relative" aria-hidden="true">{rows.map((row, index) => <i key={row.key} title={`${row.label} · ${formatNumber(row.activeCount)} cases`} style={{ flexGrow: row.activeCount, background: OPERATION_COLOURS[index] }} />)}</div> : null}
      <div className="flex flex-col gap-3">
        {rows.length ? rows.map((row, index) => <OperationRow key={row.key} row={row} colour={OPERATION_COLOURS[index]} />) : <p className="rounded-xl border border-[#e4e3e0] bg-white">No cases are waiting on an operational next step.</p>}
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
    <div className="border-t border-[#e4e3e0]">
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
    <section className="report-card report-recovery" aria-labelledby="reports-recovery-title">
      <header>
        <div>
          <h2 id="reports-recovery-title">Where is recovered value coming from?</h2>
          <p>Recovered cash by source-backed recovery stage · {bridge.currency}</p>
        </div>
        <strong>{recovered == null ? '— Unavailable' : formatMinorCurrencyNullable(recovered, bridge.currency)}</strong>
      </header>
      <div className="flex flex-col gap-3">
        {RECOVERY_STAGES.map((stage) => {
          const row = recoveryByStatus.get(stage.key);
          const amount = row?.amountMinor ?? 0;
          const count = row?.count ?? 0;
          return (
            <Link key={stage.key} href={row?.href ?? `/financials/recovery?stage=${stage.key}`} className="border-t border-[#e4e3e0]">
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
    <section className="report-card report-definitions" aria-labelledby="report-definitions-title">
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
    <div className="report-authority">
      <ReportCommandIndex report={report} selectedReportId={selectedReportId} selectedCurrency={selectedCurrency} />

      <FinancialStageLadder report={primaryReport} />

      {secondaryBridges.map((bridge) => <CurrencyScopeStrip key={bridge.currency} report={report} bridge={bridge} />)}

      {primaryBridge ? (
        <>
          <div className="report-primary-grid">
            <ExposureRecoveryChart report={primaryReport} bridge={primaryBridge} />
            <LossCausesCard report={primaryReport} bridge={primaryBridge} />
          </div>
          <div className="report-secondary-grid">
            <OperationsCard report={report} />
            <RecoveryCard report={primaryReport} bridge={primaryBridge} />
          </div>
        </>
      ) : (
        <section className="rounded-xl border border-[#e4e3e0] bg-white p-6 text-center text-[#64686d]" data-state-id="reports-unavailable-zero">
          <strong>Financial report data unavailable</strong>
          <span>No source-backed financial values exist for this scope. Unavailable values have not been replaced with zero.</span>
        </section>
      )}

      <ReportSourceCoverage report={report} />
      <MetricDefinitions />
      <style>{`
        .report-authority{display:flex;flex-direction:column;gap:12px;color:#1c1f23}.report-authority *{box-sizing:border-box;min-width:0}.report-authority a{text-decoration:none}.report-command-index,.report-source-coverage,.report-card{border:1px solid #e4e3e0;border-radius:11px;background:#fff;overflow:hidden;box-shadow:0 1px 2px rgba(28,27,25,.04)}.report-command-index>header,.report-source-coverage>header,.report-card>header{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;padding:12px 15px;border-bottom:1px solid #eae8e5}.report-command-index h2,.report-source-coverage h2,.report-card h2,.report-definitions h2{margin:0;font-size:12.5px;line-height:1.35;font-weight:500}.report-command-index header p,.report-source-coverage header p,.report-card header p,.report-definitions header p{margin:4px 0 0;color:#6f6a63;font-size:10.5px;line-height:1.45}.report-command-list{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1px;background:#eae8e5}.report-command-row{display:grid;grid-template-columns:minmax(0,1fr) auto;grid-template-rows:auto auto;gap:5px 8px;padding:12px 14px;background:#fff;color:#1c1f23}.report-command-row[data-selected=true]{background:#fff3e9}.report-command-row strong{font-size:11.5px;font-weight:500}.report-command-row>span{grid-column:1/-1;color:#64686d;font-size:10.5px;line-height:1.4}.report-command-row small{color:#6f6a63;font:400 9.5px/1.3 'IBM Plex Mono',monospace}.report-command-row i{grid-column:2;grid-row:1;color:#9f4f08;font-style:normal}.report-currency-strip{display:flex;align-items:center;gap:20px;padding:11px 14px;border-radius:10px;background:#fff3e9}.report-currency-strip h2{margin:0;font-size:12px}.report-currency-strip p{margin:3px 0 0;color:#8a6a2e;font-size:10.5px}.report-currency-strip a{margin-left:auto;color:#8a3905;font-size:11px;white-space:nowrap}.report-primary-grid{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(260px,.75fr);gap:12px}.report-secondary-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.report-card>header>strong{font:500 15px/1 'IBM Plex Mono',monospace}.report-card>footer{display:flex;align-items:center;gap:14px;padding:10px 14px;border-top:1px solid #eae8e5;color:#6f6a63;font-size:10.5px;line-height:1.45}.report-card>footer>span{flex:1}.report-card>footer a{color:#9f4f08;white-space:nowrap}.report-trend>svg{display:block;padding:12px 12px 4px;overflow:visible}.report-trend svg text{fill:#6f6a63;font:400 9.5px 'IBM Plex Mono',monospace}.report-trend svg line{stroke:#eae8e5}.report-trend svg polyline{fill:none;stroke:#b0431a;stroke-width:1.7}.report-trend svg polyline:nth-of-type(n+2){stroke:#1a6b43}.report-trend header [aria-label='Chart legend'] span{display:flex;align-items:center;gap:5px;color:#6f6a63;font-size:10px}.report-trend header [aria-label='Chart legend'] i{width:7px;height:7px;border-radius:50%;background:#b0431a}.report-trend header [aria-label='Chart legend'] i[data-tone=recovered]{background:#1a6b43}.report-causes>.flex,.report-operations>.flex,.report-recovery>.flex{padding:12px 14px}.report-causes>.flex{display:grid;grid-template-columns:142px minmax(0,1fr);align-items:center}.report-causes circle.relative{fill:none;stroke:#e4e3e0;stroke-width:12}.report-causes circle:not(.relative){fill:none;stroke-width:12;transform:rotate(-90deg);transform-origin:center}.report-causes .flex.flex-col a,.report-recovery .flex.flex-col a{display:grid;grid-template-columns:minmax(0,1fr) auto auto;align-items:center;gap:10px;padding:9px 0;color:#1c1f23}.report-causes a>i{width:7px;height:7px;border-radius:50%}.report-causes a>span b,.report-causes a>span small{display:block}.report-causes a>span b{font-size:11px}.report-causes a>span small,.report-recovery a small{color:#6f6a63;font-size:9.5px}.report-causes a>strong,.report-recovery a>strong{font:500 10.5px/1 'IBM Plex Mono',monospace}.report-causes a>em{color:#6f6a63;font:400 9.5px/1 'IBM Plex Mono',monospace}.report-operations>.relative{height:6px;margin:12px 14px 0;display:flex;border-radius:4px;overflow:hidden}.report-operations>.flex>div{display:grid;grid-template-columns:7px minmax(0,1fr) auto auto;align-items:center;gap:9px;padding:9px 0}.report-operations>.flex>div>i{width:7px;height:7px;border-radius:50%}.report-operations>.flex span{font-size:10.5px}.report-operations>.flex strong{font:500 10px/1 'IBM Plex Mono',monospace}.report-operations>.flex a{color:#9f4f08;font-size:10.5px}.report-recovery .flex.flex-col a{grid-template-columns:minmax(0,1fr) auto auto}.report-recovery a>span{font-size:10.5px}.report-recovery strong[data-tone=cash]{color:#1a6b43}.report-coverage-table{font-size:10.5px}.report-coverage-row{display:grid;grid-template-columns:1fr 90px 80px 90px 1.5fr;gap:12px;align-items:center;padding:9px 14px;border-top:1px solid #eae8e5;color:#40454a}.report-coverage-head{border-top:0;background:#f4f3f1;color:#6f6a63;font:500 9.5px/1.3 'IBM Plex Mono',monospace;text-transform:uppercase}.report-coverage-row strong{font-weight:500}.report-coverage-row small{color:#6f6a63}.report-source-coverage>footer{padding:10px 14px;background:#f4f3f1;color:#6f6a63;font-size:10px}.report-definitions dl{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));margin:0}.report-definitions dl>div{padding:11px 14px;border-top:1px solid #eae8e5}.report-definitions dt{font-size:10.5px;font-weight:500}.report-definitions dd{margin:4px 0 0;color:#6f6a63;font-size:9.5px;line-height:1.45}
        @media(max-width:900px){.report-command-list{grid-template-columns:repeat(2,minmax(0,1fr))}.report-primary-grid,.report-secondary-grid{grid-template-columns:1fr}.report-coverage-table{overflow-x:auto}.report-coverage-row{min-width:680px}.report-card>header{flex-wrap:wrap}}`
      }</style>
    </div>
  );
}
