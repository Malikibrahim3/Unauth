'use client';

import Link from '@/components/navigation/AppNavLink';
import { type MouseEventHandler, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface FilterChipProps {
  children: ReactNode;
  active?: boolean;
  count?: number | string;
  href?: string;
  disabled?: boolean;
  /** Why this filter is disabled — surfaced as a title tooltip. */
  disabledReason?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  className?: string;
  'aria-label'?: string;
}

const chipClass = (active: boolean, disabled: boolean, className?: string) => cn(
  'inline-flex min-h-8 items-center gap-2 rounded-lg border px-3 text-[11px] font-medium no-underline transition-colors',
  active ? 'border-[#1c1f23] bg-[#1c1f23] text-white' : 'border-[#d8d4cf] bg-white text-[#40454a] hover:bg-[#f4f3f1]',
  disabled && 'cursor-not-allowed opacity-45',
  className,
);

/** Interactive dataset filter. Its selected state is neutral, never semantic. */
export function FilterChip({ children, active = false, count, href, disabled = false, disabledReason, onClick, className, 'aria-label': ariaLabel }: FilterChipProps) {
  // F-41: a disabled chip renders no value — never a "· —" filler.
  const content = <>{children}{!disabled && count != null ? <span className="tabular-nums text-[length:11.5px]">{count}</span> : null}</>;
  const title = disabled ? disabledReason : undefined;
  if (href) {
    return (
      <Link
        href={disabled ? '#' : href}
        aria-disabled={disabled || undefined}
        aria-current={active ? 'page' : undefined}
        aria-label={ariaLabel}
        title={title}
        tabIndex={disabled ? -1 : undefined}
        className={chipClass(active, disabled, className)}
        onClick={disabled ? (event) => event.preventDefault() : undefined}
      >
        {content}
      </Link>
    );
  }
  return (
    <button type="button" disabled={disabled} aria-pressed={active} aria-label={ariaLabel} title={title} onClick={onClick} className={chipClass(active, disabled, className)}>
      {content}
    </button>
  );
}
