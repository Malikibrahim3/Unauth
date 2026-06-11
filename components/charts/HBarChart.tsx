'use client';

import dynamic from 'next/dynamic';
import type { HBarChartProps } from './HBarChartClient';

export type { HBarEntry } from './HBarChartClient';

const HBarChartClient = dynamic(() => import('./HBarChartClient'), {
  ssr: false,
  loading: () => (
    <div
      className="w-full animate-pulse rounded-md"
      style={{ height: 180, background: 'var(--bg-subtle)' }}
      aria-hidden="true"
    />
  ),
});

export default function HBarChart(props: HBarChartProps) {
  return <HBarChartClient {...props} />;
}
