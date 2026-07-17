export type AuthChartTone = 'orange' | 'blue' | 'green' | 'yellow' | 'red' | 'neutral';

export type AuthChartDatum = {
  label: string;
  value: number;
  displayValue?: string;
  tone?: AuthChartTone;
  detail?: string;
};

export type AuthChartTableRow = {
  label: string;
  value: string;
  detail?: string;
};

export function finiteNonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function percentage(value: number, total: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) return 0;
  return Math.max(0, Math.min(100, (value / total) * 100));
}
