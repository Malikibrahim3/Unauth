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

/*
 * Sentence case to match StatusBadge — these read as words, not shouted caps.
 *
 * Geometry is split by family (§6.3, §6.7): a *status* keeps the round pill so
 * it reads as a state, while generic metadata and source labels take the control
 * radius. When everything was round, status, metadata and filters were
 * indistinguishable at a glance — six pills on one card meaning three different
 * things.
 */
export const BADGE_LAYOUT_STYLE: Record<BadgeSize, CSSProperties> = {
  sm: {
    height: 'var(--ua-badge-height-sm)',
    paddingLeft: 'var(--ua-space-1)',
    paddingRight: 'var(--ua-space-1)',
    fontSize: 11,
    fontWeight: 500,
    whiteSpace: 'nowrap',
    borderRadius: 'var(--ua-badge-radius-meta)',
  },
  md: {
    height: 'var(--ua-badge-height)',
    paddingLeft: 'var(--ua-space-2)',
    paddingRight: 'var(--ua-space-2)',
    fontSize: 12,
    fontWeight: 500,
    whiteSpace: 'nowrap',
    borderRadius: 'var(--ua-badge-radius-meta)',
  },
};

const CHIP_STYLES: Record<BadgeTone, { background: string; color: string; border: string }> = {
  neutral: { background: 'var(--ua-surface-muted)', color: 'var(--ua-text-secondary)', border: 'var(--ua-border-default)' },
  info: { background: 'var(--ua-privacy-bg)', color: 'var(--ua-privacy)', border: 'var(--ua-privacy-border)' },
  accent: { background: 'var(--ua-surface-selected)', color: 'var(--ua-text-primary)', border: 'var(--ua-border-default)' },
  success: { background: 'var(--ua-severity-clear-bg)', color: 'var(--ua-neutral)', border: 'var(--ua-risk-low-border)' },
  warning: { background: 'var(--ua-severity-probable-bg)', color: 'var(--ua-warning)', border: 'var(--ua-risk-high-border)' },
  danger: { background: 'var(--ua-severity-definite-bg)', color: 'var(--ua-risk-critical)', border: 'var(--ua-risk-critical-border)' },
  critical: { background: 'var(--ua-risk-critical)', color: 'var(--ua-text-inverse)', border: 'var(--ua-risk-critical)' },
};

const SOLID_STYLES: Record<BadgeTone, { background: string; color: string }> = {
  neutral: { background: 'var(--ua-surface-muted)', color: 'var(--ua-text-primary)' },
  info: { background: 'var(--ua-privacy)', color: 'var(--ua-text-inverse)' },
  accent: { background: 'var(--ua-action-primary)', color: 'var(--ua-action-primary-fg)' },
  success: { background: 'var(--ua-neutral)', color: 'var(--ua-text-inverse)' },
  warning: { background: 'var(--ua-warning)', color: 'var(--ua-text-inverse)' },
  danger: { background: 'var(--ua-risk-critical)', color: 'var(--ua-text-inverse)' },
  critical: { background: 'var(--ua-risk-critical)', color: 'var(--ua-text-inverse)' },
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
