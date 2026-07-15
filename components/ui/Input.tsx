'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, style, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'w-full px-3 text-sm focus:outline-none transition-colors duration-[var(--duration-fast)]',
        'focus:bg-[var(--surface)] focus:border-[var(--text-primary)] focus:ring-[var(--shadow-focus)]',
        className,
      )}
      style={{
        height: 'var(--ua-control-height-input)',
        background: 'var(--surface-sunken)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--ua-radius-control)',
        color: 'var(--text-primary)',
        ...style,
      }}
      {...props}
    />
  ),
);

Input.displayName = 'Input';
