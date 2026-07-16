'use client';

import { Loader2 } from 'lucide-react';
import { type ButtonHTMLAttributes, forwardRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { BUTTON_ICON_SIZES, getButtonPresentation } from './buttonStyles';

export type ButtonVariant = 'primary' | 'cta' | 'secondary' | 'ghost' | 'danger' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leadingIcon?: ReactNode;
}

const Spinner = ({ size }: { size: ButtonSize }) => (
  <Loader2 className={cn('animate-spin', BUTTON_ICON_SIZES[size])} aria-hidden="true" />
);

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
    );

    return (
      <button
        type="button"
        ref={ref}
        disabled={disabled || loading}
        className={buttonClassName}
        style={buttonStyle}
        {...props}
      >
        <span className={cn('inline-flex items-center gap-2', loading && 'invisible')} aria-hidden={loading || undefined}>
          {leadingIcon ? <span className={cn('shrink-0', iconSizeClass)} aria-hidden="true">{leadingIcon}</span> : null}
          {children}
        </span>
        {loading ? <span className="absolute inset-0 inline-flex items-center justify-center"><Spinner size={size} /></span> : null}
      </button>
    );
  },
);
Button.displayName = 'Button';
