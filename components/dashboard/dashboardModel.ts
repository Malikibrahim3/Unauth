import type {
  CoverageRow,
  IntelligenceReport,
  MoneyBridge,
  ReportRange,
  ReportTrendPoint,
} from '@/lib/reporting/intelligence';
import { formatDateAbsolute } from '@/lib/utils/format';

export type DashboardMetricKey =
  | 'exposure'
  | 'recovered'
  | 'prevented'
  | 'realisedLoss';

export const DASHBOARD_METRICS: Array<{
  key: DashboardMetricKey;
  label: string;
  description: string;
  /** Bare --ua-chart-* custom property name, resolved via useChartTheme for Recharts. */
  colourVar: string;
  tone: 'orange' | 'green' | 'blue' | 'red';
}> = [
  {
    key: 'exposure',
    label: 'Payout exposure',
    description: 'Requested in this period',
    colourVar: '--ua-chart-orange',
    tone: 'orange',
  },
  {
    key: 'recovered',
    label: 'Recovered',
    description: 'Received and reconciled',
    colourVar: '--ua-chart-green',
    tone: 'green',
  },
  {
    key: 'prevented',
    label: 'Prevented',
    description: 'Not paid after review',
    colourVar: '--ua-chart-blue',
    tone: 'blue',
  },
  {
    key: 'realisedLoss',
    label: 'Realised loss',
    description: 'Ledger-confirmed merchant loss',
    colourVar: '--ua-chart-red',
    tone: 'red',
  },
];

export type DashboardChartBucket = {
  key: string;
  label: string;
  currentMinor: number;
  previousMinor: number | null;
};

const DAY_MS = 86_400_000;
const RANGE_DAYS: Record<Exclude<ReportRange, 'all'>, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

function utcDay(value: Date | string): number {
  const date = new Date(value);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function metricValue(point: ReportTrendPoint, metric: DashboardMetricKey): number {
  if (metric === 'exposure') return point.exposureMinor;
  if (metric === 'recovered') return point.recoveredMinor;
  if (metric === 'prevented') return point.preventedMinor;
  return point.realisedLossMinor;
}

export function bridgeMetricValue(
  bridge: MoneyBridge | null | undefined,
  metric: DashboardMetricKey,
): number | null {
  if (!bridge) return null;
  if (metric === 'exposure') return bridge.requestedMinor;
  if (metric === 'recovered') return bridge.recoveredMinor;
  if (metric === 'prevented') return bridge.preventedMinor;
  return bridge.realisedLossMinor;
}

function monthLabel(key: string): string {
  const date = new Date(`${key}-01T00:00:00.000Z`);
  return formatDateAbsolute(date).replace(/^\d+\s+/, '');
}

function dayLabel(timestamp: number): string {
  return formatDateAbsolute(new Date(timestamp)).replace(/\s+\d{4}$/, '');
}

export function buildDashboardChartBuckets(input: {
  current: ReportTrendPoint[];
  previous?: ReportTrendPoint[] | null;
  range: ReportRange;
  currency: string;
  metric: DashboardMetricKey;
  asOf: Date | string;
}): DashboardChartBucket[] {
  const current = input.current.filter((point) => point.currency === input.currency);
  const previous = (input.previous ?? []).filter((point) => point.currency === input.currency);

  if (input.range === 'all') {
    const months = new Map<string, number>();
    for (const point of current) {
      const key = point.date.slice(0, 7);
      months.set(key, (months.get(key) ?? 0) + metricValue(point, input.metric));
    }
    return [...months.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, currentMinor]) => ({
        key,
        label: monthLabel(key),
        currentMinor,
        previousMinor: null,
      }));
  }

  const durationDays = RANGE_DAYS[input.range];
  const bucketDays = input.range === '90d' ? 7 : 1;
  const bucketCount = Math.ceil(durationDays / bucketDays);
  const endDay = utcDay(input.asOf);
  const currentStart = endDay - (durationDays - 1) * DAY_MS;
  const previousStart = currentStart - durationDays * DAY_MS;
  const buckets: DashboardChartBucket[] = Array.from(
    { length: bucketCount },
    (_, index) => {
      const timestamp = currentStart + index * bucketDays * DAY_MS;
      return {
        key: new Date(timestamp).toISOString().slice(0, 10),
        label: dayLabel(timestamp),
        currentMinor: 0,
        previousMinor: input.previous ? 0 : null,
      };
    },
  );

  function add(points: ReportTrendPoint[], start: number, field: 'currentMinor' | 'previousMinor') {
    for (const point of points) {
      const index = Math.floor((utcDay(point.date) - start) / (bucketDays * DAY_MS));
      if (index < 0 || index >= buckets.length) continue;
      if (field === 'currentMinor') {
        buckets[index].currentMinor += metricValue(point, input.metric);
      } else {
        buckets[index].previousMinor = (buckets[index].previousMinor ?? 0) + metricValue(point, input.metric);
      }
    }
  }

  add(current, currentStart, 'currentMinor');
  if (input.previous) add(previous, previousStart, 'previousMinor');
  return buckets;
}

