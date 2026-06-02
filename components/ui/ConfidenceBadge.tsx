'use client';

import { type ConfidenceGradeValue } from '@/lib/confidence';
import { letterGradeTone } from '@/lib/utils/confidenceStyles';
import {
  CONFIDENCE_BADGE_GRADE_STYLE,
  CONFIDENCE_BADGE_LABEL_STYLE,
  confidenceBadgeShellStyle,
} from '@/components/ui/ConfidenceBadge.styles';

interface ConfidenceBadgeProps {
  grade: ConfidenceGradeValue;
  /** Accepted for source compatibility; never rendered (no numeric score). */
  score?: number;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

const GRADE_LABEL: Record<ConfidenceGradeValue, string> = {
  A: 'Grade A - definite identity match',
  B: 'Grade B - probable identity match',
  C: 'Grade C - possible identity match',
  D: 'Grade D - weak match signals',
  F: 'Grade F - insufficient signals',
};

const GRADE_CELL_WIDTH: Record<'compact' | 'full', number> = {
  compact: 17,
  full: 24,
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
  const cellWidth = GRADE_CELL_WIDTH[compact ? 'compact' : 'full'];

  return (
    <span
      title={title}
      className="inline-flex items-center overflow-hidden font-mono tabular-nums"
      style={confidenceBadgeShellStyle({ compact, fill: tone.fill, fg: tone.fg, dashed: tone.dashed ?? false })}
    >
      <span
        className="flex h-full items-center justify-center font-semibold"
        style={{ ...CONFIDENCE_BADGE_GRADE_STYLE, width: cellWidth }}
      >
        {grade}
      </span>
      {!compact && (
        <span className="flex-1 truncate font-sans" style={CONFIDENCE_BADGE_LABEL_STYLE}>
          {label}
        </span>
      )}
    </span>
  );
}

export type { ConfidenceGradeValue };
