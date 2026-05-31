import { riskLevelToNewGrade, type ConfidenceGradeValue } from '@/lib/confidence';

export type IdentityConfidenceGrade = 'weak' | 'possible' | 'probable' | 'definite';

const GRADE_RANK: Record<IdentityConfidenceGrade, number> = {
  weak: 1,
  possible: 2,
  probable: 3,
  definite: 4,
};

const GRADE_FLOOR_SCORE: Record<IdentityConfidenceGrade, number> = {
  weak: 25,
  possible: 45,
  probable: 65,
  definite: 85,
};

export type IdentityConfidenceTransaction = {
  identity_score?: number | null;
  identity_confidence_grade?: string | null;
  identity_match_score?: number | null;
  identity_match_grade?: string | null;
};

export function normalizeIdentityConfidenceGrade(
  value: string | null | undefined,
): IdentityConfidenceGrade | null {
  switch ((value ?? '').trim().toLowerCase()) {
    case 'a':
    case 'confirmed':
    case 'definite':
      return 'definite';
    case 'b':
    case 'probable':
      return 'probable';
    case 'c':
    case 'candidate':
    case 'possible':
      return 'possible';
    case 'd':
    case 'weak':
      return 'weak';
    default:
      return null;
  }
}

function gradeFromScore(score: number): IdentityConfidenceGrade | null {
  if (score >= GRADE_FLOOR_SCORE.definite) return 'definite';
  if (score >= GRADE_FLOOR_SCORE.probable) return 'probable';
  if (score >= GRADE_FLOOR_SCORE.possible) return 'possible';
  if (score > 0) return 'weak';
  return null;
}

function strongestGrade(
  current: IdentityConfidenceGrade | null,
  candidate: IdentityConfidenceGrade | null,
): IdentityConfidenceGrade | null {
  if (!candidate) return current;
  if (!current) return candidate;
  return GRADE_RANK[candidate] > GRADE_RANK[current] ? candidate : current;
}

function finiteScore(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : null;
}

export function deriveProfileIdentityConfidence(
  profile: {
    identity_confidence_grade?: string | null;
    profile_confidence?: number | null;
    emails?: unknown;
    phones?: unknown;
    addresses?: unknown;
    card_last4s?: unknown;
  },
  transactions: IdentityConfidenceTransaction[],
): {
  grade: IdentityConfidenceGrade | null;
  score: number;
  letter: ConfidenceGradeValue;
} {
  let grade = normalizeIdentityConfidenceGrade(profile.identity_confidence_grade);
  let score = finiteScore(profile.profile_confidence) ?? 0;
  const emailCount = Array.isArray(profile.emails) ? profile.emails.filter(Boolean).length : 0;
  const phoneCount = Array.isArray(profile.phones) ? profile.phones.filter(Boolean).length : 0;
  const addressCount = Array.isArray(profile.addresses) ? profile.addresses.filter(Boolean).length : 0;
  const cardCount = Array.isArray(profile.card_last4s) ? profile.card_last4s.filter(Boolean).length : 0;

  if (emailCount > 1 && (phoneCount > 0 || cardCount > 0)) {
    grade = strongestGrade(grade, 'definite');
    score = Math.max(score, GRADE_FLOOR_SCORE.definite);
  } else if (emailCount > 1 && addressCount > 0) {
    grade = strongestGrade(grade, 'probable');
    score = Math.max(score, GRADE_FLOOR_SCORE.probable);
  } else if (phoneCount > 0 && addressCount > 0) {
    grade = strongestGrade(grade, 'probable');
    score = Math.max(score, GRADE_FLOOR_SCORE.probable);
  }

  for (const tx of transactions) {
    const txScore = finiteScore(tx.identity_score ?? tx.identity_match_score);
    if (txScore != null) {
      score = Math.max(score, txScore);
      grade = strongestGrade(grade, gradeFromScore(txScore));
    }

    grade = strongestGrade(
      grade,
      normalizeIdentityConfidenceGrade(tx.identity_confidence_grade ?? tx.identity_match_grade),
    );
  }

  if (grade) {
    score = Math.max(score, GRADE_FLOOR_SCORE[grade]);
  }

  return {
    grade,
    score: Math.round(score),
    letter: grade ? riskLevelToNewGrade(grade) : 'F',
  };
}
