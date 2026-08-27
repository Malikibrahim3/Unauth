'use client';
import type { CSSProperties, ElementType, ReactNode } from 'react';
import { cn } from '@/lib/utils';
export type CardVariant = 'panel' | 'muted' | 'overlay' | 'plain'; export type CardDensity = 'compact' | 'default' | 'relaxed';
export function Card({ children, variant = 'panel', density = 'default', as: Component = 'div', unstyled = false, className, ...props }: { children: ReactNode; variant?: CardVariant; density?: CardDensity; as?: ElementType; unstyled?: boolean; className?: string; style?: CSSProperties; [key: string]: unknown }) { return <Component className={cn('ua-card', `ua-card--${variant}`, unstyled ? 'ua-card--unstyled' : `ua-card--density-${density}`, className)} data-material={variant === 'panel' ? 'ledger-sheet' : undefined} {...props}>{children}</Component>; }

export interface CardHeaderProps {
  title: string;
  description?: ReactNode;
  eyebrow?: string;
  total?: ReactNode;
  action?: ReactNode;
  disclosure?: ReactNode;
  separated?: boolean;
  className?: string;
}

/** The single card/panel header composition — title, optional eyebrow/description/total/action/disclosure. */
export function CardHeader({ title, description, eyebrow, total, action, disclosure, separated = true, className }: CardHeaderProps) {
  return (
    <div className={cn('ua-card__header', separated && 'ua-card__header--separated', className)}>
      <div className="ua-card__header-heading">
        {eyebrow ? <span className="ua-text-eyebrow">{eyebrow}</span> : null}
        <h3 className="ua-card__header-title ua-text-working-title">{title}</h3>
        {description ? <p className="ua-card__header-description ua-text-caption-role">{description}</p> : null}
      </div>
      {total ? <div className="ua-card__header-total ua-text-kpi">{total}</div> : null}
      {action ? <div className="ua-card__header-action">{action}</div> : null}
      {disclosure ? <div className="ua-card__header-disclosure">{disclosure}</div> : null}
    </div>
  );
}
