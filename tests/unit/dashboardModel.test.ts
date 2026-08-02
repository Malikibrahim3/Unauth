import {
  activeWorkflowOperations,
  bridgeMetricValue,
  buildDashboardAttentionPriorities,
  buildDashboardChartBuckets,
  calculateDecisionSafety,
  calculateSourceFreshness,
  comparisonLabel,
  dashboardBucketBasisLabel,
  groupWorkflowOperations,
  summarizeDashboardWork,
} from '@/components/dashboard/dashboardModel';
import type {
  DashboardOperationRow,
  FinancialConfidence,
  MoneyBridge,
  ReportTrendPoint,
} from '@/lib/reporting/intelligence';

const bridge: MoneyBridge = {
  currency: 'GBP',
  requestedMinor: 10000,
  exposedMinor: 8000,
  approvedMinor: 0,
  paidMinor: 0,
  estimatedLossMinor: 0,
  preventedMinor: 2500,
  realisedLossMinor: 1750,
  recoverableMinor: 0,
  recoveredMinor: 3200,
  outstandingMinor: 0,
  writtenOffMinor: 0,
  finalNetLossMinor: 0,
  knownStates: ['confirmed_loss', 'exposed', 'prevented', 'recovered'],
  caseIds: ['case-1'],
};

const trend = (date: string, values: Partial<ReportTrendPoint> = {}): ReportTrendPoint => ({
  date,
  currency: 'GBP',
  exposureMinor: 0,
  recoveredMinor: 0,
  preventedMinor: 0,
  realisedLossMinor: 0,
  knownStates: ['confirmed_loss', 'exposed', 'prevented', 'recovered'],
  ...values,
});

const operation = (
  key: string,
  count: number,
  values: Partial<DashboardOperationRow> = {},
): DashboardOperationRow => ({
  key,
  label: key,
  count,
  activeCount: count,
  snoozedCount: 0,
  href: `/${key}`,
  overdueCount: 0,
  approachingCount: 0,
  readyCount: key === 'open' || key === 'ready_for_decision' ? count : 0,
  oldestOpenedAt: '2026-07-10T12:00:00.000Z',
  exposureByCurrency: [],
  ...values,
});

const completeConfidence: FinancialConfidence = {
  state: 'complete',
  issueCount: 0,
  affectedCurrencies: [],
  affectedMetrics: [],
  excludedRecordCount: 0,
};

