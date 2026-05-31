'use client';

import { type ConfidenceGradeValue } from '@/lib/confidence';
import { letterGradeTone } from '@/lib/utils/confidenceStyles';

interface ConfidenceBadgeProps {
  grade: ConfidenceGradeValue;
  /** Accepted for source compatibility; never rendered (no numeric score). */
  score?: number;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

const GRADE_LABEL: Record<ConfidenceGradeValue, string> = {
  A: 'Grade A — definite identity match',
  B: 'Grade B — probable identity match',
  C: 'Grade C — possible identity match',
  D: 'Grade D — weak match signals',
  F: 'Grade F — insufficient signals',
};

export function ConfidenceBadge({
  grade,
  size = 'md',
  showLabel = true,
}: ConfidenceBadgeProps) {
  const tone = letterGradeTone(grade);
  const title = GRADE_LABEL[grade] ?? GRADE_LABEL.F;

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
      )}
    </span>
  );

  return badge;
}

export type { ConfidenceGradeValue };
