import type { CSSProperties } from 'react';

export function confidenceBadgeShellStyle(input: {
  compact: boolean;
  fill: string;
  fg: string;
  dashed: boolean;
}): CSSProperties {
  const { compact, fill, fg, dashed } = input;
  return {
    width: compact ? 20 : 96,
    height: compact ? 20 : 22,
    borderRadius: 'var(--radius-sm)',
    background: fill,
    color: fg,
    border: `1px ${dashed ? 'dashed' : 'solid'} color-mix(in srgb, ${fg} 40%, transparent)`,
    borderLeft: `3px solid ${fg}`,
    boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${fg} 18%, transparent)`,
  };
}

export const CONFIDENCE_BADGE_GRADE_STYLE: CSSProperties = {
  fontSize: 12,
  lineHeight: 1,
};

export const CONFIDENCE_BADGE_LABEL_STYLE: CSSProperties = {
  color: 'var(--ink-secondary)',
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: '0.01em',
  lineHeight: 1,
};
