'use client';
import type { CSSProperties, ElementType, ReactNode } from 'react';
export type CardVariant = 'panel' | 'muted' | 'overlay' | 'plain'; export type CardDensity = 'compact' | 'default' | 'relaxed';
export function Card({ children, variant = 'panel', density = 'default', as: Component = 'div', unstyled = false, className: _className, style, ...props }: { children: ReactNode; variant?: CardVariant; density?: CardDensity; as?: ElementType; unstyled?: boolean; className?: string; style?: CSSProperties; [key: string]: unknown }) {
  const padding = unstyled ? 0 : density === 'compact' ? 12 : density === 'relaxed' ? 20 : 16;
  return <Component style={{ boxSizing: 'border-box', border: variant === 'plain' ? 0 : '1px solid #e4e3e0', borderRadius: 12, background: variant === 'muted' ? '#f4f3f1' : '#fff', padding, ...style }} data-material={variant === 'panel' ? 'ledger-sheet' : undefined} {...props}>{children}</Component>;
}

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
export function CardHeader({ title, description, eyebrow, total, action, disclosure, separated = true, className: _className }: CardHeaderProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }} data-separated={separated || undefined}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {eyebrow ? <span style={{ borderTop: '1px solid #e4e3e0' }}>{eyebrow}</span> : null}
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 12, margin: 0, color: '#1c1f23', fontSize: 13, fontWeight: 500, lineHeight: '20px' }}>{title}</h3>
        {description ? <p style={{ display: 'flex', alignItems: 'center', gap: 12, margin: 0, color: '#64686d', fontSize: 11.5, lineHeight: 1.45 }}>{description}</p> : null}
      </div>
      {total ? <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#1c1f23', fontSize: 20, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{total}</div> : null}
      {action ? <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>{action}</div> : null}
      {disclosure ? <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>{disclosure}</div> : null}
    </div>
  );
}
