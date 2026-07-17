'use client';

import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import { EChartWrapper } from './EChartWrapper';
import { readCssTokens, baseAxisLabel, baseSplitLine, baseTooltip } from '@/components/charts/echartsTheme';

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

export function AnalyticsLineChart({
  data,
  height = 200,
  color,
  valueFormatter,
  seriesName = 'Value',
  area = true,
  emptyLabel = 'No data yet',
}: AnalyticsLineChartProps) {
  const option = useMemo((): EChartsOption => {
    const t = readCssTokens();
    const c = color ?? t.data_neutral;
    const fmt = valueFormatter ?? ((n: number) => String(n));

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
      animationDuration: 650,
      animationDurationUpdate: 360,
      animationEasing: 'cubicOut',
      animationEasingUpdate: 'cubicOut',
      grid: { left: 0, right: 8, top: 8, bottom: 0, containLabel: true },
      tooltip: {
        ...baseTooltip(t),
        trigger: 'axis' as const,
        axisPointer: { type: 'line' as const, lineStyle: { color: t.surface_border } },
        formatter: (params: unknown) => {
          const p = (params as { name: string; value: number }[])[0];
          return `<span style="color:${t.ink_secondary};font-size:11px">${p.name}</span><br/><span style="font-weight:600;color:${t.ink_primary}">${fmt(p.value)}</span>`;
        },
      },
      xAxis: {
        type: 'category' as const,
        data: data.map((d) => d.label),
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: { ...baseAxisLabel(t), interval: data.length > 8 ? Math.ceil(data.length / 6) - 1 : 0 },
        boundaryGap: false,
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
        name: seriesName,
        type: 'line' as const,
        data: data.map((d) => d.value),
        smooth: 0.3,
        animationDelay: 70,
        symbol: 'circle',
        symbolSize: data.length === 1 ? 6 : 4,
        showSymbol: data.length <= 10,
        lineStyle: { color: c, width: 2 },
        itemStyle: { color: c },
        areaStyle: area ? {
          color: {
            type: 'linear' as const, x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: c + '28' },
              { offset: 1, color: c + '05' },
            ],
          },
        } : undefined,
      }],
    };
  }, [data, color, valueFormatter, seriesName, area, emptyLabel]);

  return <EChartWrapper option={option} height={height} />;
}
