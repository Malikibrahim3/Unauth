'use client';

import Link from 'next/link';
import { type KeyboardEvent, type ReactNode, useRef } from 'react';
import { cn } from '@/lib/utils';
import { tabContract } from '@/styles/authenticated/contracts';

export interface TabItem {
  value: string;
  label: ReactNode;
  href?: string;
  disabled?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  value: string;
  onValueChange?: (value: string) => void;
  'aria-label': string;
  /** Pass this for actual in-page tabs so `aria-controls` points to a panel. */
  panelId?: string;
  id?: string;
  className?: string;
}

/**
 * Sibling route links stay ordinary navigation. Only the button form is a
 * true tablist, and it implements the APG roving-focus keyboard pattern.
 */
export function Tabs({ items, value, onValueChange, 'aria-label': ariaLabel, panelId, id, className }: TabsProps) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const isInPageTabs = items.every((item) => !item.href);
  const isTrueTabs = isInPageTabs && Boolean(panelId);

  const moveFocus = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!isTrueTabs || items.length < 2) return;
    const enabled = items.map((item, itemIndex) => ({ item, itemIndex })).filter(({ item }) => !item.disabled);
    const current = enabled.findIndex(({ itemIndex }) => itemIndex === index);
    if (current < 0) return;
    let next = current;
    if (event.key === 'ArrowRight') next = (current + 1) % enabled.length;
    else if (event.key === 'ArrowLeft') next = (current - 1 + enabled.length) % enabled.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = enabled.length - 1;
    else return;
    event.preventDefault();
    const target = enabled[next]?.itemIndex;
    if (target == null) return;
    onValueChange?.(items[target]!.value);
    tabRefs.current[target]?.focus();
  };

  return isTrueTabs ? (
    <div id={id} role="tablist" aria-label={ariaLabel} className={cn(tabContract.root, className)}>
      {items.map((item, index) => {
        const active = item.value === value;
        const classes = cn(tabContract.item, active && tabContract.active, item.disabled && 'cursor-not-allowed opacity-50');
        return (
          <button
            key={item.value}
            ref={(element) => { tabRefs.current[index] = element; }}
            type="button"
            role="tab"
            id={id ? `${id}-tab-${item.value}` : undefined}
            aria-selected={active}
            aria-controls={panelId}
            tabIndex={active ? 0 : -1}
            disabled={item.disabled}
            onClick={() => onValueChange?.(item.value)}
            onKeyDown={(event) => moveFocus(event, index)}
            className={classes}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  ) : isInPageTabs ? (
    <div id={id} role="group" aria-label={ariaLabel} className={cn(tabContract.root, className)}>
      {items.map((item) => {
        const active = item.value === value;
        const classes = cn(tabContract.item, active && tabContract.active, item.disabled && 'cursor-not-allowed opacity-50');
        return (
          <button
            key={item.value}
            type="button"
            aria-pressed={active}
            disabled={item.disabled}
            onClick={() => onValueChange?.(item.value)}
            className={classes}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  ) : (
    <nav id={id} aria-label={ariaLabel} className={cn(tabContract.root, className)}>
      {items.map((item) => {
        const active = item.value === value;
        const classes = cn(tabContract.item, active && tabContract.active, item.disabled && 'cursor-not-allowed opacity-50');
        return (
          <Link
            key={item.value}
            href={item.disabled ? '#' : item.href!}
            aria-current={active ? 'page' : undefined}
            aria-disabled={item.disabled || undefined}
            tabIndex={item.disabled ? -1 : undefined}
            className={classes}
            onClick={item.disabled ? (event) => event.preventDefault() : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