describe('dashboard model', () => {
  it('reads all four canonical bridge metrics', () => {
    expect(bridgeMetricValue(bridge, 'exposure')).toBe(8000);
    expect(bridgeMetricValue(bridge, 'recovered')).toBe(3200);
    expect(bridgeMetricValue(bridge, 'prevented')).toBe(2500);
    expect(bridgeMetricValue(bridge, 'realisedLoss')).toBe(1750);
  });

  it('preserves unknown as unavailable instead of converting it to zero', () => {
    expect(bridgeMetricValue({ ...bridge, knownStates: ['exposed'] }, 'recovered')).toBeNull();
    expect(bridgeMetricValue({ ...bridge, knownStates: ['exposed'] }, 'prevented')).toBeNull();
    expect(bridgeMetricValue({ ...bridge, knownStates: ['exposed'] }, 'realisedLoss')).toBeNull();
    expect(bridgeMetricValue({ ...bridge, recoveredMinor: 0 }, 'recovered')).toBe(0);
  });

  it('aligns current and previous daily buckets without mixing currencies', () => {
    const buckets = buildDashboardChartBuckets({
      current: [
        trend('2026-07-15', { exposureMinor: 1200 }),
        { ...trend('2026-07-15', { exposureMinor: 9000 }), currency: 'USD' },
      ],
      previous: [trend('2026-07-08', { exposureMinor: 700 })],
      range: '7d',
      currency: 'GBP',
      metric: 'exposure',
      asOf: '2026-07-16T12:00:00.000Z',
    });
    expect(buckets).toHaveLength(7);
    expect(buckets[5]).toMatchObject({ currentMinor: 1200, previousMinor: 700 });
    expect(buckets.reduce((sum, row) => sum + (row.currentMinor ?? 0), 0)).toBe(1200);
  });

  it('keeps an unknown trend amount unavailable while preserving a proven zero', () => {
    const unknown = buildDashboardChartBuckets({
      current: [trend('2026-07-15', { recoveredMinor: 900, knownStates: ['exposed'] })],
      range: '7d',
      currency: 'GBP',
      metric: 'recovered',
      asOf: '2026-07-16T12:00:00.000Z',
    });
    expect(unknown[5].currentMinor).toBeNull();
    expect(unknown.every((row) => row.currentMinor == null)).toBe(true);

    const provenZero = buildDashboardChartBuckets({
      current: [trend('2026-07-15', { recoveredMinor: 0, knownStates: ['recovered'] })],
      range: '7d',
      currency: 'GBP',
      metric: 'recovered',
      asOf: '2026-07-16T12:00:00.000Z',
    });
    expect(provenZero[5].currentMinor).toBe(0);
  });

  it('uses weekly buckets for 90 days and monthly buckets for all time', () => {
    expect(buildDashboardChartBuckets({
      current: [],
      range: '90d',
      currency: 'GBP',
      metric: 'recovered',
      asOf: '2026-07-16T12:00:00.000Z',
    })).toHaveLength(13);
    expect(buildDashboardChartBuckets({
      current: [
        trend('2026-05-10', { preventedMinor: 100 }),
        trend('2026-05-21', { preventedMinor: 250 }),
        trend('2026-06-01', { preventedMinor: 500 }),
      ],
      range: 'all',
      currency: 'GBP',
      metric: 'prevented',
      asOf: '2026-07-16T12:00:00.000Z',
    }).map((row) => row.currentMinor)).toEqual([350, 500]);
  });

  it('uses deterministic three-day buckets for a readable 30-day position', () => {
    const buckets = buildDashboardChartBuckets({
      current: [
        trend('2026-07-01', { exposureMinor: 100 }),
        trend('2026-07-03', { exposureMinor: 250 }),
        trend('2026-07-30', { exposureMinor: 500 }),
      ],
      range: '30d',
      currency: 'GBP',
      metric: 'exposure',
      asOf: '2026-07-30T12:00:00.000Z',
    });

    expect(buckets).toHaveLength(10);
    expect(buckets[0]).toMatchObject({ label: '1–3 Jul', currentMinor: 350 });
    expect(buckets[9]).toMatchObject({ label: '28–30 Jul', currentMinor: 500 });
    expect(buckets.reduce((sum, row) => sum + (row.currentMinor ?? 0), 0)).toBe(850);
  });

  it('formats comparison states without inventing a percentage', () => {
    expect(comparisonLabel(100, 50)).toBe('+100.0% vs previous period');
    expect(comparisonLabel(100, 0)).toBe('New activity vs previous period');
    expect(comparisonLabel(null, 50)).toBe('Comparison unavailable');
  });

  it('names every deterministic chart bucket basis', () => {
    expect(dashboardBucketBasisLabel('7d')).toBe('Daily intervals');
    expect(dashboardBucketBasisLabel('30d')).toBe('3-day intervals');
    expect(dashboardBucketBasisLabel('90d')).toBe('Weekly intervals');
    expect(dashboardBucketBasisLabel('all')).toBe('Monthly intervals');
  });

  it('groups canonical workflow states and exposes the active/action/ready contract', () => {
    const operations = [
      operation('open', 3),
      operation('evidence_needed', 2),
      operation('awaiting_customer_evidence', 2),
      operation('recovery_opened', 4),
      operation('resolved_won', 5, { activeCount: 0 }),
      operation('closed', 6, { activeCount: 0 }),
    ];
    const groups = groupWorkflowOperations(operations);
    expect(groups.map((group) => group.count)).toEqual([5, 2, 4, 11]);
    expect(activeWorkflowOperations(operations).map((operation) => operation.key))
      .toEqual(['open', 'evidence_needed', 'awaiting_customer_evidence', 'recovery_opened']);
    expect(summarizeDashboardWork(operations)).toEqual({
      activeCount: 11,
      needsActionCount: 5,
      waitingCount: 2,
      inProgressCount: 4,
      readyCount: 3,
    });
  });

  it('calculates connected-source freshness without letting the internal case index skew it', () => {
    const freshness = calculateSourceFreshness([
      { objectType: 'Orders', scope: 'connected-source', records: 80, freshRecords: 70, staleRecords: 10, latestAt: null, href: '/orders' },
      { objectType: 'Tickets', scope: 'connected-source', records: 20, freshRecords: 20, staleRecords: 0, latestAt: null, href: '/tickets' },
      { objectType: 'Cases', scope: 'internal', records: 900, freshRecords: 0, staleRecords: 900, latestAt: null, href: '/claims' },
    ]);
    expect(freshness).toMatchObject({
      totalRecords: 100,
      freshRecords: 90,
      staleRecords: 10,
      freshnessPercent: 90,
      state: 'stale',
      label: 'Source records need attention',
    });
    expect(calculateSourceFreshness([])).toMatchObject({
      freshnessPercent: null,
      state: 'unavailable',
      label: 'Source freshness unavailable',
    });
    expect(calculateSourceFreshness([
      { objectType: 'Orders', scope: 'connected-source', records: 10, freshRecords: 10, staleRecords: 0, latestAt: null, href: '/orders' },
    ])).toMatchObject({
      freshnessPercent: 100,
      state: 'current',
      label: 'Sources are current',
    });
  });

  it('separates decision-safe scope from source freshness and ledger validation', () => {
    const stale = calculateSourceFreshness([
      { objectType: 'Orders', scope: 'connected-source', records: 10, freshRecords: 2, staleRecords: 8, latestAt: null, href: '/orders' },
    ]);
    expect(calculateDecisionSafety({
      hasFinancialValue: true,
      confidence: completeConfidence,
      sourceFreshness: stale,
    })).toMatchObject({
      state: 'qualified',
      label: 'Financial values only',
    });
    expect(calculateDecisionSafety({
      hasFinancialValue: true,
      confidence: { ...completeConfidence, state: 'qualified', issueCount: 1 },
      sourceFreshness: calculateSourceFreshness([
        { objectType: 'Orders', scope: 'connected-source', records: 10, freshRecords: 10, staleRecords: 0, latestAt: null, href: '/orders' },
      ]),
    })).toMatchObject({
      state: 'qualified',
      label: 'Validated values only',
    });
    expect(calculateDecisionSafety({
      hasFinancialValue: false,
      confidence: completeConfidence,
      sourceFreshness: stale,
    }).state).toBe('unavailable');
  });

  it('ranks attention by the transparent SLA, readiness, and selected-currency model', () => {
    const priorities = buildDashboardAttentionPriorities([
      operation('ready_for_decision', 3, {
        readyCount: 3,
        exposureByCurrency: [{
          currency: 'GBP',
          knownMinor: 3000,
          knownCaseCount: 3,
          unvaluedCaseCount: 0,
        }],
      }),
      operation('manual_review', 5, {
        overdueCount: 2,
        exposureByCurrency: [{
          currency: 'GBP',
          knownMinor: 5000,
          knownCaseCount: 4,
          unvaluedCaseCount: 1,
        }],
      }),
      operation('awaiting_carrier_response', 9),
    ], 'GBP');

    expect(priorities.map((item) => item.key)).toEqual([
      'manual_review',
      'ready_for_decision',
      'awaiting_carrier_response',
    ]);
    expect(priorities[0]).toMatchObject({
      rankingMode: 'composite',
      selectedExposureMinor: 5000,
      unvaluedCaseCount: 1,
    });
    expect(priorities[1].priority).toBeGreaterThan(priorities[2].priority);
  });

  it('falls back to active volume when no priority signal is known', () => {
    const priorities = buildDashboardAttentionPriorities([
      operation('pending', 2),
      operation('awaiting_carrier_response', 7),
    ], 'GBP');
    expect(priorities.map((item) => item.key)).toEqual([
      'awaiting_carrier_response',
      'pending',
    ]);
    expect(priorities.every((item) => item.rankingMode === 'volume')).toBe(true);
  });
});
