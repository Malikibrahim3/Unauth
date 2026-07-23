import {
  FINANCIAL_REPORT_METRICS,
  financialMetricCaseIds,
  financialMetricIsKnown,
  financialMetricValue,
  type FinancialReportMetric,
  type IntelligenceReport,
} from '@/lib/reporting/intelligence';

export const REPORT_EXPORT_VERSION = 'mvp-plus-financial-v1';
export type ReportExportView = 'metrics' | 'outcomes';

const FINANCIAL_DEFINITIONS: Record<FinancialReportMetric, string> = {
  requested: 'Reliable value of the customer-requested remedy; unknown values are excluded.',
  exposed: 'Current maximum payout exposure from explicit components.',
  approved: 'Value the merchant authorized; approval is not proof of payment.',
  paid: 'Value confirmed as actually provided to the customer.',
  estimated_loss: 'Provisional expected economic loss using visible assumptions.',
  prevented: 'Exposure that remained unpaid through the applicable observation window.',
  confirmed_loss: 'Realised merchant loss supported by an actual payout or loss event.',
  recoverable: 'Confirmed-loss value eligible or credibly expected to be pursued.',
  recovered: 'Value actually received or credited back to the merchant.',
  outstanding: 'Maximum of recoverable minus recovered minus recovery write-off, within one currency.',
  written_off: 'Pursued value explicitly closed without recovery; it remains net loss.',
  final_net_loss: 'Per-case maximum of confirmed loss minus recovered value, within one currency.',
};

const FINANCIAL_TIME_BASIS = 'Payout case submitted in the selected period.';

export function buildReportExportRows(
  report: IntelligenceReport,
  view: ReportExportView,
): unknown[][] {
  const header = [
    'report_version',
    'generated_at',
    'range',
    'timezone',
    'view',
    'metric_or_category',
    'definition',
    'time_basis',
    'currency',
    'known',
    'value_minor',
    'value',
    'record_count',
    'record_ids',
  ];

  if (view === 'outcomes') {
    return [
      header,
      ...report.causes.map((row) => [
        REPORT_EXPORT_VERSION,
        report.generatedAt,
        report.range,
        report.timezone,
        view,
        row.key,
        'Confirmed loss grouped by canonical issue category.',
        FINANCIAL_TIME_BASIS,
        row.currency,
        true,
        row.amountMinor,
        (row.amountMinor / 100).toFixed(2),
        row.recordIds.length,
        row.recordIds.join(';'),
      ]),
    ];
  }

  return [
    header,
    ...report.bridges.flatMap((bridge) =>
      FINANCIAL_REPORT_METRICS.map((metric) => {
        const known = financialMetricIsKnown(bridge, metric);
        const valueMinor = financialMetricValue(bridge, metric);
        const recordIds = known ? financialMetricCaseIds(bridge, metric) : [];
        return [
          REPORT_EXPORT_VERSION,
          report.generatedAt,
          report.range,
          report.timezone,
          view,
          metric,
          FINANCIAL_DEFINITIONS[metric],
          FINANCIAL_TIME_BASIS,
          bridge.currency,
          known,
          valueMinor ?? '',
          valueMinor == null ? 'unavailable' : (valueMinor / 100).toFixed(2),
          recordIds.length,
          recordIds.join(';'),
        ];
      }),
    ),
  ];
}
