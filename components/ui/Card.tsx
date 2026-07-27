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
  return (
    <Component
      className={cn(
        'ua-card',
        `ua-card--${variant}`,
        !unstyled && `ua-card--density-${density}`,
        unstyled && 'ua-card--unstyled',
        className,
      )}
      style={style}
      {...props}
    >
      {children}
    </Component>
  );
}
