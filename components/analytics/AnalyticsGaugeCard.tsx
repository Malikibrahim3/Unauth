'use client';

import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import { EChartWrapper } from '@/components/analytics/EChartWrapper';
import { readCssTokens } from '@/components/charts/echartsTheme';

export interface AnalyticsGaugeCardProps {
  label: string;
  value: number;
  max?: number;
  suffix?: string;
  hint?: string;
  color?: string;
}

function clamp(value: number, max: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(value, max));
}

export function AnalyticsGaugeCard({
  label,
  value,
  max = 100,
  suffix = '%',
  hint,
  color,
}: AnalyticsGaugeCardProps) {
  const displayValue = clamp(value, max);
  const option = useMemo((): EChartsOption => {
    const t = readCssTokens();
    const gaugeColor = color ?? t.accent;

    return {
      animation: true,
      animationDuration: 500,
      series: [
        {
          type: 'gauge',
          min: 0,
          max,
          startAngle: 205,
          endAngle: -25,
          radius: '96%',
          center: ['50%', '62%'],
          progress: {
            show: true,
            roundCap: true,
            width: 10,
            itemStyle: { color: gaugeColor },
          },
          axisLine: {
            roundCap: true,
            lineStyle: {
              width: 10,
              color: [[1, t.surface_muted]],
            },
          },
          pointer: { show: false },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { show: false },
          anchor: { show: false },
          title: { show: false },
          detail: {
            valueAnimation: true,
            offsetCenter: [0, '12%'],
            formatter: (n: number) => `${Math.round(n)}${suffix}`,
            color: t.ink_primary,
            fontSize: 30,
            fontWeight: 600,
            fontFamily: 'var(--font-display)',
          },
          data: [{ value: displayValue }],
        },
      ],
    };
  }, [color, displayValue, max, suffix]);

  return (
    <div
      className="min-w-0 rounded-lg border px-4 pb-3 pt-3"
      style={{
        background: 'var(--surface)',
        borderColor: 'var(--border)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="t-caption font-semibold" style={{ color: 'var(--text-secondary)' }}>{label}</p>
          {hint ? <p className="t-caption mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{hint}</p> : null}
        </div>
        <span
          className="mt-0.5 h-2 w-2 shrink-0 rounded-full"
          style={{ background: color ?? 'var(--accent)' }}
          aria-hidden="true"
        />
      </div>
      <EChartWrapper option={option} height={132} />
    </div>
  );
}
