'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, style, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'w-full px-3 text-sm focus:outline-none transition-colors duration-[120ms]',
        'focus:border-[var(--copper-bright)] focus:ring-[var(--shadow-focus)]',
        className,
      )}
      style={{
        height: 36,
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

Input.displayName = 'Input';
