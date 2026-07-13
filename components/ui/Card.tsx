'use client';

import { type ReactNode, type CSSProperties } from 'react';
import { cn } from '@/lib/utils';

export type CardVariant = 'raised' | 'overlay' | 'flat';
export type CardDensity = 'compact' | 'default' | 'relaxed';

interface CardProps {
  children: ReactNode;
  variant?: CardVariant;
  density?: CardDensity;
  className?: string;
  style?: CSSProperties;
}

const CARD_STYLES: Record<CardVariant, CSSProperties> = {
  raised: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    boxShadow: 'none',
  },
  overlay: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    boxShadow: 'var(--shadow-overlay)',
  },
  flat: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
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
  className,
  style,
}: CardProps) {
  const padding = CARD_PADDING[density];
  return (
    <div
      className={cn('rounded-[var(--radius-md)]', className)}
      style={{
        ...CARD_STYLES[variant],
        padding,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
