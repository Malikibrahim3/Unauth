'use client';

import { type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { BUTTON_ICON_SIZES } from './buttonStyles';
import type { ButtonSize } from './Button';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon: ReactNode;
  size?: ButtonSize;
}

/** Compact action button. The accessible label is required because the icon is not text. */
export function IconButton({ label, icon, size = 'md', className, title, ...props }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={title}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-[var(--ua-radius-control)] border border-[var(--ua-border-default)] bg-[var(--ua-surface-primary)] text-[var(--ua-text-secondary)] transition-colors hover:bg-[var(--ua-surface-hover)] hover:text-[var(--ua-text-primary)] focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
        size === 'sm' && 'h-[var(--ua-control-height-sm)] w-[var(--ua-control-height-sm)]',
        size === 'md' && 'h-[var(--ua-control-height-md)] w-[var(--ua-control-height-md)]',
        size === 'lg' && 'h-[var(--ua-control-height-lg)] w-[var(--ua-control-height-lg)]',
        className,
      )}
      {...props}
    >
      <span className={cn('shrink-0', BUTTON_ICON_SIZES[size])} aria-hidden="true">{icon}</span>
    </button>
  );
}
