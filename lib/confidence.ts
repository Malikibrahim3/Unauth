export type ConfidenceGradeValue = 'A' | 'B' | 'C' | 'D' | 'F';

export function scoreToGrade(score: number): ConfidenceGradeValue {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 45) return 'D';
  return 'F';
}

export function riskLevelToNewGrade(level: string | null | undefined): ConfidenceGradeValue {
  switch ((level ?? '').toLowerCase()) {
    case 'critical': return 'F';
    case 'high': return 'D';
    case 'medium': return 'C';
    case 'low': return 'B';
    default: return 'C';
  }
}
