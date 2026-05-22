import type { CustomerIntelligence } from '@/types/customer';
import { cn } from '@/lib/utils';

export type ConfidenceGradeValue = 'A' | 'B' | 'C' | 'D' | 'F';

interface ConfidenceBadgeProps {
  grade: ConfidenceGradeValue;
  score?: number;
  size?: 'sm' | 'md';
  customerIntelligence?: CustomerIntelligence;
}

const GRADE_META: Record<ConfidenceGradeValue, { fg: string; fill: string; label: string; bar: string; }> = {
  A: { fg: 'text-sev-definite', fill: 'bg-sev-definite-fill', label: 'DEFINITE', bar: 'border-sev-definite' },
  B: { fg: 'text-sev-probable', fill: 'bg-sev-probable-fill', label: 'PROBABLE', bar: 'border-sev-probable' },
  C: { fg: 'text-sev-neutral', fill: 'bg-sev-neutral-fill', label: 'POSSIBLE', bar: 'border-sev-neutral' },
  D: { fg: 'text-sev-neutral/70', fill: 'bg-sev-neutral-fill', label: 'WEAK', bar: 'border-sev-neutral/70' },
  F: { fg: 'text-sev-neutral/60', fill: 'bg-sev-neutral-fill', label: 'WEAK', bar: 'border-sev-neutral/60' },
};

export function ConfidenceBadge({ grade, score, size = 'md' }: ConfidenceBadgeProps) {
  const meta = GRADE_META[grade];
  if (size === 'sm') {
    return (
      <span
        className={cn(
          'inline-flex h-5 items-center rounded-sm border-l-4 px-2',
          'border border-l-4 t-label',
          meta.fg,
          meta.fill,
          meta.bar,
        )}
      >
        {grade}
        {score != null && <span className="ml-1 t-mono text-current">{score}</span>}
      </span>
    );
  }

  return (
    <span className={cn('inline-flex items-center rounded-sm border px-2 py-1 t-label', meta.fill, meta.fg, meta.bar)}>
      <span className="mr-2 border-r border-current pr-2">{grade}</span>
      <span>{meta.label}</span>
      {score != null && <span className="ml-2 t-mono text-current">{score}</span>}
    </span>
  );
}
