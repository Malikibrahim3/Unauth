import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import type { ButtonSize, ButtonVariant } from './Button';

const BUTTON_BASE =
  'ua-jitter inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors duration-[var(--ua-duration-fast)] focus-visible:outline-none focus-visible:shadow-[var(--ua-shadow-focus)] disabled:cursor-not-allowed select-none';

// Disabled controls stay visibly inert through neutral surface and tertiary
// text rather than opacity-only treatment.
const DISABLED_STYLE: CSSProperties = {
  background: 'var(--ua-surface-muted)',
  color: 'var(--ua-text-tertiary)',
  border: '1px solid var(--ua-border-default)',
};

const BUTTON_SIZES: Record<ButtonSize, { height: string; px: string; fontSize: number }> = {
  sm: { height: 'var(--ua-control-height-sm)', px: 'var(--ua-control-padding-x-sm)', fontSize: 12 },
  md: { height: 'var(--ua-control-height-md)', px: 'var(--ua-control-padding-x-md)', fontSize: 13 },
  lg: { height: 'var(--ua-control-height-lg)', px: 'var(--ua-control-padding-x-lg)', fontSize: 14 },
};

export const BUTTON_ICON_SIZES: Record<ButtonSize, string> = {
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-4 h-4',
};

const BUTTON_VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'hover:bg-[var(--ua-action-primary-hover)] active:bg-[var(--ua-action-primary-hover)]',
  secondary: 'hover:bg-[var(--ua-surface-hover)] active:bg-[var(--ua-surface-muted)]',
  ghost: 'hover:bg-[var(--ua-surface-hover)] active:bg-[var(--ua-surface-muted)]',
  danger: 'hover:opacity-90 active:opacity-80',
  link: 'underline-offset-4 hover:underline p-0',
};

function buttonVariantStyle(variant: ButtonVariant): CSSProperties {
  switch (variant) {
    case 'primary':
      return {
        background: 'var(--ua-action-primary)',
        color: 'var(--ua-action-primary-fg)',
        border: '1px solid var(--ua-action-primary)',
      };
    case 'secondary':
      return { background: 'var(--ua-surface-primary)', color: 'var(--ua-text-primary)', border: '1px solid var(--ua-border-default)' };
    case 'ghost':
      return { background: 'transparent', color: 'var(--ua-text-secondary)' };
    case 'danger':
      return { background: 'var(--ua-risk-critical)', color: 'var(--ua-text-inverse)', border: '1px solid var(--ua-risk-critical)' };
    case 'link':
      return { background: 'transparent', color: 'var(--ua-text-secondary)' };
  }
}

export function getButtonPresentation(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  className?: string,
  style?: CSSProperties,
  disabled = false,
) {
  const isLink = variant === 'link';
  const sz = BUTTON_SIZES[size];
  // Inert disabled applies to filled variants only; link/ghost fall back to a
  // subtle opacity so they don't gain an out-of-place box.
  const inert = disabled && !isLink && variant !== 'ghost';
  return {
    className: cn(
      BUTTON_BASE,
      disabled ? '' : BUTTON_VARIANT_CLASSES[variant],
      !inert && disabled ? 'opacity-50' : '',
      className,
    ),
    style: {
      height: isLink ? undefined : sz.height,
      paddingLeft: isLink ? undefined : sz.px,
      paddingRight: isLink ? undefined : sz.px,
      fontSize: sz.fontSize,
        borderRadius: isLink ? undefined : 'var(--ua-radius-control)',
      minWidth: isLink ? undefined : 'fit-content',
      ...buttonVariantStyle(variant),
      ...(inert ? DISABLED_STYLE : null),
      ...style,
    } as CSSProperties,
    iconSizeClass: BUTTON_ICON_SIZES[size],
    isLink,
  };
}
