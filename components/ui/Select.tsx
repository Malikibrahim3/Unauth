'use client';

import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, style, ...props }, ref) => (
    <select
      ref={ref}
      className={cn('w-full px-3 text-sm focus:outline-none transition-colors duration-[120ms] focus:border-[var(--copper-bright)] appearance-none', className)}
      style={{
        height: 36,
        background: `var(--surface-input) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%238F816F' d='M6 8L2 4h8L6 8z'/%3E%3C/svg%3E") no-repeat right 10px center`,
        border: '1px solid var(--surface-border)',
        borderRadius: 'var(--radius-md)',
        color: 'var(--ink-primary)',
        paddingRight: 32,
        ...style,
      }}
      {...props}
    />
  ),
);

Select.displayName = 'Select';
