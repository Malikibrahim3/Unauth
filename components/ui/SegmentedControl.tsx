'use client';

import Link from '@/components/navigation/AppNavLink';
import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface SegmentedControlItem {
  value: string;
  label: ReactNode;
  href?: string;
  disabled?: boolean;
}

export interface SegmentedControlProps {
  items: SegmentedControlItem[];
  value: string;
  onValueChange?: (value: string) => void;
  'aria-label': string;
  className?: string;
}

/** One enclosing control for a small mutually exclusive choice set. */
export function SegmentedControl({ items, value, onValueChange, 'aria-label': ariaLabel, className }: SegmentedControlProps) {
  const isRouteNavigation = items.some((item) => Boolean(item.href));
  const renderedItems = (
    <>
      {items.map((item) => {
        const active = item.value === value;
        const classes = cn('ua-segmented__item', active && 'ua-segmented__item--active', item.disabled && 'ua-segmented__item--disabled');
        const content = <>{item.label}</>;
        if (item.href) {
          return <Link key={item.value} href={item.disabled ? '#' : item.href} aria-current={active ? 'page' : undefined} aria-disabled={item.disabled || undefined} tabIndex={item.disabled ? -1 : undefined} className={classes} onClick={item.disabled ? (event) => event.preventDefault() : undefined}>{content}</Link>;
        }
        return <button key={item.value} type="button" aria-pressed={active} disabled={item.disabled} onClick={() => onValueChange?.(item.value)} className={classes}>{content}</button>;
      })}
    </>
  );
  return isRouteNavigation ? (
    <nav aria-label={ariaLabel} className={cn('ua-segmented', className)}>
      {renderedItems}
    </nav>
  ) : (
    <div role="group" aria-label={ariaLabel} className={cn('ua-segmented', className)}>
      {renderedItems}
    </div>
  );
}
