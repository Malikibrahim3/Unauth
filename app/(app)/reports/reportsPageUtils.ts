import { GRADE_COLOURS, GRADE_LABELS } from '@/lib/utils/confidenceStyles';
import { formatCurrencyNullable } from '@/lib/utils/format';
import type { ConnectionState } from '@/lib/connections/getConnectionState';
import type { ClaimOpsMetrics } from '@/lib/claims/reporting';
import type { GradeBucket, GradeBucketDisplay, RatePoint, RunSummary, TxGradeRow } from '@/app/(app)/reports/reportsPageTypes';

export const GRADE_SAMPLE_LIMIT = 2000;

const GRADE_META: Record<GradeBucket, { label: string; color: string }> = {
  definite: { label: `A · ${GRADE_LABELS.definite}`, color: GRADE_COLOURS.definite },
  probable: { label: `B · ${GRADE_LABELS.probable}`, color: GRADE_COLOURS.probable },
  possible: { label: `C · ${GRADE_LABELS.possible}`, color: GRADE_COLOURS.possible },
  weak: { label: `D · ${GRADE_LABELS.weak}`, color: GRADE_COLOURS.weak },
};

/**
 * State-aware "finish setup" copy for the Live reports surface. Mirrors the
 * canonical CTA logic used on the dashboard so a data-present merchant always
 * sees existing context plus the right next step — never a dead empty gate.
 */
export function liveSetupCta(connection: ConnectionState): { title: string; body: string; label: string } | null {
  if (connection.bothConnected) return null;
  if (connection.shopifyOnlyConnected) {
    return {
      title: 'Connect your helpdesk to complete live reporting',
      body: 'Shopify order data is flowing. Add your helpdesk to layer in claim history, dispute outcomes, and SLA tracking — the metrics below stay incomplete until then.',
      label: 'Connect helpdesk',
    };
  }
  if (connection.helpdeskOnlyConnected) {
    return {
      title: 'Connect Shopify to complete live reporting',
      body: 'Claim history is flowing from your helpdesk. Add Shopify to tie claims to real orders and customer purchase context.',
      label: 'Connect Shopify',
    };
  }
  return {
    title: 'Connect Shopify and your helpdesk for live reports',
    body: 'Live reporting combines Shopify order data with helpdesk claim history. Reconnect your live sources to monitor new orders, claims, and outcomes as they happen.',
    label: 'Connect Shopify and your helpdesk',
  };
}

export function gradeFromTransaction(row: TxGradeRow): GradeBucket {
  const grade = row.identity_confidence_grade?.toLowerCase();
  if (grade === 'definite' || grade === 'probable' || grade === 'possible' || grade === 'weak') return grade;
  const status = row.match_status?.toLowerCase();
  if (status === 'definite') return 'definite';
  if (status === 'probable') return 'probable';
  if (status === 'candidate' || status === 'possible') return 'possible';
  return 'weak';
}

export function buildRatePoints(trend: RunSummary[]): { points: RatePoint[]; maxRate: number } {
  const rates = trend.map((row) => (row.total_rows > 0 ? ((row.flagged_count ?? 0) / row.total_rows) * 100 : 0));
  const maxRate = Math.max(4, ...rates);
  if (rates.length === 0) return { points: [], maxRate };
  if (rates.length === 1) {
    const y = 190 - (rates[0] / maxRate) * 150;
    return { points: [{ x: 48, y, rate: rates[0] }, { x: 472, y, rate: rates[0] }], maxRate };
  }
  return {
    points: rates.map((rate, index) => ({
      x: 34 + (index / (rates.length - 1)) * 452,
      y: 190 - (rate / maxRate) * 150,
      rate,
    })),
    maxRate,
  };
}

export function buildGradeBuckets(gradeCounts: Record<GradeBucket, number>): GradeBucketDisplay[] {
  const gradeTotal = Math.max(1, Object.values(gradeCounts).reduce((sum, count) => sum + count, 0));
  return (Object.keys(GRADE_META) as GradeBucket[]).map((key) => ({
    key,
    ...GRADE_META[key],
    count: gradeCounts[key],
    pct: (gradeCounts[key] / gradeTotal) * 100,
  }));
}

export function buildChartPaths(points: RatePoint[]): { linePath: string; areaPath: string } {
  const linePath = points.length > 0
    ? points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ')
    : '';
  const areaPath = points.length > 0
    ? `${linePath} L${points[points.length - 1].x.toFixed(1)} 198 L${points[0].x.toFixed(1)} 198 Z`
    : '';
  return { linePath, areaPath };
}

type NumericClaimMetricKey = {
  [K in keyof ClaimOpsMetrics]: ClaimOpsMetrics[K] extends number ? K : never;
}[keyof ClaimOpsMetrics];

export function delta(current: number, prior: number | null | undefined): string | null {
  if (prior == null) return null;
  if (prior === 0) return current > 0 ? 'new vs prior period' : null;
  const pct = Math.round(((current - prior) / prior) * 100);
  if (pct === 0) return null;
  return pct > 0 ? `↑ ${pct}%` : `↓ ${Math.abs(pct)}%`;
}

function deltaCurrency(current: number, prior: number | null | undefined): string | null {
  if (prior == null) return null;
  if (prior === 0) return current > 0 ? 'new exposure vs prior period' : null;
  const diff = Math.round(current - prior);
  if (diff === 0) return null;
  const amount = formatCurrencyNullable(Math.abs(diff));
  return diff > 0 ? `+${amount} vs prior` : `−${amount} vs prior`;
}

export function metricHint(
  base: string,
  current: number,
  priorMetrics: ClaimOpsMetrics | null,
  priorKey: NumericClaimMetricKey,
): string {
  const change = priorMetrics ? delta(current, priorMetrics[priorKey]) : null;
  return [base, change].filter(Boolean).join(' · ') || base;
}

export function metricHintCurrency(
  base: string,
  current: number,
  priorMetrics: ClaimOpsMetrics | null,
): string {
  const change = priorMetrics ? deltaCurrency(current, priorMetrics.valueAtRisk) : null;
  return [base, change].filter(Boolean).join(' · ') || base;
}
