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
    height: 'var(--badge-height-sm)',
    paddingLeft: 'var(--space-1)',
    paddingRight: 'var(--space-1)',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.02em',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
    borderRadius: 'var(--badge-radius)',
  },
  md: {
    height: 'var(--badge-height-md)',
    paddingLeft: 'var(--space-2)',
    paddingRight: 'var(--space-2)',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.02em',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
    borderRadius: 'var(--badge-radius)',
  },
};

const CHIP_STYLES: Record<BadgeTone, { background: string; color: string; border: string }> = {
  neutral: { background: 'var(--surface-sunken)', color: 'var(--text-secondary)', border: 'var(--border)' },
  info: { background: 'var(--privacy-fill)', color: 'var(--privacy-ink)', border: 'var(--privacy-border)' },
  accent: { background: 'var(--copper-glow)', color: 'var(--accent)', border: 'var(--accent-soft)' },
  success: { background: 'var(--sev-clear-fill)', color: 'var(--neutral)', border: 'var(--risk-low-bd)' },
  warning: { background: 'var(--sev-probable-fill)', color: 'var(--warning)', border: 'var(--risk-high-bd)' },
  danger: { background: 'var(--sev-definite-fill)', color: 'var(--risk-critical-fg)', border: 'var(--risk-critical-bd)' },
  critical: { background: 'var(--risk-critical)', color: 'white', border: 'var(--risk-critical)' },
};

const SOLID_STYLES: Record<BadgeTone, { background: string; color: string }> = {
  neutral: { background: 'var(--surface-sunken)', color: 'var(--text-primary)' },
  info: { background: 'var(--privacy-ink)', color: 'white' },
  accent: { background: 'var(--accent)', color: 'white' },
  success: { background: 'var(--neutral)', color: 'var(--text-primary)' },
  warning: { background: 'var(--warning)', color: 'white' },
  danger: { background: 'var(--risk-critical)', color: 'white' },
  critical: { background: 'var(--risk-critical)', color: 'white' },
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
