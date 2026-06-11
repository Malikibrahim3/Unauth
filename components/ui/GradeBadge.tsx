'use client';

import { type ConfidenceGradeValue } from '@/lib/confidence';
import { letterGradeTone } from '@/lib/utils/confidenceStyles';
import {
  gradeBadgeShellStyle,
  GRADE_BADGE_LETTER_STYLE,
  GRADE_BADGE_LABEL_STYLE,
} from '@/components/ui/GradeBadge.styles';
import { cn } from '@/lib/utils';

interface GradeBadgeProps {
  grade: ConfidenceGradeValue;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  compact?: boolean;
  className?: string;
  title?: string;
}

export function GradeBadge({
  grade,
  size = 'md',
  showLabel = false,
  compact = false,
  className,
  title,
}: GradeBadgeProps) {
  const tone = letterGradeTone(grade);
  const defaultTitle = `Identity confidence: ${grade} — ${tone.label}`;

  return (
    <span
      className={cn('inline-flex items-center font-mono tabular-nums', className)}
      title={title ?? defaultTitle}
      style={gradeBadgeShellStyle({ size, fill: tone.fill, fg: tone.fg, dashed: tone.dashed ?? false })}
    >
      <span style={GRADE_BADGE_LETTER_STYLE}>{grade}</span>
      {!compact && showLabel && (
        <span style={GRADE_BADGE_LABEL_STYLE}>{tone.label}</span>
      )}
    </span>
  );
}

export type { ConfidenceGradeValue };
