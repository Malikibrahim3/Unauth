'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { ButtonSize } from './Button';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon: ReactNode;
  size?: ButtonSize;
}
export function IconButton({ label, icon, size = 'md', className, title, ...props }: IconButtonProps) {
  return (
    <button type="button" aria-label={label} title={title} className={cn('ua-icon-button', `ua-icon-button--${size}`, className)} {...props}>
      <span aria-hidden="true">{icon}</span>
    </button>
  );
}
