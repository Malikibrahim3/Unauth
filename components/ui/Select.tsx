'use client';

import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, style, ...props }, ref) => (
    <select
      ref={ref}
      className={cn('w-full px-3 py-2 text-sm focus:outline-none transition-colors focus:border-[var(--accent)]', className)}
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 6,
        color: 'var(--text)',
        ...style,
      }}
      {...props}
    />
  ),
);

Select.displayName = 'Select';
