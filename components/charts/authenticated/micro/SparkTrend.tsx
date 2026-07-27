type SparkTrendProps = {
  values: number[];
  colourVar?: string;
  width?: number;
  height?: number;
};

/** Server SVG sparkline for MetricCard/WorkbenchKpiStrip microchart slots. */
export function SparkTrend({ values, colourVar = '--ua-chart-primary', width = 60, height = 20 }: SparkTrendProps) {
  if (values.length < 2) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const step = width / (values.length - 1);
  const points = values
    .map((value, index) => `${index * step},${height - ((value - min) / range) * height}`)
    .join(' ');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke={`var(${colourVar})`}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
