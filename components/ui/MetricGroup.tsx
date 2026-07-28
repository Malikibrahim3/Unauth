import { type CSSProperties, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface MetricGroupItem {
  label: string;
  value: ReactNode;
  description?: ReactNode;
  microchart?: ReactNode;
}

export interface MetricGroupProps {
  items: MetricGroupItem[];
  className?: string;
  'aria-label'?: string;
  desktopColumns?: number;
  mobileColumns?: number;
  itemAttributes?: (item: MetricGroupItem, index: number) => HTMLAttributes<HTMLDivElement>;
}

/**
 * Adaptive KPI group (§5.3). The group always sizes to its content, so a metric
 * row never shows a blank quarter or half. Counts of 1–6 have an exact desktop
 * layout; the responsive 1024–1279px reflow lives in surfaces.css keyed off
 * `data-count`.
 *
 * At seven or more metrics the spec's answer is editorial, not visual: reduce to
 * four headline metrics and move the remainder into a supporting breakdown. The
 * grid caps at four columns so the overflow at least wraps cleanly, and says so
 * in development.
 */
export function MetricGroup({
  items,
  className,
  'aria-label': ariaLabel = 'Key metrics',
  desktopColumns = items.length,
  mobileColumns = items.length > 1 ? 2 : 1,
  itemAttributes,
}: MetricGroupProps) {
  const count = items.length;

  if (process.env.NODE_ENV !== 'production' && count > 6) {
    console.warn(
      `MetricGroup received ${count} metrics. §5.3 requires four headline metrics with the remainder in a supporting breakdown.`,
    );
  }

  const style = {
    '--ua-metric-columns': count > 6 ? 4 : Math.max(1, desktopColumns),
    '--ua-metric-mobile-columns': Math.max(1, mobileColumns),
  } as CSSProperties;

  return (
    <dl className={cn('ua-metric-group', className)} style={style} data-count={count} aria-label={ariaLabel}>
      {items.map((item, index) => {
        const attributes = itemAttributes?.(item, index);
        return (
        <div key={item.label} {...attributes} className={cn('ua-metric-group__item', attributes?.className)}>
          <dt className="ua-metric-group__label">{item.label}</dt>
          <dd className="ua-metric-group__value">{item.value}</dd>
          {item.description ? <dd className="ua-metric-group__description">{item.description}</dd> : null}
          {item.microchart ? <div className="ua-metric-group__microchart">{item.microchart}</div> : null}
        </div>
        );
      })}
    </dl>
  );
}
