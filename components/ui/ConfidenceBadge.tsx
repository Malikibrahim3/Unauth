'use client';

import { type ConfidenceGradeValue } from '@/lib/confidence';
import { GradeBadge } from '@/components/ui/GradeBadge';

interface ConfidenceBadgeProps {
  grade: ConfidenceGradeValue;
  /** Accepted for source compatibility; never rendered (no numeric score). */
  score?: number;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

export function ConfidenceBadge({
  grade,
  size = 'md',
  showLabel = true,
}: ConfidenceBadgeProps) {
  return (
    <GradeBadge
      grade={grade}
      size={size}
      showLabel={showLabel}
      compact={size === 'sm' || !showLabel}
    />
  );
}

export type { ConfidenceGradeValue };
