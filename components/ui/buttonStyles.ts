import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import type { ButtonSize, ButtonVariant } from './Button';

export const BUTTON_BASE =
  'inline-flex items-center justify-center gap-2 font-medium transition-colors duration-[120ms] focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed select-none';

export const BUTTON_SIZES: Record<ButtonSize, { height: number; px: string; fontSize: number }> = {
  sm: { height: 30, px: '10px', fontSize: 12 },
  md: { height: 34, px: '14px', fontSize: 13 },
  lg: { height: 38, px: '18px', fontSize: 14 },
};

export const BUTTON_ICON_SIZES: Record<ButtonSize, string> = {
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-4 h-4',
};

export const BUTTON_VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'hover:bg-[var(--accent-hover)] active:bg-[var(--accent-700)]',
  secondary: 'hover:bg-[var(--bg-hover)] active:bg-[var(--bg-surface-sunk)]',
  ghost: 'hover:bg-[var(--bg-hover)] active:bg-[var(--bg-surface-sunk)]',
  danger: 'hover:opacity-90 active:opacity-80',
  link: 'underline-offset-4 hover:underline p-0',
};

export function buttonVariantStyle(variant: ButtonVariant): CSSProperties {
  switch (variant) {
    case 'primary':
      return {
        background: 'var(--accent)',
        color: 'var(--ink-inverse)',
        border: '1px solid var(--accent)',
        boxShadow: 'inset 0 1px 0 rgba(240,235,227,0.18)',
      };
    case 'secondary':
      return { background: 'transparent', color: 'var(--ink-secondary)', border: '1px solid var(--surface-border)' };
    case 'ghost':
      return { background: 'transparent', color: 'var(--ink-secondary)' };
    case 'danger':
      return { background: 'var(--sev-definite)', color: 'var(--ink-primary)', border: '1px solid var(--sev-definite)' };
    case 'link':
      return { background: 'transparent', color: 'var(--text-muted)' };
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
      borderRadius: isLink ? undefined : 'var(--radius-md)',
      ...buttonVariantStyle(variant),
      ...style,
    } as CSSProperties,
    iconSizeClass: BUTTON_ICON_SIZES[size],
    isLink,
  };
}
