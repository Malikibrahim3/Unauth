import type { CSSProperties } from 'react';

const SIZE_MAP = {
  sm: { height: 24, fontSize: 11, gap: 4, px: 4 },
  md: { height: 32, fontSize: 13, gap: 6, px: 8 },
  lg: { height: 40, fontSize: 15, gap: 6, px: 8 },
} as const;

export function gradeBadgeShellStyle(input: {
  size: 'sm' | 'md' | 'lg';
  fill: string;
  fg: string;
  dashed: boolean;
}): CSSProperties {
  const s = SIZE_MAP[input.size];
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: `${s.gap}px`,
    height: `${s.height}px`,
    paddingLeft: `${s.px}px`,
    paddingRight: `${s.px}px`,
    borderRadius: 'var(--radius-md)',
    background: input.fill,
    color: input.fg,
    border: `2px solid ${input.fg}`,
    boxShadow: `inset 0 1px 3px color-mix(in srgb, ${input.fg} 12%, transparent)`,
    fontSize: `${s.fontSize}px`,
    fontWeight: 700,
    lineHeight: 1,
    whiteSpace: 'nowrap',
  };
}

export const GRADE_BADGE_LETTER_STYLE: CSSProperties = {
  fontWeight: 700,
  fontSize: 'inherit',
  lineHeight: 1,
};

export const GRADE_BADGE_LABEL_STYLE: CSSProperties = {
  fontSize: 'inherit',
  fontWeight: 600,
  letterSpacing: '0.02em',
  textTransform: 'uppercase',
  lineHeight: 1,
  color: 'inherit',
};
