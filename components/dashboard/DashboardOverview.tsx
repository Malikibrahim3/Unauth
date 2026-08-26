'use client';

import Link from '@/components/navigation/AppNavLink';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock,
  Filter,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  TrendingDown,
  X,
} from 'lucide-react';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import ExportMenu from '@/components/reports/ExportMenu';
import { ChartDataTable, simpleChartTable } from '@/components/charts/authenticated/ChartFrame';
import type {
  DashboardPeriodComparison,
  IntelligenceReport,
  MoneyBridge,
  ReportRange,
} from '@/lib/reporting/intelligence';
import {
  financialReportRecordsHref,
  REPORT_RANGES,
  reportDateKey,
  type FinancialReportMetric,
} from '@/lib/reporting/intelligence';
import {
  formatCurrencyCompact,
  formatDayMonthInTimeZone,
  formatDateAbsolute,
  formatMoney,
  formatNumber,
} from '@/lib/utils/format';
import { fromMinorUnits } from '@/lib/canonical/money';
import {
  attentionOperationSupportCopy,
  bridgeMetricValue,
  buildDashboardAttentionPriorities,
  buildDashboardChartBuckets,
  calculateSourceFreshness,
  dashboardBucketBasisLabel,
  DASHBOARD_METRICS,
  summarizeDashboardWork,
  type DashboardChartBucket,
  type DashboardMetricKey,
} from './dashboardModel';
import { TIME_RANGE_LABELS } from '@/lib/ui/merchantCopy';
import type { Permission } from '@/lib/permissions';
import { MetricGroup } from '@/components/ui/MetricGroup';
import { UnavailableValue } from '@/components/ui/ProductValue';
import styles from './dashboardPilot.module.css';

type DashboardOverviewProps = {
  report: IntelligenceReport;
  comparison: DashboardPeriodComparison | null;
  selectedCurrency: string | null;
  compare: 'previous' | 'none';
  userName?: string | null;
  workspaceName?: string | null;
  permissions?: Permission[];
};

const DASHBOARD_REPORT_METRICS: Record<DashboardMetricKey, FinancialReportMetric> = {
  exposure: 'exposed',
  recovered: 'recovered',
  prevented: 'prevented',
  realisedLoss: 'confirmed_loss',
};

type OverviewBucket = DashboardChartBucket & {
  identified: number | null;
  prevented: number | null;
  recovered: number | null;
  realised: number | null;
  open: number | null;
};

type ChartTableRow = {
  key: string;
  label: string;
  identified: number | null;
  prevented: number | null;
  recovered: number | null;
  realised: number | null;
  open: number | null;
};

type ChipTone = 'positive' | 'negative' | 'neutral';
/** §14.5/§14.6 axis names — urgency and workflow, never the retained generic alert colours (F-12-adjacent: "Review" is a workflow state, not an info banner). */
type QueueTone = 'urgency-breached' | 'workflow-blocked' | 'urgency-approaching' | 'workflow-ready' | 'workflow-closed';

function metricState(metric: DashboardMetricKey): string {
  return metric === 'exposure'
    ? 'exposed'
    : metric === 'realisedLoss'
      ? 'confirmed_loss'
      : metric;
}

function bridgeValue(
  bridge: MoneyBridge | null | undefined,
  metric: DashboardMetricKey,
): number | null {
  if (!bridge || !bridge.knownStates.includes(metricState(metric))) return null;
  return bridgeMetricValue(bridge, metric);
}

function bridgeOpenValue(bridge: MoneyBridge | null | undefined): number | null {
  const values = {
    identified: bridgeValue(bridge, 'exposure'),
    prevented: bridgeValue(bridge, 'prevented'),
    recovered: bridgeValue(bridge, 'recovered'),
    realised: bridgeValue(bridge, 'realisedLoss'),
  };
  if (Object.values(values).some((value) => value == null)) return null;
  const open = values.identified! - values.prevented! - values.recovered! - values.realised!;
  return open >= 0 ? open : null;
}

function buildOverviewBuckets(input: {
  current: IntelligenceReport['trend'];
  previous?: IntelligenceReport['trend'] | null;
  range: ReportRange;
  currency: string;
  asOf: string;
  timezone: string;
  metric: DashboardMetricKey;
}): OverviewBucket[] {
  if (input.range !== 'all') {
    const rangeDays = input.range === '7d' ? 7 : input.range === '90d' ? 90 : 30;
    const dayMs = 86_400_000;
    const endKey = reportDateKey(input.asOf, input.timezone);
    const end = Date.parse(endKey + 'T12:00:00.000Z');
    const currentStart = end - (rangeDays - 1) * dayMs;
    const previousStart = currentStart - rangeDays * dayMs;
    const currentByDate = new Map(
      input.current
        .filter((point) => point.currency === input.currency)
        .map((point) => [point.date, point] as const),
    );
    const previousByDate = new Map(
      (input.previous ?? [])
        .filter((point) => point.currency === input.currency)
        .map((point) => [point.date, point] as const),
    );
    const knownCurrentStates = new Set(
      input.current
        .filter((point) => point.currency === input.currency)
        .flatMap((point) => point.knownStates),
    );
    const knownPreviousStates = new Set(
      (input.previous ?? [])
        .filter((point) => point.currency === input.currency)
        .flatMap((point) => point.knownStates),
    );
    const metricStateFor = (metric: DashboardMetricKey) => metricState(metric);
    const pointValue = (
      point: IntelligenceReport['trend'][number] | undefined,
      metric: DashboardMetricKey,
      knownStates: Set<string>,
    ): number | null => {
      const state = metricStateFor(metric);
      if (!knownStates.has(state)) return null;
      if (!point) return 0;
      if (!point.knownStates.includes(state)) return 0;
      if (metric === 'exposure') return point.exposureMinor;
      if (metric === 'prevented') return point.preventedMinor;
      if (metric === 'recovered') return point.recoveredMinor;
      return point.realisedLossMinor;
    };

    return Array.from({ length: rangeDays }, (_, index) => {
      const currentDate = new Date(currentStart + index * dayMs);
      const previousDate = new Date(previousStart + index * dayMs);
      const key = reportDateKey(currentDate, input.timezone);
      const previousKey = reportDateKey(previousDate, input.timezone);
      const currentPoint = currentByDate.get(key);
      const previousPoint = previousByDate.get(previousKey);
      const identified = pointValue(currentPoint, 'exposure', knownCurrentStates);
      const prevented = pointValue(currentPoint, 'prevented', knownCurrentStates);
      const recovered = pointValue(currentPoint, 'recovered', knownCurrentStates);
      const realised = pointValue(currentPoint, 'realisedLoss', knownCurrentStates);
      const previousIdentified = pointValue(previousPoint, 'exposure', knownPreviousStates);
      const previousPrevented = pointValue(previousPoint, 'prevented', knownPreviousStates);
      const previousRecovered = pointValue(previousPoint, 'recovered', knownPreviousStates);
      const previousRealised = pointValue(previousPoint, 'realisedLoss', knownPreviousStates);
      const open = [identified, prevented, recovered, realised].every((value) => value != null)
        ? Math.max(0, identified! - prevented! - recovered! - realised!)
        : null;
      const previousOpen = [previousIdentified, previousPrevented, previousRecovered, previousRealised]
        .every((value) => value != null)
        ? Math.max(0, previousIdentified! - previousPrevented! - previousRecovered! - previousRealised!)
        : null;
      const values = { exposure: identified, prevented, recovered, realisedLoss: realised };
      const previousValues = {
        exposure: previousIdentified,
        prevented: previousPrevented,
        recovered: previousRecovered,
        realisedLoss: previousRealised,
      };

      return {
        key,
        label: formatDay(currentDate, input.timezone),
        currentMinor: values[input.metric],
        previousMinor: previousValues[input.metric],
        identified,
        prevented,
        recovered,
        realised,
        open,
        _previousOpen: previousOpen,
      } as OverviewBucket & { _previousOpen?: number | null };
    });
  }

  const make = (metric: DashboardMetricKey) => buildDashboardChartBuckets({
    current: input.current,
    previous: input.previous,
    range: input.range,
    currency: input.currency,
    metric,
    asOf: input.asOf,
  });
  const selected = make(input.metric);
  const identified = make('exposure');
  const prevented = make('prevented');
  const recovered = make('recovered');
  const realised = make('realisedLoss');

  return selected.map((bucket, index) => {
    const currentValues = {
      identified: identified[index]?.currentMinor ?? null,
      prevented: prevented[index]?.currentMinor ?? null,
      recovered: recovered[index]?.currentMinor ?? null,
      realised: realised[index]?.currentMinor ?? null,
    };
    const previousValues = {
      identified: identified[index]?.previousMinor ?? null,
      prevented: prevented[index]?.previousMinor ?? null,
      recovered: recovered[index]?.previousMinor ?? null,
      realised: realised[index]?.previousMinor ?? null,
    };
    const open = Object.values(currentValues).every((value) => value != null)
      ? Math.max(0, currentValues.identified! - currentValues.prevented! - currentValues.recovered! - currentValues.realised!)
      : null;
    const previousOpen = Object.values(previousValues).every((value) => value != null)
      ? Math.max(0, previousValues.identified! - previousValues.prevented! - previousValues.recovered! - previousValues.realised!)
      : null;

    return {
      ...bucket,
      identified: currentValues.identified,
      prevented: currentValues.prevented,
      recovered: currentValues.recovered,
      realised: currentValues.realised,
      open,
      currentMinor: bucket.currentMinor,
      previousMinor: bucket.previousMinor,
      ...(input.metric === 'exposure'
        ? {}
        : {
            currentMinor: bucket.currentMinor,
            previousMinor: bucket.previousMinor,
          }),
      _previousOpen: previousOpen,
    } as OverviewBucket & { _previousOpen?: number | null };
  });
}

