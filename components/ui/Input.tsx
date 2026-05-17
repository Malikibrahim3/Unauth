'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, style, ...props }, ref) => (
    <input
      ref={ref}
      className={cn('w-full px-3 py-2 text-sm focus:outline-none', className)}
      style={{
        background: '#FAF6EF',
        border: '1px solid #D2C9B5',
        borderRadius: 4,
        color: 'var(--text)',
        ...style,
      }}
      {...props}
    />
  ),
);

Input.displayName = 'Input';
