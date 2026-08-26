import {
  buildEvidenceGapRows,
  buildFinancialWaterfall,
  buildMetricSeries,
  buildSlaPressureRows,
  coverageState,
  formatNamedReportReference,
  NAMED_REPORT_CONTRACTS,
} from '@/lib/reporting/namedReportContracts';
import type { IntelligenceReport, MoneyBridge } from '@/lib/reporting/intelligence';

const bridge: MoneyBridge = {
  currency: 'GBP',
  requestedMinor: 20_000,
  exposedMinor: 12_000,
  approvedMinor: 8_000,
  paidMinor: 8_000,
  estimatedLossMinor: 8_000,
  preventedMinor: 4_000,
  realisedLossMinor: 8_000,
  recoverableMinor: 6_000,
  recoveredMinor: 3_000,
  outstandingMinor: 3_000,
  writtenOffMinor: 0,
  finalNetLossMinor: 5_000,
  knownStates: ['requested', 'exposed', 'approved', 'paid', 'estimated_loss', 'prevented', 'confirmed_loss', 'recoverable', 'recovered', 'written_off'],
  caseIds: ['case-1'],
};

const report: IntelligenceReport = {
  range: '30d',
  timezone: 'UTC',
  generatedAt: '2026-08-08T12:00:00.000Z',
  bridges: [bridge],
  trend: [
    { date: '2026-08-01', exposureMinor: 5_000, recoveredMinor: 1_000, preventedMinor: 1_500, realisedLossMinor: 2_000, currency: 'GBP', knownStates: ['exposed', 'recovered', 'prevented', 'confirmed_loss'] },
    { date: '2026-08-02', exposureMinor: 7_000, recoveredMinor: 2_000, preventedMinor: 2_500, realisedLossMinor: 6_000, currency: 'GBP', knownStates: ['exposed', 'recovered', 'prevented', 'confirmed_loss'] },
  ],
  causes: [],
  operations: [
    { key: 'awaiting_customer_evidence', label: 'Awaiting customer evidence', count: 7, activeCount: 6, snoozedCount: 1, href: '/cases?status=awaiting_customer_evidence', overdueCount: 2, approachingCount: 1, readyCount: 0, oldestOpenedAt: '2026-08-01T00:00:00.000Z', exposureByCurrency: [{ currency: 'GBP', knownMinor: 4_500, knownCaseCount: 5, unvaluedCaseCount: 1 }] },
    { key: 'ready_for_decision', label: 'Ready for decision', count: 3, activeCount: 3, snoozedCount: 0, href: '/cases?status=ready_for_decision', overdueCount: 0, approachingCount: 1, readyCount: 3, oldestOpenedAt: '2026-08-05T00:00:00.000Z', exposureByCurrency: [] },
  ],
  recoveries: [],
  coverage: [{ objectType: 'Orders', scope: 'connected-source', records: 10, freshRecords: 7, staleRecords: 3, latestAt: '2026-08-08T11:00:00.000Z', href: '/orders' }],
  reconciliation: { ok: true, issues: [], confidence: { state: 'complete', issueCount: 0, affectedCurrencies: [], affectedMetrics: [], excludedRecordCount: 0 } },
  recordCount: 10,
};

describe('named report contracts', () => {
  it('publishes eight distinct primary questions and chart identities', () => {
    const contracts = Object.values(NAMED_REPORT_CONTRACTS);
    expect(contracts).toHaveLength(8);
    expect(new Set(contracts.map((contract) => contract.question)).size).toBe(8);
    expect(new Set(contracts.map((contract) => contract.chartKind)).size).toBe(8);
  });

  it('keeps every named-report route key complete and recognizable', () => {
    const ids = Object.keys(NAMED_REPORT_CONTRACTS) as Array<keyof typeof NAMED_REPORT_CONTRACTS>;
    const references = ids.map(formatNamedReportReference);

    expect(references).toEqual(ids.map((id) => `named-report/${id}`));
    expect(new Set(references).size).toBe(8);
  });

  it('only marks the confirmed-loss waterfall reconciled when the arithmetic is exact', () => {
    expect(buildFinancialWaterfall(bridge)).toMatchObject({ reconciled: true });
    expect(buildFinancialWaterfall({ ...bridge, finalNetLossMinor: 5_001 })).toMatchObject({ reconciled: false });
    expect(buildFinancialWaterfall({ ...bridge, knownStates: bridge.knownStates.filter((state) => state !== 'recovered') })).toMatchObject({ reconciled: false });
  });

  it('keeps interval values separate from the cumulative total', () => {
    expect(buildMetricSeries(report, 'GBP', 'preventedMinor')).toEqual([
      { key: '2026-08-01', label: '2026-08-01', intervalMinor: 1_500, cumulativeMinor: 1_500 },
      { key: '2026-08-02', label: '2026-08-02', intervalMinor: 2_500, cumulativeMinor: 4_000 },
    ]);
  });

  it('derives current SLA pressure without treating snoozed work as healthy', () => {
    expect(buildSlaPressureRows(report)[0]).toMatchObject({
      key: 'awaiting_customer_evidence',
      healthy: 3,
      dueSoon: 1,
      overdue: 2,
      total: 6,
    });
  });

  it('limits evidence analysis to evidence-waiting states and keeps count and value distinct', () => {
    expect(buildEvidenceGapRows(report, 'count', null)).toEqual([
      expect.objectContaining({ key: 'awaiting_customer_evidence', value: 6, count: 6 }),
    ]);
    expect(buildEvidenceGapRows(report, 'amount', 'GBP')).toEqual([
      expect.objectContaining({ key: 'awaiting_customer_evidence', value: 4_500, amountMinor: 4_500 }),
    ]);
  });

  it('labels partial and missing source projections without averaging them', () => {
    expect(coverageState(report.coverage[0])).toBe('partial');
    expect(coverageState({ ...report.coverage[0], records: 0, freshRecords: 0, staleRecords: 0 })).toBe('missing');
  });
});
