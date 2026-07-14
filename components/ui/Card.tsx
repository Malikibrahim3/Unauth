'use client';

import { type ReactNode, type CSSProperties, type ElementType } from 'react';
import { cn } from '@/lib/utils';

export type CardVariant = 'raised' | 'overlay' | 'flat' | 'muted' | 'inset' | 'plain';
export type CardDensity = 'compact' | 'default' | 'relaxed';

interface CardProps {
  children: ReactNode;
  variant?: CardVariant;
  density?: CardDensity;
  as?: ElementType;
  /** Use when the caller owns the content padding, as with a table shell. */
  unstyled?: boolean;
  className?: string;
  style?: CSSProperties;
  [key: string]: unknown;
}

const CARD_STYLES: Record<CardVariant, CSSProperties> = {
  raised: {
    background: 'var(--surface-raised)',
    border: '1px solid color-mix(in srgb, var(--border) 88%, var(--text-primary))',
    boxShadow: 'var(--ua-shadow-card)',
  },
  overlay: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    boxShadow: 'var(--ua-shadow-overlay)',
  },
  flat: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    boxShadow: 'none',
  },
  muted: {
    background: 'var(--surface-sunken)',
    border: '1px solid var(--border-muted)',
    boxShadow: 'none',
  },
  inset: {
    background: 'var(--surface-sunken)',
    border: '1px solid var(--border-muted)',
    boxShadow: 'none',
  },
  plain: {
    background: 'transparent',
    border: '0',
    boxShadow: 'none',
  },
};

const CARD_PADDING: Record<CardDensity, string> = {
  compact: 'var(--space-3)',
  default: 'var(--space-4)',
  relaxed: 'var(--space-5)',
};

export function Card({
  children,
  variant = 'raised',
  density = 'default',
  as: Component = 'div',
  unstyled = false,
  className,
  style,
  ...props
}: CardProps) {
  const padding = CARD_PADDING[density];
  return (
    <Component
      className={cn('rounded-[var(--ua-radius-card)]', className)}
      style={{
        ...CARD_STYLES[variant],
        ...(unstyled ? {} : { padding }),
        ...style,
      }}
      {...props}
    >
      {children}
    </Component>
  );
}
