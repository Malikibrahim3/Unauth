'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, style, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'w-full px-3 py-2 text-sm focus:outline-none transition-colors',
        'focus:border-[var(--accent)] focus:ring-[var(--shadow-focus)]',
        className,
      )}
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

Input.displayName = 'Input';
