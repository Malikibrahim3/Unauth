'use client';

import { type ButtonHTMLAttributes, forwardRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { BUTTON_ICON_SIZES, getButtonPresentation } from './buttonStyles';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leadingIcon?: ReactNode;
}

const Spinner = ({ size }: { size: ButtonSize }) => (
  <svg
    className={`animate-spin ${BUTTON_ICON_SIZES[size]}`}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
    />
  </svg>
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
        {loading ? (
          <Spinner size={size} />
        ) : leadingIcon ? (
          <span className={cn('shrink-0', iconSizeClass)} aria-hidden="true">
            {leadingIcon}
          </span>
        ) : null}
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';
