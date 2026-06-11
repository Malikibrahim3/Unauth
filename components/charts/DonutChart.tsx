'use client';

import dynamic from 'next/dynamic';
import type { DonutChartProps } from './DonutChartClient';

export type { DonutEntry } from './DonutChartClient';

const DonutChartClient = dynamic(() => import('./DonutChartClient'), {
  ssr: false,
  loading: () => (
    <div
      className="w-full animate-pulse rounded-md"
      style={{ height: 220, background: 'var(--bg-subtle)' }}
      aria-hidden="true"
    />
  ),
});

export default function DonutChart(props: DonutChartProps) {
  return <DonutChartClient {...props} />;
}
