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
  neutral:  { background: 'var(--bg-surface-alt)',   color: 'var(--text-muted)',      border: 'var(--border-default)' },
  info:     { background: 'var(--info-bg)',           color: 'var(--info-fg)',          border: 'var(--info-bd)' },
  accent:   { background: 'var(--accent-soft)',       color: 'var(--accent)',           border: 'var(--accent-200)' },
  success:  { background: 'var(--risk-low-bg)',       color: 'var(--risk-low-fg)',      border: 'var(--risk-low-bd)' },
  warning:  { background: 'var(--risk-medium-bg)',    color: 'var(--risk-medium-fg)',   border: 'var(--risk-medium-bd)' },
  danger:   { background: 'var(--risk-critical-bg)',  color: 'var(--risk-critical-fg)', border: 'var(--risk-critical-bd)' },
  critical: { background: 'var(--brand-ink)',         color: 'var(--text-inverse)',     border: 'var(--brand-ink)' },
};

const SOLID_STYLES: Record<BadgeTone, { background: string; color: string }> = {
  neutral:  { background: 'var(--text-muted)',        color: 'var(--bg-surface-alt)' },
  info:     { background: 'var(--info-fg)',            color: 'var(--text-inverse)' },
  accent:   { background: 'var(--accent)',             color: 'var(--text-inverse)' },
  success:  { background: 'var(--risk-low-fg)',        color: 'var(--text-inverse)' },
  warning:  { background: 'var(--risk-medium-fg)',     color: 'var(--text-inverse)' },
  danger:   { background: 'var(--risk-critical-fg)',   color: 'var(--text-inverse)' },
  critical: { background: 'var(--brand-ink)',          color: 'var(--text-inverse)' },
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
