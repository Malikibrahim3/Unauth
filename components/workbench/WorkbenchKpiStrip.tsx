import { type HTMLAttributes, type ReactNode } from 'react';
import { SparkTrend } from '@/components/charts/authenticated/micro/SparkTrend';
import { MetricGroup } from '@/components/ui/MetricGroup';

export interface WorkbenchKpiItem {
  label: string;
  value: ReactNode;
  hint?: string;
  /** Optional lightweight trend sparkline (≥2 points) rendered beside the value. */
  trend?: number[];
  /** Chart token for the sparkline stroke (default --ua-chart-primary). */
  trendColourVar?: string;
}

interface WorkbenchKpiStripProps {
  items: WorkbenchKpiItem[];
}

/** Column geometry is owned by MetricGroup's adaptive KPI contract (§5.3). */
export function WorkbenchKpiStrip({ items }: WorkbenchKpiStripProps) {
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
