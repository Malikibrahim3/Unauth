import { type HTMLAttributes, type ReactNode } from 'react';
import { SparkTrend } from '@/components/charts/authenticated/micro/SparkTrend';
import { MetricGroup } from '@/components/ui/MetricGroup';

export interface WorkbenchKpiItem {
  label: string;
  value: ReactNode;
  hint?: string;
  /** Optional lightweight trend sparkline (≥2 points) rendered beside the value. */
  trend?: number[];
  /** Chart token for the sparkline stroke (default --ua-chart-1). */
  trendColourVar?: string;
}

interface WorkbenchKpiStripProps {
  items: WorkbenchKpiItem[];
  /** Retained for call-site compatibility; column geometry is now owned by MetricGroup. */
  colsClassName?: string;
}

export function WorkbenchKpiStrip({ items, colsClassName = 'grid-cols-2 md:grid-cols-5' }: WorkbenchKpiStripProps) {
  void colsClassName;
  return <MetricGroup
    items={items.map((item) => ({
      label: item.label,
      value: item.trend && item.trend.length >= 2 ? (
        <span className="flex items-center justify-between gap-2">
          <span className="min-w-0 overflow-hidden text-ellipsis">{item.value}</span>
          <SparkTrend values={item.trend} colourVar={item.trendColourVar} />
        </span>
      ) : item.value,
      description: item.hint,
    }))}
    desktopColumns={items.length}
    aria-label="Key metrics"
    itemAttributes={(_, index) => ({ 'data-capability-id': `metric.${index + 1}` } as HTMLAttributes<HTMLDivElement>)}
  />;
}
