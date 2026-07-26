export interface LineDataPoint {
  label: string;
  value: number;
}

export interface AnalyticsLineChartProps {
  data: LineDataPoint[];
  height?: number;
  color?: string;
  valueFormatter?: (n: number) => string;
  seriesName?: string;
  area?: boolean;
  emptyLabel?: string;
}

/** Dependency-free replacement for the deleted echarts-based line chart (§12). */
export function AnalyticsLineChart({
  data,
  height = 200,
  color = 'var(--ua-action-primary)',
  valueFormatter,
  emptyLabel = 'No data yet',
}: AnalyticsLineChartProps) {
  const fmt = valueFormatter ?? ((n: number) => String(n));
  if (!data || data.length === 0) {
    return (
      <div style={{ height, display: 'grid', placeItems: 'center', color: 'var(--ua-text-tertiary)', fontSize: 12 }}>
        {emptyLabel}
      </div>
    );
  }
  const width = 100;
  const max = Math.max(1, ...data.map((d) => d.value));
  const min = Math.min(0, ...data.map((d) => d.value));
  const range = max - min || 1;
  const points = data.map((d, i) => {
    const x = data.length > 1 ? (i / (data.length - 1)) * width : width / 2;
    const y = 100 - ((d.value - min) / range) * 100;
    return { x, y, d };
  });
  const linePath = points.map((p) => `${p.x},${p.y}`).join(' ');
  const areaPath = `0,100 ${linePath} ${width},100`;

  return (
    <div style={{ height }}>
      <svg viewBox={`0 0 ${width} 100`} preserveAspectRatio="none" style={{ width: '100%', height: '85%' }}>
        <polygon points={areaPath} fill={color} opacity={0.12} />
        <polyline points={linePath} fill="none" stroke={color} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
        {points.map((p) => (
          <circle key={p.d.label} cx={p.x} cy={p.y} r={1.2} fill={color} />
        ))}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--ua-text-tertiary)', marginTop: 4 }}>
        <span>{data[0].label}</span>
        <span style={{ fontFamily: 'var(--ua-font-sans)', fontVariantNumeric: 'tabular-nums', color: 'var(--ua-text-secondary)' }}>{fmt(data[data.length - 1].value)}</span>
        <span>{data[data.length - 1].label}</span>
      </div>
    </div>
  );
}
