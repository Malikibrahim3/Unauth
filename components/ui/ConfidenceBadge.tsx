'use client';

import { type ConfidenceGradeValue } from '@/lib/confidence';

interface ConfidenceBadgeProps {
  grade: ConfidenceGradeValue;
  /** Accepted for source compatibility; never rendered (no numeric score). */
  score?: number;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

const GRADE_TONE = {
  A: {
    fg: 'var(--sev-definite)',
    fill: 'var(--sev-definite-fill)',
    label: 'Definite',
    dashed: false,
  },
  B: {
    fg: 'var(--sev-probable)',
    fill: 'var(--sev-probable-fill)',
    label: 'Probable',
    dashed: false,
  },
  C: {
    fg: 'var(--sev-neutral)',
    fill: 'var(--sev-neutral-fill)',
    label: 'Possible',
    dashed: false,
  },
  D: {
    fg: 'color-mix(in srgb, var(--sev-neutral) 60%, transparent)',
    fill: 'var(--sev-neutral-fill)',
    label: 'Weak',
    dashed: true,
  },
  F: {
    fg: 'var(--ink-tertiary)',
    fill: 'var(--surface-muted)',
    label: 'Weak',
    dashed: true,
  },
} as const;

const GRADE_LABEL = {
  A: 'Grade A — definite identity match',
  B: 'Grade B — probable identity match',
  C: 'Grade C — possible identity match',
  D: 'Grade D — weak match signals',
  F: 'Grade F — insufficient signals',
} as const;

export function ConfidenceBadge({
  grade,
  size = 'md',
  showLabel = true,
}: ConfidenceBadgeProps) {
  const tone = GRADE_TONE[grade] ?? GRADE_TONE.F;
  const title = GRADE_LABEL[grade];

  const compact = size === 'sm' || !showLabel;
  const label = tone.label;
  const badge = (
    <span
      title={title}
      className="inline-flex items-center overflow-hidden font-mono tabular-nums"
      style={{
        width: compact ? 20 : 96,
        height: compact ? 20 : 22,
        borderRadius: 'var(--radius-sm)',
        background: tone.fill,
        color: tone.fg,
        border: `1px ${tone.dashed ? 'dashed' : 'solid'} color-mix(in srgb, ${tone.fg} 40%, transparent)`,
        borderLeft: `3px solid ${tone.fg}`,
        boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${tone.fg} 18%, transparent)`,
      }}
    >
      <span
        className="flex h-full items-center justify-center font-semibold"
        style={{
          width: compact ? 17 : 24,
          fontSize: 11,
          lineHeight: 1,
        }}
      >
        {grade}
      </span>
      {!compact && (
        <>
          <span
            className="flex-1 truncate font-sans"
            style={{
              color: 'var(--ink-secondary)',
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.01em',
              lineHeight: 1,
            }}
          >
            {label}
          </span>
        </>
      )}
    </span>
  );

  return badge;
}

export type { ConfidenceGradeValue };
