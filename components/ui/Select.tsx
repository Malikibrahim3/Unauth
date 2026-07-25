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
          'w-full px-3 text-sm focus:outline-none transition-colors duration-[var(--ua-duration-fast)] focus:bg-[var(--ua-surface-primary)] focus:border-[var(--ua-text-primary)] appearance-none',
          className,
        )}
        style={{
          height: 'var(--ua-control-height-input)',
          background: 'var(--ua-surface-primary)',
          border: '1px solid var(--ua-border-default)',
          borderRadius: 'var(--ua-radius-control)',
          color: 'var(--ua-text-primary)',
          paddingRight: 32,
          ...style,
        }}
        {...props}
      />
      <ChevronDown
        size={14}
        aria-hidden="true"
        className="pointer-events-none absolute right-2.5"
        style={{ color: 'var(--ua-icon-secondary)' }}
      />
    </span>
  ),
);

Select.displayName = 'Select';
