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
  mobileColumns: _mobileColumns,
  itemAttributes,
  columns,
  density = 'standard',
  showIcons = false,
  variant = 'divided',
}: MetricGroupProps) {
  const count = items.length;
  const resolvedDesktopColumns = columns ?? desktopColumns ?? count;
  if (process.env.NODE_ENV !== 'production' && count > 6) {
    console.warn(
      `MetricGroup received ${count} metrics. §5.3 requires four headline metrics with the remainder in a supporting breakdown.`,
    );
  }

  const style: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${count > 6 ? 4 : Math.max(1, resolvedDesktopColumns)}, minmax(0, 1fr))`,
    gap: variant === 'cards' ? 10 : 1,
    overflow: 'hidden',
    border: '1px solid #e4e3e0',
    borderRadius: 12,
    background: variant === 'cards' ? '#ffffff' : '#e4e3e0',
  };

  return (
    <dl
      className={cn(
        'm-0',
        variant === 'cards' && 'rounded-xl border border-[#e4e3e0] bg-white',
        density === 'dense' && 'text-[11px]',
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
        <div key={item.label} {...attributes} className={attributes?.className} style={{ minWidth: 0, padding: density === 'dense' ? 11 : 14, background: '#fff' }}>
          {showIcons && item.icon ? <span className="mb-2 inline-flex text-[#64686d]" aria-hidden="true">{item.icon}</span> : null}
          <dt className="text-[11px] leading-[1.45] text-[#64686d]">{item.label}</dt>
          <MetricValueCell value={item.value} />
          {item.description ? <dd className="text-[11px] leading-[1.45] text-[#64686d]">{item.description}</dd> : null}
          {item.microchart ? <dd className="relative">{item.microchart}</dd> : null}
        </div>
        );
      })}
    </dl>
  );
}
