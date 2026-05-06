import { Badge } from './Badge';

export type ConfidenceGradeValue = 'A' | 'B' | 'C' | 'D' | 'F';

interface ConfidenceBadgeProps {
  grade: ConfidenceGradeValue;
  score?: number;
  size?: 'sm' | 'md';
}

const GRADE_TONE = {
  A: 'success',
  B: 'success',
  C: 'warning',
  D: 'danger',
  F: 'critical',
} as const;

const GRADE_LABEL = {
  A: 'Grade A — definite identity match',
  B: 'Grade B — probable identity match',
  C: 'Grade C — possible identity match',
  D: 'Grade D — weak match signals',
  F: 'Grade F — insufficient signals',
} as const;

export function ConfidenceBadge({ grade, score, size = 'md' }: ConfidenceBadgeProps) {
  const tone = GRADE_TONE[grade] ?? 'neutral';
  const title = score != null
    ? `Confidence grade ${grade} — ${score}/100. ${GRADE_LABEL[grade]}`
    : GRADE_LABEL[grade];

  return (
    <Badge tone={tone as 'success' | 'warning' | 'danger' | 'critical'} variant="subtle" size={size}>
      <span
        title={title}
        className="font-semibold num"
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {grade}
        {score != null && (
          <span className="ml-1 opacity-70 text-mono-sm">· {score}</span>
        )}
      </span>
    </Badge>
  );
}

/** Maps A–F grade from a numeric 0–100 score */
export function scoreToGrade(score: number): ConfidenceGradeValue {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 45) return 'D';
  return 'F';
}

/** Maps legacy risk level strings to identity match confidence grades (A–F) */
export function riskLevelToNewGrade(level: string | null | undefined): ConfidenceGradeValue {
  switch ((level ?? '').toLowerCase()) {
    case 'critical': return 'F';
    case 'high':     return 'D';
    case 'medium':   return 'C';
    case 'low':      return 'B';
    default:         return 'C';
  }
}
