'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Spinner, type SpinnerSize } from './Spinner';

export type ButtonVariant = 'primary' | 'commit' | 'secondary' | 'ghost' | 'danger' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg';

export const BUTTON_CLASS: Record<ButtonVariant, string> = {
  primary: 'ua-button ua-button--primary',
  commit: 'ua-button ua-button--commit',
  secondary: 'ua-button ua-button--secondary',
  ghost: 'ua-button ua-button--ghost',
  danger: 'ua-button ua-button--danger',
  link: 'ua-button ua-button--link',
};

export const BUTTON_SIZE_CLASS: Record<ButtonSize, string> = {
  sm: 'ua-button--sm', md: 'ua-button--md', lg: 'ua-button--lg',
};

const SPINNER_SIZE: Record<ButtonSize, SpinnerSize> = { sm: 'sm', md: 'md', lg: 'lg' };

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leadingIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading = false, leadingIcon, className, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(BUTTON_CLASS[variant], BUTTON_SIZE_CLASS[size], className)}
      {...props}
    >
      {loading ? <Spinner size={SPINNER_SIZE[size]} label="" /> : leadingIcon ? <span className="ua-button__icon" aria-hidden="true">{leadingIcon}</span> : null}
      <span>{children}</span>
    </button>
  );
});
