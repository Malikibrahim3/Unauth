'use client';

import Link from 'next/link';
import { type MouseEventHandler, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { filterChipContract } from '@/styles/authenticated/contracts';

export interface FilterChipProps {
  children: ReactNode;
  active?: boolean;
  count?: number | string;
  href?: string;
  disabled?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  className?: string;
  'aria-label'?: string;
}

const chipClass = (active: boolean, disabled: boolean, className?: string) =>
  cn(
    'ua-jitter',
    filterChipContract.base,
    active ? filterChipContract.selected : filterChipContract.unselected,
    disabled && filterChipContract.disabled,
    className,
  );

/** Interactive dataset filter. Its selected state is neutral, never semantic. */
export function FilterChip({ children, active = false, count, href, disabled = false, onClick, className, 'aria-label': ariaLabel }: FilterChipProps) {
  const content = <>{children}{count != null ? <span className="tabular-nums text-[12px] opacity-75">{count}</span> : null}</>;
  if (href) {
    return (
      <Link
        href={disabled ? '#' : href}
        aria-disabled={disabled || undefined}
        aria-current={active ? 'page' : undefined}
        aria-label={ariaLabel}
        tabIndex={disabled ? -1 : undefined}
        className={chipClass(active, disabled, className)}
        onClick={disabled ? (event) => event.preventDefault() : undefined}
      >
        {content}
      </Link>
    );
  }
  return (
    <button type="button" disabled={disabled} aria-pressed={active} aria-label={ariaLabel} onClick={onClick} className={chipClass(active, disabled, className)}>
      {content}
    </button>
  );
}
