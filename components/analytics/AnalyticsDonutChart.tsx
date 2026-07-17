'use client';

import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import { EChartWrapper } from './EChartWrapper';
import { readCssTokens, gradeColors, baseTooltip } from '@/components/charts/echartsTheme';
import { formatNumber } from '@/lib/utils/format';

export interface DonutSlice {
  label: string;
  value: number;
  color?: string;
}

export interface AnalyticsDonutChartProps {
  data: DonutSlice[];
  height?: number;
  showLegend?: boolean;
  valueFormatter?: (n: number) => string;
  emptyLabel?: string;
  gradePalette?: boolean;
}

export function AnalyticsDonutChart({
  data,
  height = 220,
  showLegend = true,
  valueFormatter,
  emptyLabel = 'No data yet',
  gradePalette = false,
}: AnalyticsDonutChartProps) {
  const option = useMemo((): EChartsOption => {
    const t = readCssTokens();
    const fmt = valueFormatter ?? ((n: number) => formatNumber(n));
    const palette = gradePalette ? gradeColors(t) : [t.accent, t.sev_clear, t.sev_probable, t.sev_neutral, t.sev_weak];
    const total = data.reduce((s, d) => s + d.value, 0);

    if (!data || data.length === 0 || total === 0) {
      return {
        graphic: [{ type: 'text', left: 'center', top: 'middle', style: { text: emptyLabel, fill: t.ink_tertiary, fontSize: 12, fontFamily: 'inherit' } }],
        series: [],
      };
    }

    const seriesData = data.map((d, i) => ({
      name: d.label,
      value: d.value,
      itemStyle: { color: d.color ?? palette[i % palette.length] },
    }));

    return {
      animation: true,
      animationDuration: 620,
      animationDurationUpdate: 360,
      animationEasing: 'cubicOut',
      animationEasingUpdate: 'cubicOut',
      tooltip: {
        ...baseTooltip(t),
        trigger: 'item' as const,
        formatter: (param: unknown) => {
          const p = param as { name: string; value: number; percent: number };
          return `<span style="color:${t.ink_secondary};font-size:11px">${p.name}</span><br/><span style="font-weight:600;color:${t.ink_primary}">${fmt(p.value)}</span> <span style="color:${t.ink_tertiary}">${p.percent.toFixed(1)}%</span>`;
        },
      },
      legend: showLegend ? {
        orient: 'horizontal' as const,
        bottom: 0,
        left: 'center',
        textStyle: { color: t.ink_secondary, fontSize: 11, fontFamily: 'inherit' },
        icon: 'circle',
        itemWidth: 8,
        itemHeight: 8,
        itemGap: 12,
      } : { show: false },
      series: [{
        type: 'pie' as const,
        radius: ['48%', '72%'],
        center: showLegend ? ['50%', '44%'] : ['50%', '50%'],
        padAngle: 2,
        animationDelay: 90,
        itemStyle: { borderRadius: 3, borderColor: t.surface_raised, borderWidth: 2 },
        label: { show: false },
        emphasis: {
          scale: true,
          scaleSize: 4,
          itemStyle: { shadowBlur: 8, shadowColor: 'color-mix(in srgb, var(--text-primary) 12%, transparent)' },
        },
        data: seriesData,
      }],
    };
  }, [data, showLegend, valueFormatter, emptyLabel, gradePalette]);

  return <EChartWrapper option={option} height={height} />;
}
