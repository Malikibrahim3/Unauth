import { formatNumber } from '@/lib/utils/format';

export interface DonutSlice {
  label: string;
  value: number;
  color?: string;
}

export interface AnalyticsDonutChartProps {
  data: DonutSlice[];
  height?: number;
  showLegend?: boolean;
  valueFormatter?: (n: number) => string;
  emptyLabel?: string;
}

const DEFAULT_PALETTE = ['var(--ua-action-primary)', 'var(--ua-severity-clear)', 'var(--ua-severity-probable)', 'var(--ua-severity-possible)', 'var(--ua-neutral)'];

/** Dependency-free replacement for the deleted echarts-based donut chart (§12). */
export function AnalyticsDonutChart({
  data,
  height = 220,
  showLegend = true,
  valueFormatter,
  emptyLabel = 'No data yet',
}: AnalyticsDonutChartProps) {
  const fmt = valueFormatter ?? ((n: number) => formatNumber(n));
  const total = data?.reduce((sum, d) => sum + d.value, 0) ?? 0;
  if (!data || data.length === 0 || total === 0) {
    return (
      <div style={{ height, display: 'grid', placeItems: 'center', color: 'var(--ua-text-tertiary)', fontSize: 12 }}>
        {emptyLabel}
      </div>
    );
  }
  const cumulative = data.reduce<number[]>((acc, d) => [...acc, (acc.at(-1) ?? 0) + d.value], []);
  const diameter = Math.min(height * 0.75, 140);
  const strokeWidth = 22;
  const radius = (diameter - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div style={{ height, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
      <div
        style={{
          width: diameter,
          height: diameter,
          flexShrink: 0,
          position: 'relative',
        }}
      >
        <svg width={diameter} height={diameter} viewBox={`0 0 ${diameter} ${diameter}`} role="img" aria-label="Distribution chart">
          <circle cx={diameter / 2} cy={diameter / 2} r={radius} fill="none" stroke="var(--ua-chart-track)" strokeWidth={strokeWidth} />
          {data.map((d, i) => {
            const valueLength = (d.value / total) * circumference;
            const offset = -((cumulative[i - 1] ?? 0) / total) * circumference;
            return (
              <circle
                key={d.label}
                cx={diameter / 2}
                cy={diameter / 2}
                r={radius}
                fill="none"
                stroke={d.color ?? DEFAULT_PALETTE[i % DEFAULT_PALETTE.length]}
                strokeWidth={strokeWidth}
                strokeDasharray={`${valueLength} ${circumference - valueLength}`}
                strokeDashoffset={offset}
                strokeLinecap="butt"
                transform={`rotate(-90 ${diameter / 2} ${diameter / 2})`}
              />
            );
          })}
        </svg>
      </div>
      {showLegend ? (
        <ul style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '4px 12px', margin: 0, padding: 0, listStyle: 'none' }}>
          {data.map((d, i) => (
            <li key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--ua-text-secondary)' }}>
              <i style={{ width: 8, height: 8, borderRadius: '50%', background: d.color ?? DEFAULT_PALETTE[i % DEFAULT_PALETTE.length] }} />
              {d.label} <span style={{ fontFamily: 'var(--ua-font-sans)', fontVariantNumeric: 'tabular-nums', color: 'var(--ua-text-tertiary)' }}>{fmt(d.value)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
