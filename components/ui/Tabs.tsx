'use client';

import Link from 'next/link';
import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { tabContract } from '@/styles/authenticated/contracts';

export interface TabItem {
  value: string;
  label: ReactNode;
  href?: string;
  disabled?: boolean;
}

export function Tabs({ items, value, onValueChange, 'aria-label': ariaLabel, className }: { items: TabItem[]; value: string; onValueChange?: (value: string) => void; 'aria-label': string; className?: string }) {
  return (
    <div role="tablist" aria-label={ariaLabel} className={cn(tabContract.root, className)}>
      {items.map((item) => {
        const active = item.value === value;
        const classes = cn(tabContract.item, active && tabContract.active, item.disabled && 'cursor-not-allowed opacity-50');
        if (item.href) return <Link key={item.value} href={item.disabled ? '#' : item.href} role="tab" aria-selected={active} aria-disabled={item.disabled || undefined} className={classes} onClick={item.disabled ? (event) => event.preventDefault() : undefined}>{item.label}</Link>;
        return <button key={item.value} type="button" role="tab" aria-selected={active} disabled={item.disabled} onClick={() => onValueChange?.(item.value)} className={classes}>{item.label}</button>;
      })}
    </div>
  );
}
