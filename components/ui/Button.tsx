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
  'inline-flex items-center justify-center gap-2 font-medium transition-colors focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed select-none';

const SIZES: Record<ButtonSize, { height: number; px: string; fontSize: number }> = {
  sm: { height: 28, px: '10px', fontSize: 12 },
  md: { height: 32, px: '14px', fontSize: 13 },
  lg: { height: 36, px: '18px', fontSize: 13 },
};

const ICON_SIZES: Record<ButtonSize, string> = {
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-4 h-4',
};

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:   'hover:bg-[var(--accent-hover)] active:bg-[var(--accent-700)]',
  secondary: 'hover:bg-[var(--bg-hover)] active:bg-[var(--bg-surface-sunk)]',
  ghost:     'hover:bg-[var(--bg-hover)] active:bg-[var(--bg-surface-sunk)]',
  danger:    'hover:opacity-90 active:opacity-80',
  link:      'underline-offset-4 hover:underline p-0',
};

function variantStyle(variant: ButtonVariant): React.CSSProperties {
  switch (variant) {
    case 'primary':
      return {
        background: 'var(--accent)',
        color: 'var(--accent-fg-on-500)',
        border: '1px solid var(--accent)',
        boxShadow: '0 1px 0 rgba(94,32,24,0.18)',
      };
    case 'secondary':
      return { background: 'var(--bg-surface)', color: 'var(--text)', border: '1px solid var(--border-default)' };
    case 'ghost':
      return { background: 'transparent', color: 'var(--text-muted)' };
    case 'danger':
      return { background: 'var(--risk-critical-fg)', color: '#FBEFEC', border: '1px solid var(--risk-critical-fg)' };
    case 'link':
      return { background: 'transparent', color: 'var(--text-muted)' };
  }
}

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
    { variant = 'primary', size = 'md', loading = false, leadingIcon, className, children, disabled, style, ...props },
    ref,
  ) => {
    const isLink = variant === 'link';
    const sz = SIZES[size];

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(BASE, VARIANT_CLASSES[variant], className)}
        style={{
          height: isLink ? undefined : sz.height,
          paddingLeft: isLink ? undefined : sz.px,
          paddingRight: isLink ? undefined : sz.px,
          fontSize: sz.fontSize,
          borderRadius: isLink ? undefined : 4,
          letterSpacing: '0.01em',
          ...variantStyle(variant),
          ...style,
        }}
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
