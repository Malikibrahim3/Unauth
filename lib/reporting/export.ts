import {
  FINANCIAL_REPORT_METRICS,
  financialMetricCaseIds,
  financialMetricCaseCount,
  financialMetricIsKnown,
  financialMetricValue,
  type FinancialReportMetric,
  type IntelligenceReport,
} from '@/lib/reporting/intelligence';
import { financialStageLabel } from '@/lib/ui/labels';
import { hashId } from '@/lib/ui/displayRef';
import { formatMinorCurrencyNullable } from '@/lib/utils/format';

export const REPORT_EXPORT_VERSION = 'mvp-plus-financial-v2';
export type ReportExportView = 'metrics' | 'outcomes' | 'records';
export type ReportExportScope = {
  metric?: FinancialReportMetric | null;
  category?: string | null;
};

const FINANCIAL_DEFINITIONS: Record<FinancialReportMetric, string> = {
  requested: 'Requested value recorded by the source or merchant.',
  exposed: 'Maximum exposure for the case in the selected scope.',
  approved: 'Merchant decision recorded for the case; it is not proof of payment.',
  paid: 'Observed payout confirmed by a connected source.',
  estimated_loss: 'Provisional loss value with visible assumptions.',
  prevented: 'Exposure that remained unpaid through the observation window.',
  confirmed_loss: 'Confirmed loss supported by an observed outcome.',
  recoverable: 'Eligible recovery bounded by confirmed loss and a documented route.',
  recovered: 'Recovered cash actually received or credited back to the merchant.',
  outstanding: 'Eligible recovery less recovered cash and any written-off balance.',
  written_off: 'Confirmed loss explicitly closed without recovery.',
  final_net_loss: 'Confirmed loss less recovered cash for the same case scope.',
};

const FINANCIAL_LABELS: Record<FinancialReportMetric, string> = {
  requested: financialStageLabel('requested'),
  exposed: financialStageLabel('maximum_exposure'),
  approved: financialStageLabel('merchant_decision'),
  paid: financialStageLabel('observed_payout'),
  estimated_loss: financialStageLabel('estimated_loss'),
  prevented: financialStageLabel('prevented'),
  confirmed_loss: financialStageLabel('confirmed_loss'),
  recoverable: financialStageLabel('eligible_recovery'),
  recovered: financialStageLabel('recovered_cash'),
  outstanding: financialStageLabel('outstanding_recovery'),
  written_off: financialStageLabel('written_off'),
  final_net_loss: financialStageLabel('final_net_loss'),
};

const FINANCIAL_TIME_BASIS = 'Case submitted in the selected period.';

export function buildReportExportRows(
  report: IntelligenceReport,
  view: ReportExportView,
  scope: ReportExportScope = {},
): unknown[][] {
  if (view === 'records') {
    throw new Error('Supporting records are exported by the paged report-record contract.');
  }
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
    'value',
    'record_count',
    'record_ids',
  ];

  if (view === 'outcomes') {
    return [
      header,
      ...report.causes.filter((row) => !scope.category || row.key === scope.category).map((row) => [
        REPORT_EXPORT_VERSION,
        report.generatedAt,
        report.range,
        report.timezone,
        view,
        row.label,
        'Confirmed loss grouped by canonical issue category.',
        FINANCIAL_TIME_BASIS,
        row.currency,
        true,
        formatMinorCurrencyNullable(row.amountMinor, row.currency),
        row.recordIds.length,
        row.recordIds.map((id) => hashId(id)).join(';'),
      ]),
    ];
  }

  return [
    header,
    ...report.bridges.flatMap((bridge) =>
      FINANCIAL_REPORT_METRICS.filter((metric) => !scope.metric || metric === scope.metric).map((metric) => {
        const known = financialMetricIsKnown(bridge, metric);
        const valueMinor = financialMetricValue(bridge, metric);
        const recordIds = known ? financialMetricCaseIds(bridge, metric) : [];
        return [
          REPORT_EXPORT_VERSION,
          report.generatedAt,
          report.range,
          report.timezone,
          view,
          FINANCIAL_LABELS[metric],
          FINANCIAL_DEFINITIONS[metric],
          FINANCIAL_TIME_BASIS,
          bridge.currency,
          known,
          valueMinor == null ? 'Unavailable' : formatMinorCurrencyNullable(valueMinor, bridge.currency),
          financialMetricCaseCount(bridge, metric),
          recordIds.map((id) => hashId(id)).join(';'),
        ];
      }),
    ),
  ];
}

/** One row per case/currency: group amounts must not be summed across overlaps. */
export function buildClaimPatternExportRows(
  report: import('./claimPatterns').PatternReport,
  dimension: import('./claimPatterns').PatternDimension,
  rows: import('./claimPatterns').PatternCase[],
): unknown[][] {
  return [
    ['definition','from_inclusive','to_exclusive','read_at','timezone','completeness','issues','dimension','case_id','source_order_id','submitted_at','groups','currency','known_confirmed_loss_minor','known_matched_recovery_minor','known_final_net_loss_minor','allocation','active_work_ids'],
    ...rows.flatMap(row=>(row.money.length ? row.money : [{currency:null,confirmed:null,matched:null,net:null}]).map(m=>[
      'Submitted-case cohort; current known outcomes, not period cash movements. Counts overlap. Association is not liability.',
      report.from,report.to,report.readAt,report.timezone,report.state,report.issues.join('; '),dimension,row.id,row.orderId,row.submittedAt,
      row.groups[dimension].map(g=>g.label).join('; '),m.currency,m.confirmed,m.matched,m.net,
      row.groups[dimension].length===1 && row.allocationEligible[dimension] ? 'single established group':'unallocated',row.work.map(work=>work.id).join('; '),
    ])),
  ];
}
