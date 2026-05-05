'use client';

import { type ButtonHTMLAttributes, forwardRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leadingIcon?: ReactNode;
}

const BASE =
  'inline-flex items-center justify-center gap-2 font-medium transition-colors focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--accent-500)] text-[var(--accent-fg-on-500)] hover:bg-[var(--accent-600)] active:bg-[var(--accent-700)] focus-visible:shadow-[var(--shadow-focus)]',
  secondary:
    'bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-default)] hover:bg-[var(--bg-hover)] focus-visible:shadow-[var(--shadow-focus)]',
  ghost:
    'bg-transparent text-[var(--text-primary)] hover:bg-[var(--bg-hover)] focus-visible:shadow-[var(--shadow-focus)]',
  danger:
    'bg-[var(--risk-critical-fg)] text-white hover:opacity-90 active:opacity-80 focus-visible:shadow-[var(--shadow-focus)]',
  link: 'bg-transparent text-[var(--text-link)] underline-offset-4 hover:underline focus-visible:shadow-[var(--shadow-focus)] p-0 h-auto',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-7 px-[10px] text-[13px] rounded-[var(--radius-2)]',
  md: 'h-8 px-[14px] text-[14px] rounded-[var(--radius-2)]',
  lg: 'h-10 px-[18px] text-[14px] rounded-[var(--radius-2)]',
};

const ICON_SIZES: Record<ButtonSize, string> = {
  sm: 'w-4 h-4',
  md: 'w-4 h-4',
  lg: 'w-[18px] h-[18px]',
};

const Spinner = ({ size }: { size: ButtonSize }) => (
  <svg
    className={cn('animate-spin', ICON_SIZES[size])}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
    />
  </svg>
);

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = 'primary', size = 'md', loading = false, leadingIcon, className, children, disabled, ...props },
    ref,
  ) => {
    const isLink = variant === 'link';
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(BASE, isLink ? VARIANTS.link : cn(SIZES[size], VARIANTS[variant]), className)}
        {...props}
      >
        {loading ? (
          <Spinner size={size} />
        ) : leadingIcon ? (
          <span className={cn('shrink-0', ICON_SIZES[size])} aria-hidden="true">
            {leadingIcon}
          </span>
        ) : null}
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';
