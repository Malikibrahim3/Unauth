import {
  bridgeMetricValue,
  buildDashboardChartBuckets,
  calculateDataHealth,
  comparisonLabel,
  groupWorkflowOperations,
} from '@/components/dashboard/dashboardModel';
import type { MoneyBridge, ReportTrendPoint } from '@/lib/reporting/intelligence';

const bridge: MoneyBridge = {
  currency: 'GBP',
  requestedMinor: 10000,
  paidMinor: 0,
  preventedMinor: 2500,
  realisedLossMinor: 1750,
  recoverableMinor: 0,
  recoveredMinor: 3200,
  outstandingMinor: 0,
  writtenOffMinor: 0,
  caseIds: ['case-1'],
};

const trend = (date: string, values: Partial<ReportTrendPoint> = {}): ReportTrendPoint => ({
  date,
  currency: 'GBP',
  exposureMinor: 0,
  recoveredMinor: 0,
  preventedMinor: 0,
  realisedLossMinor: 0,
  ...values,
});

describe('dashboard model', () => {
  it('reads all four canonical bridge metrics', () => {
    expect(bridgeMetricValue(bridge, 'exposure')).toBe(10000);
    expect(bridgeMetricValue(bridge, 'recovered')).toBe(3200);
    expect(bridgeMetricValue(bridge, 'prevented')).toBe(2500);
    expect(bridgeMetricValue(bridge, 'realisedLoss')).toBe(1750);
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
    expect(buckets.reduce((sum, row) => sum + row.currentMinor, 0)).toBe(1200);
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

  it('formats comparison states without inventing a percentage', () => {
    expect(comparisonLabel(100, 50)).toBe('+100.0% vs previous period');
    expect(comparisonLabel(100, 0)).toBe('New activity vs previous period');
    expect(comparisonLabel(null, 50)).toBe('Comparison unavailable');
  });

  it('groups canonical workflow states and keeps totals intact', () => {
    const groups = groupWorkflowOperations([
      { key: 'open', label: 'Open', count: 3, href: '/open' },
      { key: 'awaiting_customer_evidence', label: 'Waiting', count: 2, href: '/waiting' },
      { key: 'recovery_opened', label: 'Recovery opened', count: 4, href: '/recovery' },
      { key: 'resolved_won', label: 'Won', count: 5, href: '/won' },
    ]);
    expect(groups.map((group) => group.count)).toEqual([3, 2, 4, 5]);
  });

  it('calculates freshness and preserves an unavailable no-data state', () => {
    expect(calculateDataHealth([
      { objectType: 'Orders', records: 80, freshRecords: 70, staleRecords: 10, latestAt: null, href: '/orders' },
      { objectType: 'Tickets', records: 20, freshRecords: 20, staleRecords: 0, latestAt: null, href: '/tickets' },
    ], true)).toMatchObject({ totalRecords: 100, freshRecords: 90, staleRecords: 10, freshnessPercent: 90 });
    expect(calculateDataHealth([], true)).toMatchObject({ freshnessPercent: null, label: 'Not enough source data' });
    expect(calculateDataHealth([], false).freshnessPercent).toBeNull();
  });
});
