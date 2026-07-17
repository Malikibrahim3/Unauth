'use client';

import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import { EChartWrapper } from './EChartWrapper';
import { readCssTokens, baseAxisLabel, baseSplitLine, baseTooltip } from '@/components/charts/echartsTheme';
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

export function AnalyticsBarChart({
  data,
  height = 180,
  defaultColor,
  valueFormatter,
  emptyLabel = 'No data yet',
}: AnalyticsBarChartProps) {
  const option = useMemo((): EChartsOption => {
    const t = readCssTokens();
    const c = defaultColor ?? t.data_neutral;
    const fmt = valueFormatter ?? ((n: number) => formatNumber(n));

    if (!data || data.length === 0) {
      return {
        graphic: [{ type: 'text', left: 'center', top: 'middle', style: { text: emptyLabel, fill: t.ink_tertiary, fontSize: 12, fontFamily: 'inherit' } }],
        xAxis: { show: false },
        yAxis: { show: false },
        series: [],
      };
    }

    return {
      animation: true,
      animationDuration: 520,
      animationDurationUpdate: 320,
      animationEasing: 'cubicOut',
      animationEasingUpdate: 'cubicOut',
      grid: { left: 0, right: 8, top: 8, bottom: 0, containLabel: true },
      tooltip: {
        ...baseTooltip(t),
        trigger: 'item' as const,
        formatter: (param: unknown) => {
          const p = param as { name: string; value: number };
          return `<span style="color:${t.ink_secondary};font-size:11px">${p.name}</span><br/><span style="font-weight:600;color:${t.ink_primary}">${fmt(p.value)}</span>`;
        },
      },
      xAxis: {
        type: 'category' as const,
        data: data.map((d) => d.label),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          ...baseAxisLabel(t),
          interval: 0,
          overflow: 'break' as const,
          width: 70,
        },
      },
      yAxis: {
        type: 'value' as const,
        splitLine: baseSplitLine(t),
        axisLabel: { ...baseAxisLabel(t), formatter: (v: number) => fmt(v) },
        axisLine: { show: false },
        axisTick: { show: false },
        minInterval: 1,
      },
      series: [{
        type: 'bar' as const,
        data: data.map((d) => ({
          value: d.value,
          itemStyle: {
            color: d.color ?? c,
            borderRadius: [3, 3, 0, 0],
          },
        })),
        barMaxWidth: 32,
        animationDelay: (index: number) => Math.min(index * 45, 315),
        emphasis: { itemStyle: { opacity: 0.8 } },
      }],
    };
  }, [data, defaultColor, valueFormatter, emptyLabel]);

  return <EChartWrapper option={option} height={height} />;
}
