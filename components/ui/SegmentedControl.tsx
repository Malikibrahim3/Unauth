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
        const classes = cn('inline-flex min-h-7 items-center justify-center whitespace-nowrap px-2.5 py-1 text-[10.5px] leading-none text-[#64686d] no-underline transition-colors hover:bg-white hover:text-[#1c1f23]', active && 'bg-white font-medium text-[#1c1f23] shadow-[0_1px_2px_rgba(28,27,25,.08)]', item.disabled && 'cursor-not-allowed opacity-45');
        const content = <>{item.label}</>;
        if (item.href) {
          return <Link key={item.value} href={item.disabled ? '#' : item.href} aria-current={active ? 'page' : undefined} aria-disabled={item.disabled || undefined} tabIndex={item.disabled ? -1 : undefined} className={classes} onClick={item.disabled ? (event) => event.preventDefault() : undefined}>{content}</Link>;
        }
        return <button key={item.value} type="button" aria-pressed={active} disabled={item.disabled} onClick={() => onValueChange?.(item.value)} className={classes}>{content}</button>;
      })}
    </>
  );
  return isRouteNavigation ? (
    <nav aria-label={ariaLabel} className={cn('inline-flex overflow-hidden rounded-lg border border-[#e4e3e0] bg-[#f4f3f1] p-0.5', className)}>
      {renderedItems}
    </nav>
  ) : (
    <div role="group" aria-label={ariaLabel} className={cn('inline-flex overflow-hidden rounded-lg border border-[#e4e3e0] bg-[#f4f3f1] p-0.5', className)}>
      {renderedItems}
    </div>
  );
}
