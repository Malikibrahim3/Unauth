import { formatNumber } from '@/lib/utils/format';

export interface BarEntry {
  label: string;
  value: number;
  color?: string;
}

export interface AnalyticsBarChartProps {
  data: BarEntry[];
  height?: number;
  defaultColor?: string;
  valueFormatter?: (n: number) => string;
  emptyLabel?: string;
}

/** Dependency-free replacement for the deleted echarts-based bar chart (§12). */
export function AnalyticsBarChart({
  data,
  height = 180,
  defaultColor = 'var(--ua-action-primary)',
  valueFormatter,
  emptyLabel = 'No data yet',
}: AnalyticsBarChartProps) {
  const fmt = valueFormatter ?? ((n: number) => formatNumber(n));
  if (!data || data.length === 0) {
    return (
      <div style={{ height, display: 'grid', placeItems: 'center', color: 'var(--ua-text-tertiary)', fontSize: 12 }}>
        {emptyLabel}
      </div>
    );
  }
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div style={{ height, display: 'flex', alignItems: 'flex-end', gap: 10, padding: '8px 0' }}>
      {data.map((d) => (
        <div key={d.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: 6 }}>
          <span style={{ fontSize: 10, fontFamily: 'var(--ua-font-sans)', fontVariantNumeric: 'tabular-nums', color: 'var(--ua-text-secondary)' }}>{fmt(d.value)}</span>
          <div
            style={{
              width: '70%',
              maxWidth: 32,
              height: `${Math.max(2, (d.value / max) * 100)}%`,
              background: d.color ?? defaultColor,
              borderTopLeftRadius: 'var(--ua-radius-xs)',
              borderTopRightRadius: 'var(--ua-radius-xs)',
            }}
          />
          <span style={{ fontSize: 10, color: 'var(--ua-text-tertiary)', textAlign: 'center' }}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}
