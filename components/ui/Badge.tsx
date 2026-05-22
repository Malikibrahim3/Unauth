import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type BadgeTone =
  | 'neutral'
  | 'info'
  | 'accent'
  | 'success'
  | 'warning'
  | 'danger'
  | 'critical';

export type BadgeVariant = 'solid' | 'subtle' | 'outline';
export type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  tone?: BadgeTone;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  children: ReactNode;
  className?: string;
}

const CHIP_STYLES: Record<BadgeTone, { background: string; color: string; border: string }> = {
  neutral:  { background: 'var(--surface-muted)',       color: 'var(--ink-secondary)',   border: 'var(--surface-border)' },
  info:     { background: 'var(--privacy-fill)',        color: 'var(--privacy-ink)',     border: 'var(--privacy-border)' },
  accent:   { background: 'var(--copper-glow)',         color: 'var(--copper-bright)',   border: 'var(--copper-dim)' },
  success:  { background: 'var(--sev-clear-fill)',      color: 'var(--sev-clear)',       border: 'var(--risk-low-bd)' },
  warning:  { background: 'var(--sev-probable-fill)',   color: 'var(--sev-probable)',    border: 'var(--risk-high-bd)' },
  danger:   { background: 'var(--sev-definite-fill)',   color: 'var(--sev-definite)',    border: 'var(--risk-critical-bd)' },
  critical: { background: 'var(--sev-definite-fill)',   color: 'var(--sev-definite)',    border: 'var(--sev-definite)' },
};

const SOLID_STYLES: Record<BadgeTone, { background: string; color: string }> = {
  neutral:  { background: 'var(--surface-muted)',    color: 'var(--ink-primary)' },
  info:     { background: 'var(--privacy-ink)',      color: 'var(--ink-inverse)' },
  accent:   { background: 'var(--copper-bright)',    color: 'var(--ink-inverse)' },
  success:  { background: 'var(--sev-clear)',        color: 'var(--ink-primary)' },
  warning:  { background: 'var(--sev-probable)',     color: 'var(--ink-inverse)' },
  danger:   { background: 'var(--sev-definite)',     color: 'var(--ink-primary)' },
  critical: { background: 'var(--sev-definite)',     color: 'var(--ink-primary)' },
};

export function Badge({
  tone = 'neutral',
  variant = 'subtle',
  size = 'md',
  dot = false,
  children,
  className,
}: BadgeProps) {
  const isSolid = variant === 'solid';
  const solidStyle = SOLID_STYLES[tone];
  const subtleStyle = CHIP_STYLES[tone];

  const inlineStyle = isSolid
    ? { background: solidStyle.background, color: solidStyle.color, border: `1px solid transparent` }
    : variant === 'outline'
    ? { background: 'transparent', color: subtleStyle.color, border: `1px solid ${subtleStyle.border}` }
    : { background: subtleStyle.background, color: subtleStyle.color, border: `1px solid ${subtleStyle.border}` };

  const height = size === 'sm' ? 16 : 18;
  const px = size === 'sm' ? '5px' : '7px';

  return (
    <span
      className={cn('inline-flex items-center gap-1 leading-none', className)}
      style={{
        height,
        paddingLeft: px,
        paddingRight: px,
        borderRadius: 3,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        ...inlineStyle,
      }}
    >
      {dot && (
        <span
          aria-hidden="true"
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ background: 'currentColor', opacity: 0.6 }}
        />
      )}
      {children}
    </span>
  );
}