function formatDay(value: string | Date, timezone: string, weekday = false): string {
  return formatDayMonthInTimeZone(value, timezone, weekday);
}

function formatRangeLabel(
  range: ReportRange,
  data: OverviewBucket[],
  timezone: string,
): string {
  if (data.length === 0 || range === 'all') return TIME_RANGE_LABELS[range];
  const first = formatDay(data[0].key, timezone);
  const lastBucket = data[data.length - 1];
  const last = lastBucket.label.includes('–')
    ? lastBucket.label.split('–').pop()?.trim() ?? formatDay(lastBucket.key, timezone)
    : formatDay(lastBucket.key, timezone);
  return first === last ? first : first + ' – ' + last;
}

function formatScopedMoney(value: number | null, currency: string | null): string {
  return value == null || !currency ? 'Unavailable' : formatMoney(value, currency);
}

function formatCompactMoney(value: number | null, currency: string | null): string {
  if (value == null || !currency) return '—';
  return formatCurrencyCompact(fromMinorUnits(value, currency), currency);
}

function deltaChip(
  current: number | null,
  previous: number | null,
  increaseIsGood: boolean,
): { text: string; tone: ChipTone } | null {
  if (current == null || previous == null || previous === 0) return null;
  const delta = ((current - previous) / Math.abs(previous)) * 100;
  const improved = (delta >= 0) === increaseIsGood;
  return {
    text: (delta >= 0 ? '↑ ' : '↓ ') + Math.abs(delta).toFixed(1) + '%',
    tone: improved ? 'positive' : 'negative',
  };
}

function queueTone(operation: {
  key: string;
  overdueCount: number;
  approachingCount: number;
  readyCount: number;
}): { label: string; tone: QueueTone } {
  if (operation.overdueCount > 0) return { label: 'Breached', tone: 'urgency-breached' };
  if (operation.key.includes('evidence') || operation.key.includes('awaiting')) {
    return { label: 'Blocked', tone: 'workflow-blocked' };
  }
  if (operation.approachingCount > 0) return { label: 'Urgent', tone: 'urgency-approaching' };
  if (operation.readyCount > 0) return { label: 'Review', tone: 'workflow-ready' };
  return { label: 'Exception', tone: 'workflow-closed' };
}

function attentionReasons(
  operation: {
    overdueCount: number;
    approachingCount: number;
    activeCount: number;
    selectedExposureMinor: number | null;
    unvaluedCaseCount: number;
  },
  currency: string | null,
): string[] {
  const reasons: string[] = [];
  if (operation.overdueCount > 0) {
    reasons.push(formatNumber(operation.overdueCount) + ' overdue');
  } else if (operation.approachingCount > 0) {
    reasons.push(formatNumber(operation.approachingCount) + ' approaching SLA');
  }
  if (currency && operation.selectedExposureMinor != null && reasons.length < 2) {
    reasons.push(
      (operation.unvaluedCaseCount > 0 ? 'At least ' : '')
      + formatMoney(operation.selectedExposureMinor, currency)
      + ' exposure',
    );
  }
  if (reasons.length === 0) {
    reasons.push(formatNumber(operation.activeCount) + ' active');
  }
  return reasons.slice(0, 2);
}

export function buildNonNegativeSmoothPaths(
  values: Array<number | null>,
  ceiling: number,
  width: number,
  padLeft: number,
  padRight: number,
  top: number,
  bottom: number,
): string[] {
  const points = values.map((value, index) => {
    if (value == null) return null;
    const x = padLeft + ((index + 0.5) / values.length) * (width - padLeft - padRight);
    const ratio = Math.max(0, Math.min(1, value / ceiling));
    const y = bottom - ratio * (bottom - top);
    return [x, y] as const;
  });
  const paths: string[] = [];
  let segment: Array<readonly [number, number]> = [];
  const flush = () => {
    if (segment.length > 1) {
      let result = 'M' + segment[0][0].toFixed(1) + ' ' + segment[0][1].toFixed(1);
      for (let index = 0; index < segment.length - 1; index += 1) {
        const p0 = segment[index - 1] ?? segment[index];
        const p1 = segment[index];
        const p2 = segment[index + 1];
        const p3 = segment[index + 2] ?? p2;
        const tension = 0.2;
        const c1x = p1[0] + (p2[0] - p0[0]) * tension;
        const c1y = Math.max(top, Math.min(bottom, p1[1] + (p2[1] - p0[1]) * tension));
        const c2x = p2[0] - (p3[0] - p1[0]) * tension;
        const c2y = Math.max(top, Math.min(bottom, p2[1] - (p3[1] - p1[1]) * tension));
        result += ' C' + c1x.toFixed(1) + ' ' + c1y.toFixed(1)
          + ' ' + c2x.toFixed(1) + ' ' + c2y.toFixed(1)
          + ' ' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1);
      }
      paths.push(result);
    }
    segment = [];
  };
  points.forEach((point) => {
    if (point == null) flush();
    else segment.push(point);
  });
  flush();
  return paths;
}

/**
 * §VP3 task 17 — hand-authored SVGs replaced with the closest-meaning lucide
 * glyph: open→Clock (unresolved/pending), identified→BarChart3 (the
 * ascending-bars mark this glyph always was), prevented→ShieldCheck,
 * recovered→RotateCcw (a returned/restored value), realised (default)→
 * TrendingDown (a confirmed loss). Rendered at --uo-route-icon-sm (14px).
 */
