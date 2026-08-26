export type AuthChartTone = 'attention' | 'primary' | 'positive' | 'negative' | 'secondary' | 'neutral';

export type AuthChartDatum = {
  label: string;
  value: number;
  displayValue?: string;
  tone?: AuthChartTone;
  detail?: string;
  /** Optional deep link for this mark. Server prepares it; the chart never constructs one. */
  href?: string;
};

export type AuthChartTableRow = {
  label: string;
  value: string;
  detail?: string;
  href?: string;
};

/**
 * §18.3 — the bounded chart-tone union. Replaces the 41 free-string
 * `data-tone` values with exactly 18 named roles across the outcome,
 * analytical and cause axes. Workflow, urgency, trust and source-health
 * values do not appear here — they belong to `StatusBadge`'s axis model,
 * never a chart legend.
 */
export type ChartTone =
  | 'outcome-prevented'
  | 'outcome-recovered'
  | 'outcome-realised'
  | 'outcome-open'
  | 'outcome-identified'
  | 'analytical-actual'
  | 'analytical-secondary'
  | 'analytical-comparison'
  | 'analytical-forecast'
  | 'analytical-reference'
  | 'analytical-selected'
  | 'analytical-remainder'
  | 'cause-1'
  | 'cause-2'
  | 'cause-3'
  | 'cause-4'
  | 'cause-5'
  | 'cause-other';

/** Comparison, forecast and reference must differ by line style, not colour alone (§18.4). */
export type ChartMarkPattern = 'solid' | 'dashed' | 'dotted';

export function finiteNonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function percentage(value: number, total: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) return 0;
  return Math.max(0, Math.min(100, (value / total) * 100));
}
