/**
 * SINGLE SOURCE OF TRUTH — Confidence grade UI styles
 * Import these mappings from here, never define them in components.
 *
 * See ARCHITECTURE.md and CLAUDE.md for the full rules.
 */
import type { ConfidenceGrade } from '@/lib/engine/weights';

export const GRADE_COLOURS: Record<ConfidenceGrade, string> = {
  definite: 'var(--sev-definite)',
  probable: 'var(--sev-probable)',
  possible: 'var(--sev-possible)',
  weak: 'var(--sev-neutral)',
};

export const GRADE_LABELS: Record<ConfidenceGrade, string> = {
  definite: 'Definite',
  probable: 'Probable',
  possible: 'Possible',
  weak: 'Weak',
};
