'use client';

import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, style, ...props }, ref) => (
    <select
      ref={ref}
      className={cn('w-full px-3 py-2 text-sm focus:outline-none transition-colors duration-[120ms] focus:border-[var(--copper-bright)]', className)}
      style={{
        background: 'var(--surface-input)',
        border: '1px solid var(--surface-border)',
        borderRadius: 'var(--radius-md)',
        color: 'var(--ink-primary)',
        ...style,
      }}
      {...props}
    />
  ),
);

Select.displayName = 'Select';
