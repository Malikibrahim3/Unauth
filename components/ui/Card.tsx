'use client';

import { type ReactNode, type CSSProperties, type ElementType } from 'react';
import { cn } from '@/lib/utils';

export type CardVariant = 'panel' | 'muted' | 'overlay' | 'plain';
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
  /** A bordered working surface on the canvas. Flat — elevation is for overlays. */
  panel: {
    background: 'var(--ua-surface-primary)',
    border: '1px solid var(--ua-border-default)',
    boxShadow: 'var(--ua-shadow-none)',
  },
  /** A recessed group inside a panel. */
  muted: {
    background: 'var(--ua-surface-muted)',
    border: '1px solid var(--ua-border-subtle)',
    boxShadow: 'var(--ua-shadow-none)',
  },
  /** A floating surface — the only variant that lifts. */
  overlay: {
    background: 'var(--ua-surface-primary)',
    border: '1px solid var(--ua-border-default)',
    boxShadow: 'var(--ua-shadow-overlay)',
  },
  /** No chrome; the caller owns the surface. */
  plain: {
    background: 'transparent',
    border: '0',
    boxShadow: 'var(--ua-shadow-none)',
  },
};

const CARD_PADDING: Record<CardDensity, string> = {
  compact: 'var(--ua-space-3)',
  default: 'var(--ua-space-4)',
  relaxed: 'var(--ua-space-5)',
};

export function Card({
  children,
  variant = 'panel',
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
      className={cn('ua-card rounded-[var(--ua-radius-surface)]', className)}
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
