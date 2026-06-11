import { GRADE_COLOURS, GRADE_LABELS } from '@/lib/utils/confidenceStyles';
import { formatCurrencyNullable } from '@/lib/utils/format';
import type { ConnectionState } from '@/lib/connections/getConnectionState';
import type { ClaimOpsMetrics } from '@/lib/claims/reporting';
import type { ClaimRow, ClaimTypeBreakdown, GradeBucket, GradeBucketDisplay, OutcomeBreakdown, OutcomeRow, RunSummary, TxGradeRow } from '@/app/(app)/reports/reportsPageTypes';

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
      title: 'Connect your helpdesk to complete live intelligence',
      body: 'Shopify order data is flowing. Add your helpdesk to layer in claim history and dispute outcomes — claim metrics stay incomplete until then.',
      label: 'Connect helpdesk',
    };
  }
  if (connection.helpdeskOnlyConnected) {
    return {
      title: 'Connect Shopify to complete live intelligence',
      body: 'Claim history is flowing from your helpdesk. Add Shopify to tie claims to real orders and customer purchase context.',
      label: 'Connect Shopify',
    };
  }
  return {
    title: 'Connect Shopify and your helpdesk for live intelligence',
    body: 'Live analytics combines Shopify order data with helpdesk claim history. Reconnect your live sources to monitor new orders, claims, and outcomes as they happen.',
    label: 'Connect Shopify and your helpdesk',
  };
}

const CLAIM_TYPE_UI_LABELS: Record<string, string> = {
  missing_parcel: 'Missing parcel',
  inr: 'Item not received',
  damaged: 'Damaged item',
  wrong_item: 'Wrong item',
  refund_request: 'Refund request',
  chargeback: 'Chargeback',
  return_abuse: 'Return abuse',
  snad: 'Not as described',
  other: 'Other',
};

const OUTCOME_DECISION_LABELS: Record<string, string> = {
  approved: 'Approved',
  denied: 'Denied',
  partial: 'Partial refund',
  chargeback: 'Chargeback',
  withdrawn: 'Withdrawn',
  escalated: 'Escalated',
  other: 'Other',
};

export function buildClaimTypeBreakdown(claims: ClaimRow[]): ClaimTypeBreakdown {
  const map = new Map<string, { count: number; value: number }>();
  for (const claim of claims) {
    const type = claim.claim_type ?? 'other';
    const existing = map.get(type) ?? { count: 0, value: 0 };
    map.set(type, { count: existing.count + 1, value: existing.value + (claim.amount_at_risk ?? 0) });
  }
  return Array.from(map.entries())
    .map(([type, data]) => ({ type, label: CLAIM_TYPE_UI_LABELS[type] ?? type, ...data }))
    .sort((a, b) => b.count - a.count);
}

export function buildOutcomeBreakdown(outcomes: OutcomeRow[]): OutcomeBreakdown {
  const map = new Map<string, { count: number; value: number }>();
  for (const outcome of outcomes) {
    const decision = outcome.decision ?? 'other';
    const existing = map.get(decision) ?? { count: 0, value: 0 };
    map.set(decision, { count: existing.count + 1, value: existing.value + (outcome.amount_refunded ?? 0) });
  }
  return Array.from(map.entries())
    .map(([decision, data]) => ({ decision, label: OUTCOME_DECISION_LABELS[decision] ?? decision, ...data }))
    .sort((a, b) => b.count - a.count);
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

export function buildMatchRateTrend(trend: RunSummary[]): Array<{ label: string; value: number }> {
  return trend.map((run) => ({
    label: new Date(run.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    value: run.total_rows > 0 ? Math.round(((run.flagged_count ?? 0) / run.total_rows) * 1000) / 10 : 0,
  }));
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
