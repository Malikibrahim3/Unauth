'use client';

import dynamic from 'next/dynamic';
import type { WeeklyTrendChartProps } from './WeeklyTrendChartClient';

export type { TrendDataPoint } from './WeeklyTrendChartClient';

const WeeklyTrendChartClient = dynamic(() => import('./WeeklyTrendChartClient'), {
  ssr: false,
  loading: () => (
    <div
      className="w-full animate-pulse rounded-md"
      style={{ height: 140, background: 'var(--bg-subtle)' }}
      aria-hidden="true"
    />
  ),
});

export default function WeeklyTrendChart(props: WeeklyTrendChartProps) {
  return <WeeklyTrendChartClient {...props} />;
}