function MetricGlyph({ metric }: { metric: string }) {
  const common = { size: 14, 'aria-hidden': true as const };
  if (metric === 'open') return <Clock {...common} />;
  if (metric === 'identified') return <BarChart3 {...common} />;
  if (metric === 'prevented') return <ShieldCheck {...common} />;
  if (metric === 'recovered') return <RotateCcw {...common} />;
  return <TrendingDown {...common} />;
}

function OverviewResolutionChart({
  data,
  compare,
  currency,
  metricLabel,
  metricDescription,
  scope,
  coverageNote,
  basisLabel,
  formatValue,
  formatAxisValue,
  tableRows,
  recordsHref,
}: {
  data: OverviewBucket[];
  compare: boolean;
  currency: string | null;
  metricLabel: string;
  metricDescription: string;
  scope: string;
  coverageNote: string;
  basisLabel: string;
  formatValue: (value: number | null) => string;
  formatAxisValue: (value: number | null) => string;
  tableRows: ChartTableRow[];
  recordsHref: string | null;
}) {
  const [hoverIndex, setHoverIndex] = useState(-1);
  const [tableOpen, setTableOpen] = useState(false);
  const [rovingIndex, setRovingIndex] = useState(0);
  const bucketRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedIndex = hoverIndex >= 0 ? hoverIndex : -1;
  const values = data.map((point) => point.currentMinor)
    .filter((value): value is number => value != null);
  const ceiling = Math.max(1, ...values) * 1.1;
  const resolvedValues = data.map((point) => (
    (point.prevented ?? 0) + (point.recovered ?? 0) + (point.realised ?? 0)
  ));
  const resolvedCeiling = Math.max(1, ...resolvedValues) * 1.06;
  const linePaths = buildNonNegativeSmoothPaths(
    data.map((point) => point.currentMinor),
    ceiling,
    800,
    46,
    8,
    16,
    162,
  );
  const previousPaths = buildNonNegativeSmoothPaths(
    data.map((point) => point.previousMinor),
    ceiling,
    800,
    46,
    8,
    16,
    162,
  );
  const areaPath = data.every((point) => point.currentMinor != null) && linePaths[0]
    ? linePaths[0]
      + ' L' + (46 + ((data.length - 0.5) / data.length) * (800 - 46 - 8)).toFixed(1) + ' 162'
      + ' L' + (46 + (0.5 / data.length) * (800 - 46 - 8)).toFixed(1) + ' 162 Z'
    : null;
  const peakIndex = data.reduce((best, point, index) => (
    point.currentMinor != null
      && (best === -1 || point.currentMinor > (data[best].currentMinor ?? -1))
      ? index
      : best
  ), -1);
  const peak = peakIndex >= 0 ? data[peakIndex] : null;
  const selected = selectedIndex >= 0 ? data[selectedIndex] : null;
  const gridValues = [ceiling, ceiling / 2, 0];
  const tickEvery = Math.max(1, Math.ceil(data.length / 7));
  const tableCaption = metricLabel + ' by period — ' + (currency ?? 'selected currency');
  const formatResolution = (value: number | null) => value == null ? formatValue(null) : '−' + formatValue(value);

  useEffect(() => {
    setHoverIndex(-1);
    setRovingIndex(0);
  }, [data, metricLabel]);

  function selectAt(index: number) {
    setHoverIndex(Math.max(0, Math.min(data.length - 1, index)));
    setRovingIndex(Math.max(0, Math.min(data.length - 1, index)));
  }

  function onChartMove(event: ReactMouseEvent<HTMLDivElement>) {
    if (data.length === 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const viewX = (event.clientX - rect.left) / rect.width * 800;
    const step = (800 - 46 - 8) / data.length;
    selectAt(Math.floor((viewX - 46) / step));
  }

  function onBucketKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number | null = null;
    if (event.key === 'ArrowLeft') next = Math.max(0, index - 1);
    if (event.key === 'ArrowRight') next = Math.min(data.length - 1, index + 1);
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = data.length - 1;
    if (event.key === 'Escape') {
      event.preventDefault();
      setHoverIndex(-1);
      return;
    }
    if (next == null) return;
    event.preventDefault();
    setRovingIndex(next);
    bucketRefs.current[next]?.focus();
    setHoverIndex(next);
  }

  return (
    <>
      <div className={styles.positionTimeline}>
        <div className={styles.timelineReadout}>
        <div>
          <strong>{selected ? selected.label : scope}</strong>
          <span>
            {selected
              ? metricLabel + ' ' + formatValue(selected.currentMinor)
              : peak?.currentMinor != null && peak.currentMinor > 0
                ? 'Peak ' + formatValue(peak.currentMinor) + ' · ' + peak.label
                : 'No known interval peak in this period'}
          </span>
          <span className="sr-only">{metricDescription}</span>
        </div>
        <div className={styles.timelineReadoutSeries}>
          {selected?.recovered != null && metricLabel !== 'Recovered' ? (
            <span data-tone="observed">Recovered {formatValue(selected.recovered)}</span>
          ) : null}
          {compare && selected?.previousMinor != null ? (
            <span data-tone="comparison">Previous {formatValue(selected.previousMinor)}</span>
          ) : null}
          {!selected ? <span data-tone="comparison">Hover a period to inspect the ledger</span> : null}
        </div>
        </div>

        <div
          className={styles.timelinePlot}
          data-testid="financial-plot"
          role="group"
          aria-label={metricLabel + ' timeline — ' + scope}
          onMouseMove={onChartMove}
          onMouseLeave={() => setHoverIndex(-1)}
        >
        <svg viewBox="0 0 800 262" className={styles.timelineSvg} aria-hidden="true">
          <defs>
            <linearGradient id="overview-exposure-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--uo-route-outcome-identified)" stopOpacity="0.14" />
              <stop offset="72%" stopColor="var(--uo-route-outcome-identified)" stopOpacity="0.04" />
              <stop offset="100%" stopColor="var(--uo-route-outcome-identified)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {gridValues.map((value) => {
            const y = 162 - (value / ceiling) * (162 - 16);
            return <line key={value} x1="46" x2="792" y1={y} y2={y} className={styles.timelineGridLine} />;
          })}
          {areaPath ? <path d={areaPath} fill="url(#overview-exposure-fill)" /> : null}
          {compare ? previousPaths.map((path) => (
            <path key={path} d={path} className={styles.comparisonPath} />
          )) : null}
          {linePaths.map((path) => <path key={path} d={path} className={styles.timelineLine} />)}
          {data.map((point, index) => {
            const step = (800 - 46 - 8) / data.length;
            const width = Math.max(3, Math.min(13, step * 0.54));
            const x = 46 + index * step + (step - width) / 2;
            const prevented = point.prevented ?? 0;
            const recovered = point.recovered ?? 0;
            const realised = point.realised ?? 0;
            const scale = (238 - 186) / resolvedCeiling;
            const y1 = 238 - prevented * scale;
            const y2 = y1 - recovered * scale;
            const y3 = y2 - realised * scale;
            return (
              <g key={point.key}>
                {point.prevented != null ? <rect x={x} y={y1} width={width} height={238 - y1} fill="var(--uo-route-outcome-prevented)" /> : null}
                {point.recovered != null ? <rect x={x} y={y2} width={width} height={y1 - y2} fill="var(--uo-route-outcome-recovered)" /> : null}
                {point.realised != null ? <rect x={x} y={y3} width={width} height={y2 - y3} rx={Math.min(2.6, width / 2.4)} fill="var(--uo-route-outcome-realised)" /> : null}
              </g>
            );
          })}
          <text x="46" y="178" className={styles.resolvedLabel}>OUTCOMES BY INTAKE DAY · POSITIVE VALUES</text>
          {selected ? (
            <>
              <line
                x1={46 + (selectedIndex + 0.5) / data.length * (800 - 46 - 8)}
                x2={46 + (selectedIndex + 0.5) / data.length * (800 - 46 - 8)}
                y1="14"
                y2="236"
                className={styles.hoverLine}
              />
              <circle
                cx={46 + (selectedIndex + 0.5) / data.length * (800 - 46 - 8)}
                cy={162 - ((selected.currentMinor ?? 0) / ceiling) * (162 - 16)}
                r="3.6"
                className={styles.hoverPoint}
              />
            </>
          ) : null}
        </svg>

        <div className={styles.timelineAxis} aria-hidden="true">
          {gridValues.map((value) => {
            const y = 162 - (value / ceiling) * (162 - 16);
            return <span key={value} style={{ top: (y / 262 * 100) + '%' }}>{formatAxisValue(value)}</span>;
          })}
        </div>
        <div className={styles.timelineTicks} aria-hidden="true">
          {data.map((point, index) => index % tickEvery === 0 ? (
            <span key={point.key} style={{ left: ((46 + (index + 0.5) / data.length * (800 - 46 - 8)) / 800 * 100) + '%' }}>
              {point.label}
            </span>
          ) : null)}
        </div>
        <div className={styles.timelineBuckets}>
          {data.map((point, index) => (
            <button
              key={point.key}
              ref={(node) => { bucketRefs.current[index] = node; }}
              type="button"
              className={styles.timelineBucket}
              style={{ '--bucket-count': data.length, '--bucket-index': index } as CSSProperties}
              tabIndex={index === rovingIndex ? 0 : -1}
              aria-label={[
                point.label,
                metricLabel + ' ' + formatValue(point.currentMinor),
                point.recovered != null && metricLabel !== 'Recovered'
                  ? 'Recovered ' + formatValue(point.recovered)
                  : null,
              ].filter(Boolean).join(', ')}
              aria-pressed={selectedIndex === index}
              onFocus={() => selectAt(index)}
              onMouseEnter={() => selectAt(index)}
              onKeyDown={(event) => onBucketKeyDown(event, index)}
              onClick={() => selectAt(index)}
            />
          ))}
        </div>
        {selected ? (
          <div
            className={styles.chartTooltip}
            style={{
              left: ((46 + (selectedIndex + 0.5) / data.length * (800 - 46 - 8)) / 800 * 100) + '%',
              transform: 46 + (selectedIndex + 0.5) / data.length * (800 - 46 - 8) > 590
                ? 'translateX(calc(-100% - 12px))'
                : 'translateX(12px)',
            }}
          >
            <strong>{formatDay(selected.key, 'UTC', true)}</strong>
            <div><span>Identified</span><b>{formatValue(selected.identified)}</b></div>
            <div><span>Prevented</span><b data-tone="green">{formatResolution(selected.prevented)}</b></div>
            <div><span>Recovered</span><b data-tone="blue">{formatResolution(selected.recovered)}</b></div>
            <div><span>Realised loss</span><b data-tone="coral">{formatResolution(selected.realised)}</b></div>
          </div>
        ) : null}
        </div>

        <div className={styles.timelineLegend} aria-label="Chart legend">
          <span><i data-tone="identified" />Identified</span>
          <span><i data-tone="prevented" />Prevented</span>
          <span><i data-tone="recovered" />Recovered</span>
          <span><i data-tone="realised" />Realised</span>
          {compare ? <span><i data-tone="comparison" />Previous period</span> : null}
        </div>
      </div>

      <div className={styles.chartFooter}>
        <span>Canonical ledger · {coverageNote}</span>
        <div>
          <span className="sr-only">
            {recordsHref ? <Link href={recordsHref}>View underlying records</Link> : null}
            <span>{basisLabel}</span>
          </span>
          <button
            type="button"
            className={styles.timelineDataAction}
            aria-label={tableOpen ? 'Hide data table' : 'View data'}
            onClick={() => setTableOpen((value) => !value)}
          >
            {tableOpen ? 'Hide data table' : 'Show data table'}
          </button>
        </div>
      </div>

      {tableOpen ? (
        <div className={styles.chartTableWrap}>
          <table>
            <caption className="sr-only">{tableCaption}</caption>
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Identified</th>
                <th scope="col">Prevented</th>
                <th scope="col">Recovered</th>
                <th scope="col">Realised</th>
                <th scope="col">Open</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.slice(-7).map((row) => (
                <tr key={row.key}>
                  <th scope="row">{row.label}</th>
                  <td>{formatValue(row.identified)}</td>
                  <td data-tone="green"><span aria-hidden="true">{formatResolution(row.prevented)}</span><span className="sr-only">{formatValue(row.prevented)}</span></td>
                  <td data-tone="blue"><span aria-hidden="true">{formatResolution(row.recovered)}</span><span className="sr-only">{formatValue(row.recovered)}</span></td>
                  <td data-tone="coral"><span aria-hidden="true">{formatResolution(row.realised)}</span><span className="sr-only">{formatValue(row.realised)}</span></td>
                  <td>{formatValue(row.open)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </>
  );
}

function ResolutionMix({
  identified,
  prevented,
  recovered,
  realised,
  currency,
  rangeLabel,
  formatValue,
  formatCompactValue,
}: {
  identified: number | null;
  prevented: number | null;
  recovered: number | null;
  realised: number | null;
  currency: string | null;
  rangeLabel: string;
  formatValue?: (value: number | null) => string;
  formatCompactValue?: (value: number | null) => string;
}) {
  const hasIdentifiedTotal = identified != null && identified > 0;
  const complete = hasIdentifiedTotal && prevented != null && recovered != null && realised != null;
  const open = complete ? Math.max(0, identified - prevented - recovered - realised) : null;
  const segments = [
    { label: 'Prevented', value: prevented, color: 'var(--uo-route-outcome-prevented)' },
    { label: 'Recovered', value: recovered, color: 'var(--uo-route-outcome-recovered)' },
    { label: 'Realised loss', value: realised, color: 'var(--uo-route-outcome-realised)' },
    { label: 'Still open', value: open, color: 'var(--uo-route-outcome-open)' },
  ];
  const circumference = 2 * Math.PI * 76;
  let offset = 0;
  const arcs = segments.map((segment) => {
    const fraction = hasIdentifiedTotal && segment.value != null ? segment.value / identified : 0;
    const length = Math.max(0, fraction * circumference - 3);
    const result = {
      ...segment,
      length,
      dash: length.toFixed(1) + ' ' + Math.max(0, circumference - length).toFixed(1),
      offset: (-offset * circumference).toFixed(1),
    };
    offset += fraction;
    return result;
  });

  return (
    <section className={styles.mixCard} data-material="ledger-sheet" aria-labelledby="resolution-mix-title">
      <header className={styles.cardHeader}>
        <div><h2 id="resolution-mix-title">Resolution mix</h2></div>
        <span className={styles.cardRange}>{rangeLabel}<ChevronDown size={10} aria-hidden="true" /></span>
      </header>
      <div className={styles.donutWrap}>
        {hasIdentifiedTotal ? (
          <>
            <svg viewBox="0 0 200 200" role="img" aria-label="Known resolution states shown against identified value; unavailable states remain unfilled">
              <circle cx="100" cy="100" r="76" className={styles.donutTrack} />
              {arcs.filter((arc) => arc.value != null && arc.length > 0).map((arc) => (
                <circle
                  key={arc.label}
                  cx="100"
                  cy="100"
                  r="76"
                  className={styles.donutArc}
                  stroke={arc.color}
                  strokeDasharray={arc.dash}
                  strokeDashoffset={arc.offset}
                />
              ))}
            </svg>
            <div className={styles.donutCenter}>
              <span>Identified</span>
              <strong>{formatCompactValue ? formatCompactValue(identified) : formatCompactMoney(identified, currency)}</strong>
            </div>
          </>
        ) : (
          <div className={styles.mixUnavailable}>
            <CircleHelp aria-hidden="true" size={20} />
            <strong>Resolution mix unavailable</strong>
            <span>Some ledger states are not verified for this scope.</span>
          </div>
        )}
      </div>
      <div className={styles.mixLegend}>
        {arcs.map((arc) => (
          <div key={arc.label}>
            <i style={{ background: arc.color }} />
            <span>{arc.label}</span>
            <b>{formatValue ? formatValue(arc.value) : formatScopedMoney(arc.value, currency)}</b>
            <small>{hasIdentifiedTotal && arc.value != null ? ((arc.value / identified) * 100).toFixed(1) + '%' : '—'}</small>
          </div>
        ))}
      </div>
      <ChartDataTable
        model={simpleChartTable(
          arcs.map((arc) => ({
            label: arc.label,
            value: formatValue ? formatValue(arc.value) : formatScopedMoney(arc.value, currency),
            detail: hasIdentifiedTotal && arc.value != null ? `${((arc.value / identified) * 100).toFixed(1)}% of identified` : 'Unavailable',
          })),
          'Resolution mix by outcome — ' + (currency ?? 'selected currency'),
        )}
      />
    </section>
  );
}

function TrustModal({
  report,
  currency,
  rangeLabel,
  onClose,
}: {
  report: IntelligenceReport;
  currency: string | null;
  rangeLabel: string;
  onClose: () => void;
}) {
  const sourceRows = report.coverage.filter((row) => row.scope === 'connected-source');
  const confidence = report.reconciliation.confidence;
  return (
    <div className={styles.overlay} role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className={styles.trustModal} role="dialog" aria-modal="true" aria-labelledby="trust-modal-title">
        <header className={styles.modalHeader}>
          <div>
            <h2 id="trust-modal-title">Can these figures be acted on?</h2>
            <p>Source coverage, freshness and reconciliation for {rangeLabel}.</p>
          </div>
          <button type="button" className={styles.iconButton} onClick={onClose} aria-label="Close trust details">
            <X aria-hidden="true" size={15} />
          </button>
        </header>
        <div className={styles.modalBody}>
          <div className={styles.trustTable} role="table" aria-label="Source trust details">
            <div className={styles.trustTableRow + ' ' + styles.trustTableHead} role="row">
              <span>Source</span><span>Coverage</span><span>Current</span><span>Stale</span><span>Last data</span><span>Issues</span>
            </div>
            {sourceRows.length > 0 ? sourceRows.map((row) => {
              const coverage = row.records > 0 ? Math.round(row.freshRecords / row.records * 100) : 0;
              return (
                <div className={styles.trustTableRow} role="row" key={row.objectType}>
                  <span><i data-state={row.records === 0 ? 'down' : row.staleRecords > 0 ? 'stale' : 'current'} />{row.objectType}</span>
                  <span>{row.records > 0 ? coverage + '%' : '—'}</span>
                  <span>{formatNumber(row.freshRecords)}</span>
                  <span data-state={row.staleRecords > 0 ? 'stale' : 'current'}>{formatNumber(row.staleRecords)}</span>
                  <span>{row.latestAt ? formatDateAbsolute(row.latestAt) : '—'}</span>
                  <span>{row.staleRecords > 0 ? 'Freshness needs review' : 'None'}</span>
                </div>
              );
            }) : (
              <div className={styles.modalEmpty}>No connected-source coverage is available.</div>
            )}
          </div>
          <div className={styles.summaryPanels}>
            <div>
              <h3>Financial validation</h3>
              <p><span>Cases in scope</span><b>{currency ? formatNumber(report.bridges.find((bridge) => bridge.currency === currency)?.caseIds.length ?? 0) : 'Unavailable'}</b></p>
              <p><span>Issues affecting confidence</span><b data-tone={confidence.issueCount > 0 ? 'amber' : 'green'}>{formatNumber(confidence.issueCount)}</b></p>
              <p><span>Excluded records</span><b>{formatNumber(confidence.excludedRecordCount)}</b></p>
            </div>
            <div>
              <h3>Reconciliation</h3>
              <p><span>Confidence state</span><b data-tone={confidence.state === 'complete' ? 'green' : confidence.state === 'qualified' ? 'amber' : 'red'}>{confidence.state === 'complete' ? 'Complete' : confidence.state === 'qualified' ? 'Qualified' : 'Unavailable'}</b></p>
              <p><span>Open exceptions</span><b>{formatNumber(confidence.issueCount)}</b></p>
              <p><span>Affected currencies</span><b>{confidence.affectedCurrencies.length > 0 ? confidence.affectedCurrencies.join(', ') : 'None'}</b></p>
            </div>
          </div>
          <p className={styles.modalDisclaimer}>Figures include only source-backed, validated records. Where a source is stale or partial, affected values are marked rather than estimated.</p>
        </div>
        <footer className={styles.modalFooter}>
          <Link className={styles.primaryButton} href="/financials/reconciliation" onClick={onClose}>Resolve exceptions</Link>
          <Link className={styles.secondaryButton} href="/sources/connected" onClick={onClose}>Source health</Link>
        </footer>
      </section>
    </div>
  );
}

function DashboardPalette({
  report,
  query,
  onQuery,
  onClose,
}: {
  report: IntelligenceReport;
  query: string;
  onQuery: (value: string) => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const items = useMemo(() => [
    { group: 'Go to', label: 'Work queue — needs action', sub: formatNumber(summarizeDashboardWork(report.operations).needsActionCount), href: '/work' },
    { group: 'Go to', label: 'Cases registry', sub: formatNumber(report.recordCount), href: '/cases' },
    { group: 'Go to', label: 'Loss ledger', sub: '', href: '/financials/losses' },
    { group: 'Go to', label: 'Recovery board', sub: '', href: '/financials/recovery' },
    { group: 'Go to', label: 'Reconciliation exceptions', sub: formatNumber(report.reconciliation.confidence.issueCount), href: '/financials/reconciliation' },
    { group: 'Source', label: 'Connected sources', sub: '', href: '/sources/connected' },
  ], [report]);
  const filtered = query.trim()
    ? items.filter((item) => (item.group + ' ' + item.label).toLowerCase().includes(query.trim().toLowerCase()))
    : items;

  function submitFirst() {
    if (filtered[0]) {
      router.push(filtered[0].href);
      onClose();
    }
  }

  return (
    <div className={styles.overlay} role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className={styles.palette} role="dialog" aria-modal="true" aria-label="Search and navigate">
        <div className={styles.paletteInput}>
          <Search aria-hidden="true" size={15} />
          <input
            autoFocus
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') onClose();
              if (event.key === 'Enter') submitFirst();
            }}
            placeholder="Search cases, customers, orders or jump to a surface"
            aria-label="Search cases, customers, orders or jump to a surface"
          />
          <kbd>esc</kbd>
        </div>
        <div className={styles.paletteResults}>
          {filtered.map((item) => (
            <button type="button" key={item.group + item.label} onClick={() => { router.push(item.href); onClose(); }}>
              <span>{item.group}</span>
              <strong>{item.label}</strong>
              <small>{item.sub}</small>
            </button>
          ))}
          {filtered.length === 0 ? <p>No match in navigation, cases, customers or orders.</p> : null}
        </div>
        <footer className={styles.paletteFooter}><span>↑↓ navigate</span><span>↵ open</span><span>⌘K close</span></footer>
      </section>
    </div>
  );
}

export function DashboardOverviewLoading() {
  return (
    <div className={styles.dashboardPilot} data-surface-id="overview" data-visual-world="evidence-operations-v1" data-state-id="overview-loading">
      <div className={styles.dashboardHeader}>
        <div><div className={styles.skeletonBreadcrumb} /><div className={styles.skeletonTitle} /></div>
        <div className={styles.skeletonControls} />
      </div>
      <div className={styles.dashboardContent}>
        <div className={styles.skeletonAttention} aria-label="Loading attention queue">
          {Array.from({ length: 3 }, (_, index) => <div key={index}><i /><b /><small /></div>)}
        </div>
        <div className={styles.kpiGrid}>
          {Array.from({ length: 5 }, (_, index) => <div className={styles.skeletonKpi} key={index}><i /><b /><small /></div>)}
        </div>
        <div className={styles.chartGrid}>
          <div className={styles.skeletonChart} />
          <div className={styles.skeletonMix}><i /><b /></div>
        </div>
      </div>
    </div>
  );
}

export function DashboardOverview({
  report,
  comparison,
  selectedCurrency,
  compare,
  userName: _userName,
  workspaceName: _workspaceName,
  permissions: _permissions,
}: DashboardOverviewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const requestedMetric = searchParams.get('metric');
  const [metric, setMetric] = useState<DashboardMetricKey>(
    DASHBOARD_METRICS.some((item) => item.key === requestedMetric)
      ? requestedMetric as DashboardMetricKey
      : 'exposure',
  );
  const [trustOpen, setTrustOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState('');

  const bridge = report.bridges.find((item) => item.currency === selectedCurrency) ?? null;
  const previousBridge = comparison?.bridges.find((item) => item.currency === selectedCurrency) ?? null;
  const previousTrend = compare === 'previous' ? comparison?.trend : null;
  const chartData = useMemo(
    () => selectedCurrency
        ? buildOverviewBuckets({
            current: report.trend,
            previous: previousTrend,
            range: report.range,
            currency: selectedCurrency,
            metric,
            asOf: report.generatedAt,
            timezone: report.timezone,
          })
        : [],
    [metric, previousTrend, report.generatedAt, report.range, report.timezone, report.trend, selectedCurrency],
  );
  const sourceFreshness = calculateSourceFreshness(report.coverage);
  const work = summarizeDashboardWork(report.operations);
  const selectedMetric = DASHBOARD_METRICS.find((item) => item.key === metric) ?? DASHBOARD_METRICS[0];
  const financialValue = bridgeValue(bridge, 'exposure');
  const financialUnavailable = selectedCurrency == null || bridge == null || financialValue == null;
  const selectedCurrencyRows = report.causes.filter((row) => row.currency === selectedCurrency);
  const leadingStaleSource = [...sourceFreshness.rows].sort((a, b) => b.staleRecords - a.staleRecords)[0] ?? null;
  const comparisonEnabled = compare === 'previous' && comparison != null;
  const activeRange: ReportRange = report.range;
  const activeCurrency = selectedCurrency;
  const rangeLabel = formatRangeLabel(report.range, chartData, report.timezone);
  const financialRecordsHref = selectedCurrency
    ? financialReportRecordsHref({
        range: report.range,
        currency: selectedCurrency,
        metric: DASHBOARD_REPORT_METRICS[metric],
        timezone: report.timezone,
      })
    : null;
  const trendValues = useMemo(() => chartData.map((point) => ({
    key: point.key,
    label: point.label,
    identified: point.identified,
    prevented: point.prevented,
    recovered: point.recovered,
    realised: point.realised,
    open: point.open,
  })), [chartData]);
  const reviewCount = work.readyCount > 0 ? work.readyCount : work.needsActionCount;
  const currentOpen = bridgeOpenValue(bridge);
  const previousOpen = bridgeOpenValue(previousBridge);
  const kpis = [
    { key: 'open', label: 'Open exposure', value: currentOpen, previous: previousOpen, goodIncrease: false, context: 'unresolved', icon: 'open' },
    { key: 'identified', label: 'Identified', value: bridgeValue(bridge, 'exposure'), previous: bridgeValue(previousBridge, 'exposure'), goodIncrease: false, context: formatNumber(report.recordCount) + ' cases', icon: 'identified' },
    { key: 'prevented', label: 'Prevented', value: bridgeValue(bridge, 'prevented'), previous: bridgeValue(previousBridge, 'prevented'), goodIncrease: true, context: bridgeValue(bridge, 'exposure') ? ((bridgeValue(bridge, 'prevented') ?? 0) / bridgeValue(bridge, 'exposure')! * 100).toFixed(1) + '% of identified' : 'Share unavailable', icon: 'prevented' },
    { key: 'recovered', label: 'Recovered', value: bridgeValue(bridge, 'recovered'), previous: bridgeValue(previousBridge, 'recovered'), goodIncrease: true, context: 'from validated records', icon: 'recovered' },
    { key: 'realised', label: 'Realised loss', value: bridgeValue(bridge, 'realisedLoss'), previous: bridgeValue(previousBridge, 'realisedLoss'), goodIncrease: false, context: 'ledger-confirmed', icon: 'realised' },
  ];
  const attentionRows = buildDashboardAttentionPriorities(report.operations, selectedCurrency).slice(0, 5);
  const causeMax = Math.max(0, ...selectedCurrencyRows.map((row) => row.amountMinor));
  const realisedLossTotal = bridgeValue(bridge, 'realisedLoss');
  const tableRows: ChartTableRow[] = trendValues.map((point) => ({
    key: point.key,
    label: point.label,
    identified: point.identified,
    prevented: point.prevented,
    recovered: point.recovered,
    realised: point.realised,
    open: point.open,
  }));

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if ((event.metaKey || event.ctrlKey) && key === 'k') {
        event.preventDefault();
        setPaletteOpen((value) => !value);
        setPaletteQuery('');
      } else if (key === 'escape') {
        setPaletteOpen(false);
        setTrustOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  function updateQuery(changes: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams.toString());
    Object.entries(changes).forEach(([key, value]) => {
      if (value == null) next.delete(key);
      else next.set(key, value);
    });
    startTransition(() => router.push(pathname + (next.toString() ? '?' + next.toString() : '')));
  }

  function setRange(range: Exclude<ReportRange, 'all'>) {
    updateQuery({ range, compare: compare === 'previous' ? 'previous' : null });
  }

  return (
    <div
      className={styles.dashboardPilot}
      data-surface-id="overview"
      data-visual-world="evidence-operations-v1"
      data-instrument-route="overview"
      data-provenance="canonical-report"
      data-state-id={financialUnavailable ? 'overview-unavailable-state' : work.activeCount === 0 ? 'overview-no-work-state' : undefined}
    >
          <header className={styles.dashboardHeader}>
            <div>
              <div className={styles.breadcrumb}><span>Unauth</span><ChevronRight size={10} aria-hidden="true" /><strong>Overview</strong></div>
              <h1>Operating position</h1>
            </div>
            <div className={styles.headerControls} aria-busy={isPending}>
              <div className={styles.rangeSwitcher} role="group" aria-label="Date range">
                {REPORT_RANGES.filter((range): range is Exclude<ReportRange, 'all'> => range !== 'all').map((range) => (
                  <button key={range} type="button" aria-pressed={activeRange === range} onClick={() => setRange(range)}>
                    {range.replace('d', '')} days
                  </button>
                ))}
              </div>
              <div className={styles.dateChip}><Calendar size={12} aria-hidden="true" /><span>{rangeLabel}</span></div>
              <button
                type="button"
                className={styles.compareButton}
                data-active={comparisonEnabled ? 'true' : undefined}
                onClick={() => updateQuery({ compare: comparisonEnabled ? 'none' : 'previous' })}
                disabled={report.range === 'all'}
              >
                vs prior {activeRange === 'all' ? 'period' : activeRange.replace('d', 'd')}
              </button>
              <ExportMenu
                range={activeRange}
                timezone={report.timezone}
                currency={activeCurrency}
                metric={DASHBOARD_REPORT_METRICS[metric]}
                triggerLabel="Export"
                reportsHref={'/reports?range=' + activeRange + '&timezone=' + encodeURIComponent(report.timezone)}
              />
              <Link href="/settings/workspace/account" className={styles.settingsButton} aria-label="Open Settings">
                <Settings size={14} aria-hidden="true" />
              </Link>
              <Link href="/work" className={styles.primaryButton}>
                {reviewCount > 0 ? 'Review ' + formatNumber(reviewCount) + ' cases' : 'Open work queue'}
                <ArrowRight size={11} aria-hidden="true" />
              </Link>
            </div>
          </header>

          <div className={styles.dashboardContent}>
        {leadingStaleSource && leadingStaleSource.staleRecords > 0 ? (
          <div className={styles.staleNotice}>
            <i />
            <span>{leadingStaleSource.objectType} data is {formatNumber(leadingStaleSource.staleRecords)} records stale</span>
            <b>·</b>
            <span>last data {leadingStaleSource.latestAt ? formatDateAbsolute(leadingStaleSource.latestAt) : 'unavailable'}</span>
            <span className={styles.noticeSpacer} />
            <Link href={leadingStaleSource.href}>Repair connection</Link>
          </div>
        ) : null}

        <section className={`${styles.surfaceCard} ${styles.attentionLead}`} data-material="ledger-sheet" aria-label="What needs attention">
          <header className={`${styles.cardHeader} ${styles.compactSectionHeader}`}>
            <div><h2 id="attention-title">Needs attention now</h2><p>{formatNumber(work.needsActionCount)} groups need action in the current scope</p></div>
            <Link href="/work">Open full work queue <ArrowRight aria-hidden="true" size={13} /></Link>
          </header>
          {attentionRows.length > 0 ? (
            <div className={styles.attentionList}>
              {attentionRows.map((operation) => {
                const status = queueTone(operation);
                const reasons = attentionReasons(operation, selectedCurrency);
                return (
                  <Link href={operation.href} key={operation.key} className={styles.attentionRow}>
                    <span>
                      <strong>{operation.label}</strong>
                      <small>
                        <span>{attentionOperationSupportCopy(operation)}</span>
                        {reasons.map((reason) => <span className={styles.attentionReason} key={reason}>{reason}</span>)}
                      </small>
                    </span>
                    <span className={styles.attentionAside}>
                      <b>{operation.selectedExposureMinor == null ? 'Unavailable' : formatMoney(operation.selectedExposureMinor, selectedCurrency ?? 'GBP')}</b>
                      <em data-tone={status.tone}>{status.label}</em>
                    </span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className={styles.queueEmpty}>
              <i><Check aria-hidden="true" size={19} /></i>
              <strong>No intervention is waiting</strong>
              <span>Every active case is inside its current workflow boundary. This is a confirmed zero for the current scope, not missing data.</span>
            </div>
          )}
        </section>

        {financialUnavailable ? (
          <section className={styles.unavailableCard} data-material="ledger-sheet" aria-labelledby="unavailable-title">
            <div>
              <span className={styles.unavailableBadge}><i />Position unavailable</span>
              <h2 id="unavailable-title">No verified financial position for this range</h2>
              <p>
                {selectedCurrency
                  ? 'The financial projection did not return a verified ' + selectedCurrency + ' exposure for this range. Affected figures are withheld rather than shown as zero.'
                  : 'No valid reporting currency is available for this range. Financial figures are withheld rather than shown as zero.'}
              </p>
              <div className={styles.unavailableActions}>
                <Link className={styles.primaryButton} href="/sources/connected">Reconnect source</Link>
                <Link className={styles.secondaryButton} href="/financials/reports/records">Inspect ledger records</Link>
                <button type="button" className={styles.secondaryButton} onClick={() => setTrustOpen(true)}>Data trust details</button>
              </div>
            </div>
            <div className={styles.stillKnown}>
              <h3>Still known</h3>
              <p><span>Open cases</span><b>{formatNumber(work.activeCount)}</b></p>
              <p><span>Awaiting decision</span><b>{formatNumber(work.readyCount)}</b></p>
              <p><span>Excluded records</span><b data-tone="red">{formatNumber(report.reconciliation.confidence.excludedRecordCount)}</b></p>
            </div>
          </section>
        ) : (
          <div className={styles.liveStack}>
            <section className={styles.financialRegion} aria-label="Payout position">
              <MetricGroup
                aria-label="Payout position"
                variant="divided"
                showIcons
                itemAttributes={() => ({ 'data-material': 'ledger-sheet' } as HTMLAttributes<HTMLDivElement>)}
                items={kpis.map((card) => {
                  const comparisonChip = comparisonEnabled ? deltaChip(card.value, card.previous, card.goodIncrease) : null;
                  const unavailable = card.value == null || !selectedCurrency;
                  return {
                    label: card.label,
                    icon: <MetricGlyph metric={card.icon} />,
                    value: unavailable
                      ? <UnavailableValue kind="unavailable" placement="metric" />
                      : formatScopedMoney(card.value, selectedCurrency),
                    description: (
                      <>
                        <span className={styles.deltaChip} data-tone={comparisonChip?.tone ?? 'neutral'}>
                          {comparisonChip ? comparisonChip.text : 'Current period'}
                        </span>
                        <small>{card.context}</small>
                      </>
                    ),
                  };
                })}
              />

              <div className={styles.chartGrid}>
                <section className={styles.chartCard} data-material="ledger-sheet" aria-labelledby="exposure-chart-title">
                  <header className={styles.cardHeader}>
                    <div>
                      <h2 id="exposure-chart-title">Exposure intake and resolution</h2>
                      <p>Daily identified cohorts and the recorded outcomes for those same cases</p>
                    </div>
                    <div className={styles.chartLegendInline}>
                      <span><i data-tone="identified" />Identified</span>
                      <span><i data-tone="prevented" />Prevented</span>
                      <span><i data-tone="recovered" />Recovered</span>
                      <span><i data-tone="realised" />Realised</span>
                    </div>
                  </header>
                  <div className={styles.legacyMetricControls} aria-label="Payout metric">
                    {DASHBOARD_METRICS.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        aria-pressed={item.key === metric}
                        onClick={() => {
                          setMetric(item.key);
                          updateQuery({ metric: item.key === 'exposure' ? null : item.key });
                        }}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                  <OverviewResolutionChart
                    data={chartData}
                    compare={comparisonEnabled}
                    currency={selectedCurrency}
                    metricLabel={selectedMetric.label}
                    metricDescription={selectedMetric.description}
                    scope={activeCurrency ? TIME_RANGE_LABELS[activeRange] + ' · ' + activeCurrency : TIME_RANGE_LABELS[activeRange]}
                    coverageNote={sourceFreshness.freshnessPercent == null
                      ? 'coverage unavailable'
                      : sourceFreshness.freshnessPercent + '% of source records current · updated ' + formatDateAbsolute(report.generatedAt)}
                    basisLabel={dashboardBucketBasisLabel(report.range)}
                    formatValue={(value) => formatScopedMoney(value, selectedCurrency)}
                    formatAxisValue={(value) => formatCompactMoney(value, selectedCurrency)}
                    tableRows={tableRows}
                    recordsHref={financialRecordsHref}
                  />
                </section>
                <ResolutionMix
                  identified={bridgeValue(bridge, 'exposure')}
                  prevented={bridgeValue(bridge, 'prevented')}
                  recovered={bridgeValue(bridge, 'recovered')}
                  realised={bridgeValue(bridge, 'realisedLoss')}
                  currency={activeCurrency}
                  rangeLabel={TIME_RANGE_LABELS[activeRange]}
                />
              </div>
              <div className="sr-only">
                <p>Only validated ledger values are shown; connected-source activity may also be incomplete.</p>
                <Link href="/work">Open work</Link>
              </div>
            </section>
          </div>
        )}

        <div className={styles.lowerGrid}>
          <span
            className="sr-only"
            aria-label={`${formatNumber(work.activeCount)} active cases, ${formatNumber(work.needsActionCount)} need action, ${formatNumber(work.readyCount)} of those are ready now`}
          >
            Work queue summary
          </span>
          <section className={styles.surfaceCard} data-material="ledger-sheet" aria-labelledby="loss-cause-title">
            <header className={`${styles.cardHeader} ${styles.causeHeader}`}>
              <h2 id="loss-cause-title">Realised loss by cause</h2>
              <b>{formatScopedMoney(realisedLossTotal, selectedCurrency)}</b>
            </header>
            <div className={styles.causeList}>
              {selectedCurrencyRows.length > 0 ? selectedCurrencyRows.slice(0, 6).map((cause) => (
                <Link href={cause.href} className={styles.causeRow} key={cause.key + cause.currency}>
                  <div>
                    <div className={styles.causeName}>
                      <span>{cause.label}</span>
                      <small>{realisedLossTotal != null && realisedLossTotal > 0 ? (cause.amountMinor / realisedLossTotal * 100).toFixed(1) + '%' : '—'}</small>
                    </div>
                    <div className={styles.causeBar}><i style={{ width: (causeMax > 0 ? cause.amountMinor / causeMax * 100 : 0) + '%' }} /></div>
                  </div>
                  <b>{formatMoney(cause.amountMinor, cause.currency)}</b>
                  <small className={styles.causeMeta}>—</small>
                </Link>
              )) : (
                <div className={styles.emptyState}><AlertTriangle aria-hidden="true" size={17} /><span>No confirmed loss causes are available for this currency and range.</span></div>
              )}
              <footer className={styles.cardLegend}>
                <span><i data-tone="realised" />Confirmed loss</span>
                <span><i data-tone="recovered" />Still recoverable<span className="sr-only"> unavailable by cause</span></span>
              </footer>
            </div>
          </section>

          <section className={styles.surfaceCard} data-material="ledger-sheet" aria-labelledby="trust-title">
            <header className={`${styles.cardHeader} ${styles.compactSectionHeader}`}>
              <h2 id="trust-title">Data trust</h2>
              <span>{sourceFreshness.freshnessPercent == null ? 'Coverage unavailable' : sourceFreshness.freshnessPercent + '% coverage'}</span>
            </header>
            <div className={styles.sourceList}>
              {report.coverage.slice(0, 6).map((row) => {
                const coverage = row.records > 0 ? Math.round(row.freshRecords / row.records * 100) : 0;
                return (
                  <Link href={row.href} className={styles.sourceRow} key={row.objectType}>
                    <i data-state={row.records === 0 ? 'down' : row.staleRecords > 0 ? 'stale' : row.scope === 'internal' ? 'manual' : 'current'} />
                    <span><strong>{row.objectType}</strong><small><i style={{ width: coverage + '%' }} /></small></span>
                    <em>{row.latestAt ? formatDay(row.latestAt, report.timezone) : '—'}</em>
                    <b>{formatNumber(row.records)}</b>
                  </Link>
                );
              })}
            </div>
            <div className={styles.trustSummary}>
              <p><span>Reconciliation confidence</span><b>{report.reconciliation.confidence.state === 'complete' ? 'Complete' : report.reconciliation.confidence.state === 'qualified' ? 'Qualified' : 'Unavailable'}</b></p>
              <p><span>Open exceptions</span><b data-tone={report.reconciliation.confidence.issueCount > 0 ? 'amber' : 'green'}>{formatNumber(report.reconciliation.confidence.issueCount)}</b></p>
              <button type="button" className={styles.secondaryButton} onClick={() => setTrustOpen(true)}>Trust details</button>
              <span className="sr-only">{sourceFreshness.freshRecords} of {sourceFreshness.totalRecords} current · {sourceFreshness.freshnessPercent ?? '—'}%</span>
              <span className="sr-only">{report.reconciliation.ok ? 'Passed' : 'Needs review'}</span>
              <span className="sr-only">{report.reconciliation.confidence.state === 'qualified' ? 'Validated values only' : ''}</span>
            </div>
          </section>
        </div>

        <section className={styles.casesCard} data-material="ledger-sheet" aria-labelledby="cases-awaiting-title">
          <header className={styles.cardHeader}>
            <div><h2 id="cases-awaiting-title">Cases awaiting merchant decision</h2><p>Evidence complete, ranked by exposure and SLA</p></div>
            <div className={styles.tableActions}>
              <Link href="/cases?workflow=ready_for_decision" className={styles.secondaryButton}><Filter size={12} aria-hidden="true" />Filters</Link>
              <Link href="/cases?workflow=ready_for_decision&sort=sla" className={styles.secondaryButton}>Sort: SLA<ChevronDown aria-hidden="true" size={12} /></Link>
            </div>
          </header>
          <div className={styles.caseTable} aria-label="Cases awaiting merchant decision">
            <div className={styles.caseTableRow + ' ' + styles.caseTableHead}>
              <span><input type="checkbox" aria-label="Select all cases" /></span><span>Case</span><span>Customer</span><span>Reason</span><span>Exposure</span><span>Evidence</span><span>SLA</span><span>Owner</span><span />
            </div>
            <div className={styles.caseUnavailable}>
              <CircleHelp aria-hidden="true" size={17} />
              <div><strong>Case detail rows are not part of this overview read model</strong><span>Open Cases to review customer, evidence and owner details without guessing at missing fields.</span></div>
              <Link href="/cases?workflow=ready_for_decision">Open Cases <ArrowRight aria-hidden="true" size={13} /></Link>
            </div>
          </div>
          <footer className={styles.tableFooter}>
            <span>{'Showing 0 of ' + formatNumber(work.readyCount) + ' · case details unavailable here'}</span>
            <div>
              <Link href="/cases?workflow=ready_for_decision&page=1" className={styles.pageButton} aria-current="page">1</Link>
            </div>
          </footer>
        </section>
          </div>

      {trustOpen ? <TrustModal report={report} currency={selectedCurrency} rangeLabel={rangeLabel} onClose={() => setTrustOpen(false)} /> : null}
      {paletteOpen ? <DashboardPalette report={report} query={paletteQuery} onQuery={setPaletteQuery} onClose={() => setPaletteOpen(false)} /> : null}
    </div>
  );
}
