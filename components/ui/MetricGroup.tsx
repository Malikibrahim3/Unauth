import { type CSSProperties, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface MetricGroupItem {
  label: string;
  value: ReactNode;
  description?: ReactNode;
}

export interface MetricGroupProps {
  items: MetricGroupItem[];
  className?: string;
  'aria-label'?: string;
  desktopColumns?: number;
  mobileColumns?: number;
  itemAttributes?: (item: MetricGroupItem, index: number) => HTMLAttributes<HTMLDivElement>;
}

export function MetricGroup({
  items,
  className,
  'aria-label': ariaLabel = 'Key metrics',
  desktopColumns = items.length,
  mobileColumns = items.length > 1 ? 2 : 1,
  itemAttributes,
}: MetricGroupProps) {
  const style = {
    '--ua-metric-columns': Math.max(1, desktopColumns),
    '--ua-metric-mobile-columns': Math.max(1, mobileColumns),
  } as CSSProperties;

  return (
    <dl className={cn('ua-metric-group', className)} style={style} aria-label={ariaLabel}>
      {items.map((item, index) => {
        const attributes = itemAttributes?.(item, index);
        return (
        <div key={item.label} {...attributes} className={cn('ua-metric-group__item', attributes?.className)}>
          <dt className="ua-metric-group__label">{item.label}</dt>
          <dd className="ua-metric-group__value">{item.value}</dd>
          {item.description ? <dd className="ua-metric-group__description">{item.description}</dd> : null}
        </div>
        );
      })}
    </dl>
  );
}
