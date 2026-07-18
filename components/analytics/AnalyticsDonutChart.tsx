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

const DEFAULT_PALETTE = ['var(--accent)', 'var(--sev-clear)', 'var(--sev-probable)', 'var(--sev-neutral)', 'var(--neutral)'];

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
      <div style={{ height, display: 'grid', placeItems: 'center', color: 'var(--text-tertiary)', fontSize: 12 }}>
        {emptyLabel}
      </div>
    );
  }
  const cumulative = data.reduce<number[]>((acc, d) => [...acc, (acc.at(-1) ?? 0) + d.value], []);
  const stops = data.map((d, i) => {
    const start = ((cumulative[i - 1] ?? 0) / total) * 360;
    const end = (cumulative[i] / total) * 360;
    const colour = d.color ?? DEFAULT_PALETTE[i % DEFAULT_PALETTE.length];
    return `${colour} ${start}deg ${end}deg`;
  });

  return (
    <div style={{ height, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
      <div
        style={{
          width: Math.min(height * 0.75, 140),
          height: Math.min(height * 0.75, 140),
          borderRadius: '50%',
          background: `conic-gradient(${stops.join(', ')})`,
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: '24%',
            borderRadius: '50%',
            background: 'var(--surface)',
          }}
        />
      </div>
      {showLegend ? (
        <ul style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '4px 12px', margin: 0, padding: 0, listStyle: 'none' }}>
          {data.map((d, i) => (
            <li key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-secondary)' }}>
              <i style={{ width: 8, height: 8, borderRadius: '50%', background: d.color ?? DEFAULT_PALETTE[i % DEFAULT_PALETTE.length] }} />
              {d.label} <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>{fmt(d.value)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
