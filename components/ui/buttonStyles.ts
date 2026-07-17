import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import type { ButtonSize, ButtonVariant } from './Button';

const BUTTON_BASE =
  'ua-jitter inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors duration-[var(--duration-fast)] focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed select-none';

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
  primary: 'hover:bg-[var(--ua-accent-hover)] active:bg-[var(--ua-accent-hover)]',
  cta: 'hover:bg-[var(--ua-accent-hover)] active:bg-[var(--ua-accent-hover)]',
  secondary: 'hover:bg-[var(--surface-hover)] active:bg-[var(--surface-sunken)]',
  ghost: 'hover:bg-[var(--surface-hover)] active:bg-[var(--surface-sunken)]',
  danger: 'hover:opacity-90 active:opacity-80',
  link: 'underline-offset-4 hover:underline p-0',
};

function buttonVariantStyle(variant: ButtonVariant): CSSProperties {
  switch (variant) {
    case 'primary':
      return {
        background: 'var(--ua-accent)',
        color: 'white',
        border: '1px solid var(--ua-accent)',
      };
    // Lime brand CTA — sparing: marketing CTAs, "New X" marquee actions.
    case 'cta':
      return {
        background: 'var(--ua-accent)',
        color: 'var(--ua-accent-fg)',
        border: '1px solid var(--ua-accent)',
        fontWeight: 600,
      };
    case 'secondary':
      return { background: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' };
    case 'ghost':
      return { background: 'transparent', color: 'var(--text-secondary)' };
    case 'danger':
      return { background: 'var(--risk-critical)', color: 'white', border: '1px solid var(--risk-critical)' };
    case 'link':
      return { background: 'transparent', color: 'var(--text-secondary)' };
  }
}

export function getButtonPresentation(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  className?: string,
  style?: CSSProperties,
) {
  const isLink = variant === 'link';
  const sz = BUTTON_SIZES[size];
  return {
    className: cn(BUTTON_BASE, BUTTON_VARIANT_CLASSES[variant], className),
    style: {
      height: isLink ? undefined : sz.height,
      paddingLeft: isLink ? undefined : sz.px,
      paddingRight: isLink ? undefined : sz.px,
      fontSize: sz.fontSize,
        borderRadius: isLink ? undefined : 'var(--ua-radius-control)',
      minWidth: isLink ? undefined : 'fit-content',
      ...buttonVariantStyle(variant),
      ...style,
    } as CSSProperties,
    iconSizeClass: BUTTON_ICON_SIZES[size],
    isLink,
  };
}
