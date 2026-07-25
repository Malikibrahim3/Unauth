'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, style, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'w-full px-3 text-sm focus:outline-none transition-colors duration-[var(--ua-duration-fast)]',
        'focus:bg-[var(--ua-surface-primary)] focus:border-[var(--ua-text-primary)] focus:ring-[var(--ua-shadow-focus)]',
        className,
      )}
      style={{
        height: 'var(--ua-control-height-input)',
        background: 'var(--ua-surface-primary)',
        border: '1px solid var(--ua-border-default)',
        borderRadius: 'var(--ua-radius-control)',
        color: 'var(--ua-text-primary)',
        ...style,
      }}
      {...props}
    />
  ),
);

Input.displayName = 'Input';
