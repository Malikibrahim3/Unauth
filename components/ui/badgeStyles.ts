import type { CSSProperties } from 'react';

type BadgeTone =
  | 'neutral'
  | 'info'
  | 'accent'
  | 'success'
  | 'warning'
  | 'danger'
  | 'critical';

type BadgeSize = 'sm' | 'md';

export const BADGE_LAYOUT_STYLE: Record<BadgeSize, CSSProperties> = {
  sm: {
    height: 16,
    paddingLeft: '5px',
    paddingRight: '5px',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.02em',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
    borderRadius: 3,
  },
  md: {
    height: 18,
    paddingLeft: '7px',
    paddingRight: '7px',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.02em',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
    borderRadius: 3,
  },
};

const CHIP_STYLES: Record<BadgeTone, { background: string; color: string; border: string }> = {
  neutral: { background: 'var(--surface-muted)', color: 'var(--ink-secondary)', border: 'var(--surface-border)' },
  info: { background: 'var(--privacy-fill)', color: 'var(--privacy-ink)', border: 'var(--privacy-border)' },
  accent: { background: 'var(--copper-glow)', color: 'var(--copper-bright)', border: 'var(--copper-dim)' },
  success: { background: 'var(--sev-clear-fill)', color: 'var(--sev-clear)', border: 'var(--risk-low-bd)' },
  warning: { background: 'var(--sev-probable-fill)', color: 'var(--sev-probable)', border: 'var(--risk-high-bd)' },
  danger: { background: 'var(--sev-definite-fill)', color: 'var(--sev-definite)', border: 'var(--risk-critical-bd)' },
  critical: { background: 'var(--sev-definite-fill)', color: 'var(--sev-definite)', border: 'var(--sev-definite)' },
};

const SOLID_STYLES: Record<BadgeTone, { background: string; color: string }> = {
  neutral: { background: 'var(--surface-muted)', color: 'var(--ink-primary)' },
  info: { background: 'var(--privacy-ink)', color: 'var(--ink-inverse)' },
  accent: { background: 'var(--copper-bright)', color: 'var(--ink-inverse)' },
  success: { background: 'var(--sev-clear)', color: 'var(--ink-primary)' },
  warning: { background: 'var(--sev-probable)', color: 'var(--ink-inverse)' },
  danger: { background: 'var(--sev-definite)', color: 'var(--ink-primary)' },
  critical: { background: 'var(--sev-definite)', color: 'var(--ink-primary)' },
};

export function badgeToneStyle(
  tone: BadgeTone,
  variant: 'solid' | 'subtle' | 'outline',
): CSSProperties {
  const solidStyle = SOLID_STYLES[tone];
  const subtleStyle = CHIP_STYLES[tone];
  if (variant === 'solid') {
    return { background: solidStyle.background, color: solidStyle.color, border: '1px solid transparent' };
  }
  if (variant === 'outline') {
    return { background: 'transparent', color: subtleStyle.color, border: `1px solid ${subtleStyle.border}` };
  }
  return {
    background: subtleStyle.background,
    color: subtleStyle.color,
    border: `1px solid ${subtleStyle.border}`,
  };
}
