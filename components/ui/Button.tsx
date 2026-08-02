'use client';

import { type ButtonHTMLAttributes, forwardRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { getButtonPresentation } from './buttonStyles';
import { Spinner, type SpinnerSize } from './Spinner';

const SPINNER_SIZE: Record<ButtonSize, SpinnerSize> = { sm: 'sm', md: 'md', lg: 'lg' };

/*
 * Instrument Grade: `primary` is the ordinary accent forward action;
 * `commit` is the neutral near-black high-stakes action for financial
 * decisions, irreversible workflow steps, and confirmation. A region must not
 * show both at equal emphasis.
 */
export type ButtonVariant = 'primary' | 'commit' | 'secondary' | 'ghost' | 'danger' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leadingIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = 'primary', size = 'md', loading = false, leadingIcon, className, children, disabled, style, ...props },
    ref,
  ) => {
    const { className: buttonClassName, style: buttonStyle, iconSizeClass } = getButtonPresentation(
      variant,
      size,
      className,
      style,
      Boolean(disabled) && !loading,
    );

    return (
      <button
        type="button"
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={buttonClassName}
        style={buttonStyle}
        {...props}
      >
        <span className={cn('inline-flex items-center gap-2', loading && 'invisible')}>
          {leadingIcon ? <span className={cn('shrink-0', iconSizeClass)} aria-hidden="true">{leadingIcon}</span> : null}
          {children}
        </span>
        {loading ? (
          <span className="absolute inset-0 inline-flex items-center justify-center" aria-hidden="true">
            <Spinner size={SPINNER_SIZE[size]} label="" />
          </span>
        ) : null}
      </button>
    );
  },
);
Button.displayName = 'Button';
