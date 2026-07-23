import { buildReportExportRows, REPORT_EXPORT_VERSION } from '@/lib/reporting/export';
import { aggregateMoneyBridges, type IntelligenceReport } from '@/lib/reporting/intelligence';

function reportFixture(): IntelligenceReport {
  return {
    range: '30d',
    timezone: 'UTC',
    generatedAt: '2026-07-22T12:00:00.000Z',
    bridges: aggregateMoneyBridges([
      {
        support_payout_case_id: 'case-1',
        currency: 'GBP',
        requested_minor: 1000,
        exposed_minor: 1000,
        known_states: ['requested', 'exposed'],
      },
      {
        support_payout_case_id: 'case-2',
        currency: 'GBP',
        exposed_minor: 0,
        known_states: ['exposed'],
      },
      {
        support_payout_case_id: 'case-3',
        currency: 'GBP',
        recovered_minor: 500,
        known_states: ['recovered'],
      },
      {
        support_payout_case_id: 'case-4',
        currency: 'USD',
        exposed_minor: 900,
        known_states: ['exposed'],
      },
    ]),
    trend: [],
    causes: [
      {
        key: 'delivery_loss',
        label: 'Delivery loss',
        count: 1,
        amountMinor: 700,
        currency: 'GBP',
        href: '/reports/records?kind=case',
        recordIds: ['case-1'],
      },
    ],
    operations: [],
    recoveries: [],
    coverage: [],
    reconciliation: { ok: true, issues: [] },
    recordCount: 4,
  };
}

describe('report export reconciliation', () => {
  it('exports canonical metadata, per-state record IDs, proven zero and unknown distinctly', () => {
    const rows = buildReportExportRows(reportFixture(), 'metrics');
    const header = rows[0] as string[];
    const index = Object.fromEntries(header.map((key, position) => [key, position]));
    const metricRows = rows.slice(1) as unknown[][];
    const find = (metric: string, currency = 'GBP') =>
      metricRows.find((row) => row[index.metric_or_category] === metric && row[index.currency] === currency)!;

    expect(find('exposed')[index.value_minor]).toBe(1000);
    expect(find('exposed')[index.record_count]).toBe(2);
    expect(find('exposed')[index.record_ids]).toBe('case-1;case-2');
    expect(find('paid')[index.known]).toBe(false);
    expect(find('paid')[index.value_minor]).toBe('');
    expect(find('paid')[index.value]).toBe('unavailable');
    expect(find('recovered')[index.value_minor]).toBe(500);
    expect(find('recovered')[index.record_ids]).toBe('case-3');
    expect(find('exposed', 'USD')[index.value_minor]).toBe(900);
    expect(metricRows.every((row) => row[index.report_version] === REPORT_EXPORT_VERSION)).toBe(true);
    expect(metricRows.every((row) => row[index.generated_at] === '2026-07-22T12:00:00.000Z')).toBe(true);
    expect(metricRows.every((row) => String(row[index.definition]).length > 20)).toBe(true);
  });

  it('exports loss categories with the exact stable case IDs', () => {
    const rows = buildReportExportRows(reportFixture(), 'outcomes');
    const header = rows[0] as string[];
    const index = Object.fromEntries(header.map((key, position) => [key, position]));
    const row = rows[1];
    expect(row[index.metric_or_category]).toBe('delivery_loss');
    expect(row[index.value_minor]).toBe(700);
    expect(row[index.record_count]).toBe(1);
    expect(row[index.record_ids]).toBe('case-1');
  });
});
