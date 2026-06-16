'use client';

import { ChevronDown } from 'lucide-react';
import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, style, ...props }, ref) => (
    <span className="relative inline-flex w-full items-center">
      <select
        ref={ref}
        className={cn(
          'w-full px-3 text-sm focus:outline-none transition-colors duration-[var(--duration-fast)] focus:bg-[var(--surface)] focus:border-[var(--text-primary)] appearance-none',
          className,
        )}
        style={{
          height: 'var(--input-height)',
          background: 'var(--surface-sunken)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--text-primary)',
          paddingRight: 32,
          ...style,
        }}
        {...props}
      />
      <ChevronDown
        size={14}
        aria-hidden="true"
        className="pointer-events-none absolute right-2.5"
        style={{ color: 'var(--icon-muted)' }}
      />
    </span>
  ),
);

Select.displayName = 'Select';
