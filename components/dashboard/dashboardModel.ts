import type {
  CoverageRow,
  DashboardOperationRow,
  FinancialConfidence,
  IntelligenceReport,
  MoneyBridge,
  ReportRange,
  ReportTrendPoint,
} from '@/lib/reporting/intelligence';
import { financialMetricValue } from '@/lib/reporting/intelligence';
import {
  isCanonicalFinalClaimStatus,
  normalizeLegacyClaimStatus,
} from '@/lib/claims/statusMachine';
import { formatDateAbsolute, formatNumber } from '@/lib/utils/format';

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
  tone: 'primary' | 'positive' | 'secondary' | 'negative';
}> = [
  {
    key: 'exposure',
    label: 'Payout exposure',
    description: 'Known current exposure in this period',
    colourVar: '--ua-chart-primary',
    tone: 'primary',
  },
  {
    key: 'recovered',
    label: 'Recovered',
    description: 'Received and reconciled',
    colourVar: '--ua-success',
    tone: 'positive',
  },
  {
    key: 'prevented',
    label: 'Prevented',
    description: 'Not paid after review',
    colourVar: '--ua-chart-primary-soft',
    tone: 'secondary',
  },
  {
    key: 'realisedLoss',
    label: 'Realised loss',
    description: 'Ledger-confirmed merchant loss',
    colourVar: '--ua-critical',
    tone: 'negative',
  },
];

