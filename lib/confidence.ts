export type ConfidenceGradeValue = 'A' | 'B' | 'C' | 'D' | 'F';

export const CONFIDENCE_GRADE_COPY: Record<
  ConfidenceGradeValue,
  { label: string; shortLabel: string; description: string }
> = {
  A: {
    label: 'Definite',
    shortLabel: 'Definite',
    description: 'Multiple strong identity signals point to the same person or ring.',
  },
  B: {
    label: 'Probable',
    shortLabel: 'Probable',
    description: 'Strong evidence with enough corroboration for analyst review.',
  },
  C: {
    label: 'Possible',
    shortLabel: 'Possible',
    description: 'Some shared signals, but weaker or less complete evidence.',
  },
  D: {
    label: 'Weak',
    shortLabel: 'Weak',
    description: 'Low-signal match that should not be treated as a strong identity link.',
  },
  F: {
    label: 'No signal',
    shortLabel: 'None',
    description: 'Insufficient identity evidence.',
  },
};

export function scoreToGrade(score: number): ConfidenceGradeValue {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 45) return 'D';
  return 'F';
}

export function riskLevelToNewGrade(level: string | null | undefined): ConfidenceGradeValue {
  switch ((level ?? '').toLowerCase()) {
    case 'definite':
    case 'confirmed':
    case 'critical':
      return 'A';
    case 'probable':
    case 'high':
      return 'B';
    case 'possible':
    case 'candidate':
    case 'medium':
      return 'C';
    case 'weak':
    case 'low':
      return 'D';
    case 'none':
    case 'insufficient':
      return 'F';
    default:
      return 'F';
  }
}
