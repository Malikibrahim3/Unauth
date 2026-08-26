import { type HTMLAttributes, type ReactNode } from 'react';
import { MetricGroup } from '@/components/ui/MetricGroup';

export interface WorkbenchKpiItem {
  label: string;
  value: ReactNode;
  hint?: string;
  /** Optional lightweight trend sparkline (≥2 points) rendered beside the value. */
  trend?: number[];
  /** Chart token for the sparkline stroke (default --uo-route-chart-primary). */
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
      value: item.value,
      description: item.hint,
    }))}
    desktopColumns={items.length}
    aria-label="Key metrics"
    itemAttributes={(_, index) => ({ 'data-capability-id': `metric.${index + 1}` } as HTMLAttributes<HTMLDivElement>)}
  />;
}
