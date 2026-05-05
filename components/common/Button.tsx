'use client';

import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'table-action';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--accent)] text-[var(--text-inverse)] hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed',
  secondary:
    'border border-[var(--border)] text-[var(--text)] bg-transparent hover:bg-[var(--bg-subtle)] disabled:opacity-50 disabled:cursor-not-allowed',
  ghost:
    'text-[var(--text-muted)] bg-transparent hover:bg-[var(--bg-subtle)] hover:text-[var(--text)] disabled:opacity-50 disabled:cursor-not-allowed',
  danger:
    'bg-[var(--risk-critical)] text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed',
  'table-action':
    'text-xs text-[var(--text)] font-semibold hover:underline disabled:opacity-50 disabled:cursor-not-allowed',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs font-semibold rounded-md',
  md: 'px-4 py-2 text-sm font-semibold rounded-md',
  lg: 'px-5 py-2.5 text-sm font-semibold rounded-md',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className, children, ...props }, ref) => {
    if (variant === 'table-action') {
      return (
        <button
          ref={ref}
          className={cn(variantStyles['table-action'], className)}
          {...props}
        >
          {children}
        </button>
      );
    }
    return (
      <button
        ref={ref}
        className={cn('inline-flex items-center gap-1.5 transition-colors', sizeStyles[size], variantStyles[variant], className)}
        {...props}
      >
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';
