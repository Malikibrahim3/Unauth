/**
 * SINGLE SOURCE OF TRUTH — Confidence grade UI styles
 * Import these mappings from here, never define them in components.
 *
 * Grades map to certainty (green = definite), not fraud severity.
 * See ARCHITECTURE.md and CLAUDE.md for the full rules.
 */
import type { ConfidenceGrade } from '@/lib/engine/weights';
import type { ConfidenceGradeValue } from '@/lib/confidence';

export const GRADE_COLOURS: Record<ConfidenceGrade, string> = {
  definite: 'var(--sev-clear)',
  probable: 'var(--sev-probable)',
  possible: 'var(--sev-neutral)',
  weak: 'var(--ink-tertiary)',
};

export const GRADE_FILL_COLOURS: Record<ConfidenceGrade, string> = {
  definite: 'var(--sev-clear-fill)',
  probable: 'var(--sev-probable-fill)',
  possible: 'var(--sev-neutral-fill)',
  weak: 'var(--surface-muted)',
};

export const GRADE_LABELS: Record<ConfidenceGrade, string> = {
  definite: 'Definite',
  probable: 'Probable',
  possible: 'Possible',
  weak: 'Weak',
};

const LETTER_TO_GRADE: Record<ConfidenceGradeValue, ConfidenceGrade> = {
  A: 'definite',
  B: 'probable',
  C: 'possible',
  D: 'weak',
  F: 'weak',
};

export type LetterGradeTone = {
  label: string;
  fg: string;
  fill: string;
  dashed?: boolean;
};

/** Letter badges (A–F) used in tables and profile headers. */
export function letterGradeTone(grade: string): LetterGradeTone {
  const letter = grade.toUpperCase() as ConfidenceGradeValue;
  const mapped = LETTER_TO_GRADE[letter] ?? 'weak';
  const fg = GRADE_COLOURS[mapped];
  const fill = GRADE_FILL_COLOURS[mapped];
  const label = GRADE_LABELS[mapped];
  return {
    label,
    fg,
    fill,
    dashed: letter === 'D' || letter === 'F',
  };
}

export function riskLevelGradeTone(riskLevel: string): LetterGradeTone {
  const normalized = riskLevel.toLowerCase();
  if (normalized === 'definite') return letterGradeTone('A');
  if (normalized === 'probable') return letterGradeTone('B');
  if (normalized === 'possible' || normalized === 'candidate') return letterGradeTone('C');
  return letterGradeTone('D');
}
