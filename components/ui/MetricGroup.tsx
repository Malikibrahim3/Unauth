import { type CSSProperties, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { MetricValueCell } from './MetricValueCell';

export interface MetricGroupItem {
  label: string;
  value: ReactNode;
  description?: ReactNode;
  microchart?: ReactNode;
  icon?: ReactNode;
}

export interface MetricGroupProps {
  items: MetricGroupItem[];
  className?: string;
  'aria-label'?: string;
  desktopColumns?: number;
  mobileColumns?: number;
  itemAttributes?: (item: MetricGroupItem, index: number) => HTMLAttributes<HTMLDivElement>;
  /** Alias for `desktopColumns` matching the shared-primitive contract; takes precedence when set. */
  columns?: 3 | 4 | 5;
  density?: 'standard' | 'dense';
  /** One decision for the whole group — never per card. */
  showIcons?: boolean;
  /** 'divided' (default) is the single ruled ledger strip used by `/customers/[id]`; 'cards' is a gapped grid of individually-bordered cards. */
  variant?: 'cards' | 'divided';
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
  desktopColumns,
  mobileColumns,
  itemAttributes,
  columns,
  density = 'standard',
  showIcons = false,
  variant = 'divided',
}: MetricGroupProps) {
  const count = items.length;
  const resolvedDesktopColumns = columns ?? desktopColumns ?? count;
  const resolvedMobileColumns = mobileColumns ?? (count > 1 ? 2 : 1);

  if (process.env.NODE_ENV !== 'production' && count > 6) {
    console.warn(
      `MetricGroup received ${count} metrics. §5.3 requires four headline metrics with the remainder in a supporting breakdown.`,
    );
  }

  const style = {
    '--uo-route-metric-columns': count > 6 ? 4 : Math.max(1, resolvedDesktopColumns),
    '--uo-route-metric-mobile-columns': Math.max(1, resolvedMobileColumns),
  } as CSSProperties;

  return (
    <dl
      className={cn(
        'ua-metric-group',
        variant === 'cards' && 'ua-metric-group--cards',
        density === 'dense' && 'ua-metric-group--dense',
        className,
      )}
      style={style}
      data-count={count}
      data-variant={variant}
      aria-label={ariaLabel}
    >
      {items.map((item, index) => {
        const attributes = itemAttributes?.(item, index);
        return (
        <div key={item.label} {...attributes} className={cn('ua-metric-group__item', attributes?.className)}>
          {showIcons && item.icon ? <span className="ua-metric-group__icon" aria-hidden="true">{item.icon}</span> : null}
          <dt className="ua-metric-group__label">{item.label}</dt>
          <MetricValueCell value={item.value} />
          {item.description ? <dd className="ua-metric-group__description">{item.description}</dd> : null}
          {item.microchart ? <dd className="ua-metric-group__microchart">{item.microchart}</dd> : null}
        </div>
        );
      })}
    </dl>
  );
}
