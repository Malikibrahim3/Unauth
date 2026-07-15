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
    height: 'var(--ua-control-height-sm)',
    paddingLeft: 'var(--space-2)',
    paddingRight: 'var(--space-2)',
    fontSize: 12,
    fontWeight: 500,
    whiteSpace: 'nowrap',
    borderRadius: 'var(--ua-radius-control)',
  },
  md: {
    height: 'var(--ua-badge-height)',
    paddingLeft: 'var(--space-2)',
    paddingRight: 'var(--space-2)',
    fontSize: 12,
    fontWeight: 500,
    whiteSpace: 'nowrap',
    borderRadius: 'var(--ua-radius-control)',
  },
};

const CHIP_STYLES: Record<BadgeTone, { background: string; color: string; border: string }> = {
  neutral: { background: 'var(--surface-sunken)', color: 'var(--text-secondary)', border: 'var(--border)' },
  info: { background: 'var(--privacy-fill)', color: 'var(--privacy-ink)', border: 'var(--privacy-border)' },
  accent: { background: 'var(--surface-selected)', color: 'var(--text-primary)', border: 'var(--accent-border)' },
  success: { background: 'var(--sev-clear-fill)', color: 'var(--neutral)', border: 'var(--risk-low-bd)' },
  warning: { background: 'var(--sev-probable-fill)', color: 'var(--warning)', border: 'var(--risk-high-bd)' },
  danger: { background: 'var(--sev-definite-fill)', color: 'var(--risk-critical-fg)', border: 'var(--risk-critical-bd)' },
  critical: { background: 'var(--risk-critical)', color: 'var(--text-inverse)', border: 'var(--risk-critical)' },
};

const SOLID_STYLES: Record<BadgeTone, { background: string; color: string }> = {
  neutral: { background: 'var(--surface-sunken)', color: 'var(--text-primary)' },
  info: { background: 'var(--privacy-ink)', color: 'var(--text-inverse)' },
  accent: { background: 'var(--accent)', color: 'var(--text-inverse)' },
  success: { background: 'var(--neutral)', color: 'var(--text-primary)' },
  warning: { background: 'var(--warning)', color: 'var(--text-inverse)' },
  danger: { background: 'var(--risk-critical)', color: 'var(--text-inverse)' },
  critical: { background: 'var(--risk-critical)', color: 'var(--text-inverse)' },
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