export type DashboardChartBucket = {
  key: string;
  label: string;
  currentMinor: number | null;
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

function metricValue(point: ReportTrendPoint, metric: DashboardMetricKey): number | null {
  const state = metric === 'exposure'
    ? 'exposed'
    : metric === 'realisedLoss'
      ? 'confirmed_loss'
      : metric;
  if (!point.knownStates.includes(state)) return null;
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
  if (metric === 'exposure') return financialMetricValue(bridge, 'exposed');
  if (metric === 'recovered') return financialMetricValue(bridge, 'recovered');
  if (metric === 'prevented') return financialMetricValue(bridge, 'prevented');
  return financialMetricValue(bridge, 'confirmed_loss');
}

function monthLabel(key: string): string {
  const date = new Date(`${key}-01T00:00:00.000Z`);
  return formatDateAbsolute(date).replace(/^\d+\s+/, '');
}

function dayLabel(timestamp: number): string {
  return formatDateAbsolute(new Date(timestamp)).replace(/\s+\d{4}$/, '');
}

function bucketLabel(startTimestamp: number, bucketDays: number, endTimestamp: number): string {
  const bucketEnd = Math.min(
    endTimestamp,
    startTimestamp + (bucketDays - 1) * DAY_MS,
  );
  if (bucketEnd === startTimestamp) return dayLabel(startTimestamp);

  const start = new Date(startTimestamp);
  const end = new Date(bucketEnd);
  if (
    start.getUTCMonth() === end.getUTCMonth()
    && start.getUTCFullYear() === end.getUTCFullYear()
  ) {
    return `${start.getUTCDate()}–${dayLabel(bucketEnd)}`;
  }
  return `${dayLabel(startTimestamp)}–${dayLabel(bucketEnd)}`;
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
    const months = new Map<string, number | null>();
    for (const point of current) {
      const key = point.date.slice(0, 7);
      const value = metricValue(point, input.metric);
      if (!months.has(key)) months.set(key, null);
      if (value != null) months.set(key, (months.get(key) ?? 0) + value);
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
  const bucketDays = input.range === '90d' ? 7 : input.range === '30d' ? 3 : 1;
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
        label: bucketLabel(timestamp, bucketDays, endDay),
        currentMinor: null,
        previousMinor: null,
      };
    },
  );

  function add(points: ReportTrendPoint[], start: number, field: 'currentMinor' | 'previousMinor') {
    for (const point of points) {
      const index = Math.floor((utcDay(point.date) - start) / (bucketDays * DAY_MS));
      if (index < 0 || index >= buckets.length) continue;
      const value = metricValue(point, input.metric);
      if (value == null) continue;
      if (field === 'currentMinor') {
        buckets[index].currentMinor = (buckets[index].currentMinor ?? 0) + value;
      } else {
        buckets[index].previousMinor = (buckets[index].previousMinor ?? 0) + value;
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

export function dashboardBucketBasisLabel(range: ReportRange): string {
  if (range === '7d') return 'Daily intervals';
  if (range === '30d') return '3-day intervals';
  if (range === '90d') return 'Weekly intervals';
  return 'Monthly intervals';
}

export type WorkflowGroup = {
  key: 'needs-action' | 'waiting' | 'in-progress' | 'completed';
  label: string;
  count: number;
  tone: 'attention' | 'primary' | 'positive' | 'neutral';
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

function normalizedOperationStatus(key: string): string {
  return normalizeLegacyClaimStatus(key) ?? key;
}

function operationActiveCount(operation: DashboardOperationRow): number {
  return operation.activeCount;
}

export function workflowOperationIsCompleted(key: string): boolean {
  const normalized = normalizeLegacyClaimStatus(key);
  return normalized != null && isCanonicalFinalClaimStatus(normalized);
}

export function activeWorkflowOperations(
  operations: IntelligenceReport['operations'],
): IntelligenceReport['operations'] {
  return operations.filter((operation) => operationActiveCount(operation) > 0);
}

export function groupWorkflowOperations(
  operations: IntelligenceReport['operations'],
): WorkflowGroup[] {
  const groups: WorkflowGroup[] = [
    { key: 'needs-action', label: 'Needs action', count: 0, tone: 'attention', rows: [] },
    { key: 'waiting', label: 'Waiting', count: 0, tone: 'neutral', rows: [] },
    { key: 'in-progress', label: 'In progress', count: 0, tone: 'primary', rows: [] },
    { key: 'completed', label: 'Completed', count: 0, tone: 'positive', rows: [] },
  ];
  for (const operation of operations) {
    const normalized = normalizedOperationStatus(operation.key);
    const index = workflowOperationIsCompleted(operation.key)
      ? 3
      : WAITING_STATUSES.has(normalized)
        ? 1
        : IN_PROGRESS_STATUSES.has(normalized)
          ? 2
          : 0;
    groups[index].count += index === 3
      ? operation.count
      : operationActiveCount(operation);
    groups[index].rows.push(operation);
  }
  return groups;
}

export type DashboardWorkSummary = {
  activeCount: number;
  needsActionCount: number;
  waitingCount: number;
  inProgressCount: number;
  readyCount: number;
};

export function summarizeDashboardWork(
  operations: IntelligenceReport['operations'],
): DashboardWorkSummary {
  const groups = groupWorkflowOperations(operations);
  const needsActionCount = groups.find((group) => group.key === 'needs-action')?.count ?? 0;
  const waitingCount = groups.find((group) => group.key === 'waiting')?.count ?? 0;
  const inProgressCount = groups.find((group) => group.key === 'in-progress')?.count ?? 0;
  const readyCount = activeWorkflowOperations(operations)
    .reduce((sum, operation) => sum + operation.readyCount, 0);
  return {
    activeCount: needsActionCount + waitingCount + inProgressCount,
    needsActionCount,
    waitingCount,
    inProgressCount,
    readyCount,
  };
}

export type DashboardSourceFreshness = {
  totalRecords: number;
  freshRecords: number;
  staleRecords: number;
  freshnessPercent: number | null;
  state: 'current' | 'stale' | 'unavailable';
  label: string;
  rows: CoverageRow[];
};

export function calculateSourceFreshness(
  coverage: CoverageRow[],
): DashboardSourceFreshness {
  const rows = coverage.filter((row) => row.scope === 'connected-source');
  const totalRecords = rows.reduce((sum, row) => sum + row.records, 0);
  const freshRecords = rows.reduce((sum, row) => sum + row.freshRecords, 0);
  const staleRecords = rows.reduce((sum, row) => sum + row.staleRecords, 0);
  const freshnessPercent = totalRecords > 0 ? Math.round((freshRecords / totalRecords) * 100) : null;
  const state = freshnessPercent == null
    ? 'unavailable'
    : staleRecords > 0 || freshnessPercent < 100
      ? 'stale'
      : 'current';
  const label = state === 'unavailable'
    ? 'Source freshness unavailable'
    : state === 'current'
      ? 'Sources are current'
      : 'Source records need attention';
  return { totalRecords, freshRecords, staleRecords, freshnessPercent, state, label, rows };
}

export type DashboardDecisionSafety = {
  state: 'complete' | 'qualified' | 'unavailable';
  label: string;
  detail: string;
};

export function calculateDecisionSafety(input: {
  hasFinancialValue: boolean;
  confidence: FinancialConfidence;
  sourceFreshness: DashboardSourceFreshness;
}): DashboardDecisionSafety {
  if (!input.hasFinancialValue || input.confidence.state === 'unavailable') {
    return {
      state: 'unavailable',
      label: 'Financial scope unavailable',
      detail: 'No verified financial value is available in this scope.',
    };
  }
  const sourceIncomplete = input.sourceFreshness.staleRecords > 0
    || input.sourceFreshness.freshnessPercent == null;
  if (input.confidence.state === 'qualified') {
    return {
      state: 'qualified',
      label: 'Validated values only',
      detail: sourceIncomplete
        ? 'Only validated ledger values are shown; connected-source activity may also be incomplete.'
        : 'Only validated ledger values are shown; review affected scope before acting.',
    };
  }
  if (sourceIncomplete) {
    return {
      state: 'qualified',
      label: 'Financial values only',
      detail: input.sourceFreshness.staleRecords > 0
        ? `Displayed totals reconcile. Check ${formatNumber(input.sourceFreshness.staleRecords)} stale source ${input.sourceFreshness.staleRecords === 1 ? 'record' : 'records'} before using activity counts or timing.`
        : 'Displayed totals reconcile. Connected-source activity and timing are not verified.',
    };
  }
  return {
    state: 'complete',
    label: 'Decision scope complete',
    detail: 'Displayed financial totals reconcile and connected sources are current.',
  };
}

export function buildDashboardOperatingStatement(input: {
  work: DashboardWorkSummary;
  sourceFreshness: DashboardSourceFreshness;
  confidence: FinancialConfidence;
  hasFinancialValue: boolean;
}): string {
  if (!input.hasFinancialValue || input.confidence.state === 'unavailable') {
    return input.work.activeCount > 0
      ? 'Case work is available; the financial position cannot be verified yet.'
      : 'No merchant decisions are waiting; the financial position cannot be verified yet.';
  }
  const workStatement = input.work.readyCount > 0
    ? `${input.work.readyCount} ${input.work.readyCount === 1 ? 'case is' : 'cases are'} ready for decision`
    : input.work.needsActionCount > 0
      ? `${input.work.needsActionCount} ${input.work.needsActionCount === 1 ? 'case needs' : 'cases need'} merchant action`
      : 'No merchant decisions are waiting';
  const trustStatement = input.confidence.state === 'qualified'
    ? 'displayed financial values are qualified'
    : input.sourceFreshness.staleRecords > 0
      ? 'connected source data needs attention'
      : 'displayed financial values reconcile';
  return `${workStatement}; ${trustStatement}.`;
}

export type DashboardAttentionPriority = DashboardOperationRow & {
  priority: number;
  rankingMode: 'composite' | 'volume';
  selectedExposureMinor: number | null;
  unvaluedCaseCount: number;
  supportCopy: string;
};

function countLabel(count: number, singular: string, plural = `${singular}s`): string {
  return `${formatNumber(count)} ${count === 1 ? singular : plural}`;
}

export function attentionOperationSupportCopy(operation: DashboardOperationRow): string {
  const count = operationActiveCount(operation);
  const status = normalizedOperationStatus(operation.key);
  if (status === 'ready_for_decision' || status === 'open') {
    return `${countLabel(count, 'case')} can be decided now`;
  }
  if (status === 'new') {
    return `${countLabel(count, 'case')} ${count === 1 ? 'needs' : 'need'} first review`;
  }
  if (status === 'evidence_needed') {
    return `${countLabel(count, 'case')} ${count === 1 ? 'needs' : 'need'} evidence collected`;
  }
  if (status === 'awaiting_customer_evidence') {
    return `${countLabel(count, 'case')} waiting on customer evidence`;
  }
  if (status === 'awaiting_carrier_response') {
    return `${countLabel(count, 'case')} waiting on a carrier`;
  }
  if (status === 'awaiting_3pl_response') {
    return `${countLabel(count, 'case')} waiting on a fulfilment partner`;
  }
  if (status === 'awaiting_supplier_response') {
    return `${countLabel(count, 'case')} waiting on a supplier`;
  }
  if (status === 'pending') return `${countLabel(count, 'case')} waiting on source data`;
  if (status === 'manual_review' || status === 'escalated') {
    return `${countLabel(count, 'case')} ${count === 1 ? 'needs' : 'need'} merchant review`;
  }
  if (status === 'decision_recorded') {
    return `${countLabel(count, 'decision')} being carried through`;
  }
  if (status === 'recovery_opened') {
    return `${countLabel(count, 'recovery', 'recoveries')} being followed through`;
  }
  return `${countLabel(count, 'active case')}`;
}

export function buildDashboardAttentionPriorities(
  operations: IntelligenceReport['operations'],
  selectedCurrency: string | null,
): DashboardAttentionPriority[] {
  const active = activeWorkflowOperations(operations);
  if (active.length === 0) return [];
  const prepared = active.map((operation) => {
    const exposure = selectedCurrency
      ? operation.exposureByCurrency.find((item) => item.currency === selectedCurrency) ?? null
      : null;
    return {
      operation,
      deadlineRaw: operation.overdueCount * 2 + operation.approachingCount,
      readinessRaw: operation.readyCount,
      valueRaw: exposure?.knownMinor ?? null,
      unvaluedCaseCount: selectedCurrency
        ? Math.max(0, operationActiveCount(operation) - (exposure?.knownCaseCount ?? 0))
        : operationActiveCount(operation),
    };
  });
  const maxDeadline = Math.max(0, ...prepared.map((item) => item.deadlineRaw));
  const maxReadiness = Math.max(0, ...prepared.map((item) => item.readinessRaw));
  const maxValue = Math.max(0, ...prepared.map((item) => item.valueRaw ?? 0));
  const activeWeights = [
    maxDeadline > 0 ? { key: 'deadline' as const, weight: 50 } : null,
    maxReadiness > 0 ? { key: 'readiness' as const, weight: 30 } : null,
    maxValue > 0 ? { key: 'value' as const, weight: 20 } : null,
  ].filter((item): item is NonNullable<typeof item> => item != null);
  const weightTotal = activeWeights.reduce((sum, item) => sum + item.weight, 0);
  const maxCount = Math.max(1, ...prepared.map((item) => operationActiveCount(item.operation)));
  const rankingMode = weightTotal > 0 ? 'composite' : 'volume';
  return prepared
    .map((item): DashboardAttentionPriority => {
      const components = {
        deadline: maxDeadline > 0 ? item.deadlineRaw / maxDeadline : 0,
        readiness: maxReadiness > 0 ? item.readinessRaw / maxReadiness : 0,
        value: maxValue > 0 ? (item.valueRaw ?? 0) / maxValue : 0,
      };
      const priority = rankingMode === 'composite'
        ? activeWeights.reduce(
            (sum, component) => sum + components[component.key] * component.weight,
            0,
          ) / weightTotal * 100
        : operationActiveCount(item.operation) / maxCount * 100;
      return {
        ...item.operation,
        priority,
        rankingMode,
        selectedExposureMinor: item.valueRaw,
        unvaluedCaseCount: item.unvaluedCaseCount,
        supportCopy: attentionOperationSupportCopy(item.operation),
      };
    })
    .sort((a, b) => (
      b.priority - a.priority
      || b.overdueCount - a.overdueCount
      || b.readyCount - a.readyCount
      || (Date.parse(a.oldestOpenedAt ?? '') || Number.MAX_SAFE_INTEGER)
        - (Date.parse(b.oldestOpenedAt ?? '') || Number.MAX_SAFE_INTEGER)
      || operationActiveCount(b) - operationActiveCount(a)
      || a.key.localeCompare(b.key)
    ));
}
