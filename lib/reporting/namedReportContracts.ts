import {
  financialMetricValue,
  type IntelligenceReport,
  type MoneyBridge,
} from '@/lib/reporting/intelligence';

export const NAMED_REPORT_CONTRACTS = {
  financial: {
    question: 'How did confirmed loss become final net loss?',
    chartKind: 'financial-stage-waterfall',
  },
  'loss-causes': {
    question: 'Which loss causes dominate, and when are they landing?',
    chartKind: 'loss-cause-contribution',
  },
  prevention: {
    question: 'How much observed exposure remained unpaid through the policy window?',
    chartKind: 'prevention-interval-cumulative',
  },
  recovery: {
    question: 'How much recoverable value converts, and where is it now?',
    chartKind: 'recovery-stage-balance',
  },
  policy: {
    question: 'Where do policy recommendations and merchant decisions diverge?',
    chartKind: 'policy-decision-composition',
  },
  operations: {
    question: 'Where is SLA pressure building?',
    chartKind: 'operations-sla-pressure',
  },
  evidence: {
    question: 'Which missing evidence blocks the most work or value?',
    chartKind: 'evidence-gap-contribution',
  },
  coverage: {
    question: 'Which source-object projections are current, stale, partial, or missing?',
    chartKind: 'source-object-status-matrix',
  },
} as const;

export type NamedReportId = keyof typeof NAMED_REPORT_CONTRACTS;
export type NamedReportMeasure = 'amount' | 'count';

export function formatNamedReportReference(id: NamedReportId): string {
  return `named-report/${id}`;
}

export function isNamedReportId(value: string): value is NamedReportId {
  return value in NAMED_REPORT_CONTRACTS;
}

export type IntervalCumulativePoint = {
  key: string;
  label: string;
  intervalMinor: number;
  cumulativeMinor: number;
};

export function buildFinancialWaterfall(bridge: MoneyBridge) {
  const confirmed = financialMetricValue(bridge, 'confirmed_loss');
  const recovered = financialMetricValue(bridge, 'recovered');
  const net = financialMetricValue(bridge, 'final_net_loss');
  return {
    reconciled: confirmed != null && recovered != null && net != null && Math.max(0, confirmed - recovered) === net,
    steps: [
      { key: 'confirmed-loss', label: 'Confirmed loss', valueMinor: confirmed, direction: 'total' as const },
      { key: 'recovered', label: 'Recovered cash', valueMinor: recovered, direction: 'subtract' as const },
      { key: 'final-net-loss', label: 'Final net loss', valueMinor: net, direction: 'total' as const },
    ],
  };
}

export function buildMetricSeries(
  report: IntelligenceReport,
  currency: string,
  metric: 'preventedMinor' | 'realisedLossMinor',
): IntervalCumulativePoint[] {
  let cumulativeMinor = 0;
  return report.trend
    .filter((point) => point.currency === currency)
    .sort((left, right) => left.date.localeCompare(right.date))
    .map((point) => {
      const intervalMinor = point[metric];
      cumulativeMinor += intervalMinor;
      return {
        key: point.date,
        label: point.date,
        intervalMinor,
        cumulativeMinor,
      };
    });
}

export type SlaPressureRow = {
  key: string;
  label: string;
  healthy: number;
  dueSoon: number;
  overdue: number;
  total: number;
  href: string;
};

export function buildSlaPressureRows(report: IntelligenceReport): SlaPressureRow[] {
  return report.operations
    .filter((row) => row.activeCount > 0)
    .map((row) => ({
      key: row.key,
      label: row.label,
      healthy: Math.max(0, row.activeCount - row.approachingCount - row.overdueCount),
      dueSoon: row.approachingCount,
      overdue: row.overdueCount,
      total: row.activeCount,
      href: row.href,
    }))
    .sort((left, right) => right.overdue - left.overdue || right.dueSoon - left.dueSoon || right.total - left.total);
}

const EVIDENCE_STATE_PATTERN = /(evidence|awaiting_(carrier|3pl|supplier|customer)|investigation)/i;

export function buildEvidenceGapRows(
  report: IntelligenceReport,
  measure: NamedReportMeasure,
  currency: string | null,
) {
  return report.operations
    .filter((row) => EVIDENCE_STATE_PATTERN.test(row.key))
    .map((row) => {
      const exposure = currency
        ? row.exposureByCurrency.find((entry) => entry.currency === currency)?.knownMinor ?? 0
        : 0;
      return {
        key: row.key,
        label: row.label,
        value: measure === 'amount' ? exposure : row.activeCount,
        count: row.activeCount,
        amountMinor: exposure,
        href: row.href,
      };
    })
    .sort((left, right) => right.value - left.value || right.count - left.count);
}

export function coverageState(row: IntelligenceReport['coverage'][number]) {
  if (row.records === 0) return 'missing' as const;
  if (row.freshRecords === row.records) return 'current' as const;
  if (row.freshRecords > 0) return 'partial' as const;
  return 'stale' as const;
}
