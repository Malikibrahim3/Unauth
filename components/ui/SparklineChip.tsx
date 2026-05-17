'use client';

interface SparklineChipProps {
  data: number[];
  tone?: 'negative' | 'positive' | 'neutral';
}

const TONE_STROKE = {
  negative: '#7B2D26',
  positive: '#2A6634',
  neutral: '#1A1814',
} as const;

export function SparklineChip({ data, tone = 'neutral' }: SparklineChipProps) {
  if (!data.length) return null;

  const width = 60;
  const height = 16;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = data.length === 1 ? width / 2 : (index / (data.length - 1)) * (width - 2) + 1;
    const y = height - 2 - ((value - min) / range) * (height - 4);
    return `${x},${y}`;
  }).join(' ');

  const [lastX, lastY] = points.split(' ').slice(-1)[0].split(',').map(Number);

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <polyline
        fill="none"
        stroke={TONE_STROKE[tone]}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      <circle cx={lastX} cy={lastY} r="2.25" fill={TONE_STROKE[tone]} />
    </svg>
  );
}
