'use client';

import dynamic from 'next/dynamic';
import type { EChartsOption } from 'echarts';

const ReactECharts = dynamic(() => import('echarts-for-react'), {
  ssr: false,
  loading: () => (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: 12 }}>
      Loading…
    </div>
  ),
});

export interface EChartWrapperProps {
  option: EChartsOption | null;
  height?: number;
  className?: string;
  notMerge?: boolean;
}

/** Thin ECharts wrapper. SVG renderer, subtle animations, ssr:false. */
export function EChartWrapper({ option, height = 220, className, notMerge }: EChartWrapperProps) {
  if (!option) {
    return (
      <div
        className={className}
        style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: 12 }}
      >
        Loading…
      </div>
    );
  }

  return (
    <div style={{ height }} className={className}>
      <ReactECharts
        option={option}
        notMerge={notMerge ?? true}
        style={{ height, width: '100%' }}
        opts={{ renderer: 'svg' }}
      />
    </div>
  );
}