export function comparisonLabel(current: number | null, previous: number | null): string {
  if (current == null || previous == null) return 'Comparison unavailable';
  if (previous === 0) return current === 0 ? 'No change vs previous period' : 'New activity vs previous period';
  const delta = ((current - previous) / previous) * 100;
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta.toFixed(1)}% vs previous period`;
}

export type WorkflowGroup = {
  key: 'needs-action' | 'waiting' | 'in-progress' | 'completed';
  label: string;
  count: number;
  tone: 'orange' | 'yellow' | 'blue' | 'green';
  rows: IntelligenceReport['operations'];
};

const WAITING_STATUSES = new Set([
  'awaiting_customer_evidence',
  'awaiting_carrier_response',
  'awaiting_3pl_response',
  'awaiting_supplier_response',
  'pending',
]);
const IN_PROGRESS_STATUSES = new Set(['decision_recorded', 'recovery_opened']);
const COMPLETED_STATUSES = new Set([
  'closed',
  'resolved',
  'resolved_refunded',
  'resolved_won',
  'resolved_lost',
  'resolved_denied',
  'resolved_exchanged',
  'voided',
]);

export function groupWorkflowOperations(
  operations: IntelligenceReport['operations'],
): WorkflowGroup[] {
  const groups: WorkflowGroup[] = [
    { key: 'needs-action', label: 'Needs action', count: 0, tone: 'orange', rows: [] },
    { key: 'waiting', label: 'Waiting', count: 0, tone: 'yellow', rows: [] },
    { key: 'in-progress', label: 'In progress', count: 0, tone: 'blue', rows: [] },
    { key: 'completed', label: 'Completed', count: 0, tone: 'green', rows: [] },
  ];
  for (const operation of operations) {
    const index = COMPLETED_STATUSES.has(operation.key)
      ? 3
      : WAITING_STATUSES.has(operation.key)
        ? 1
        : IN_PROGRESS_STATUSES.has(operation.key)
          ? 2
          : 0;
    groups[index].count += operation.count;
    groups[index].rows.push(operation);
  }
  return groups;
}

export type DashboardDataHealth = {
  totalRecords: number;
  freshRecords: number;
  staleRecords: number;
  freshnessPercent: number | null;
  label: string;
};

export function calculateDataHealth(
  coverage: CoverageRow[],
  reconciliationOk: boolean,
): DashboardDataHealth {
  const totalRecords = coverage.reduce((sum, row) => sum + row.records, 0);
  const freshRecords = coverage.reduce((sum, row) => sum + row.freshRecords, 0);
  const staleRecords = coverage.reduce((sum, row) => sum + row.staleRecords, 0);
  const freshnessPercent = totalRecords > 0 ? Math.round((freshRecords / totalRecords) * 100) : null;
  const label = freshnessPercent == null
    ? 'Not enough source data'
    : !reconciliationOk
      ? 'Ledger review required'
      : freshnessPercent >= 90
        ? 'Sources are current'
        : freshnessPercent >= 70
          ? 'Some sources need attention'
          : 'Source freshness needs attention';
  return { totalRecords, freshRecords, staleRecords, freshnessPercent, label };
}
