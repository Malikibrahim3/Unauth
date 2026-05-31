import {
  deriveProfileIdentityConfidence,
  normalizeIdentityConfidenceGrade,
} from '@/lib/customers/identityConfidence';

describe('customer identity confidence summary', () => {
  it('normalizes legacy and word grade values', () => {
    expect(normalizeIdentityConfidenceGrade('A')).toBe('definite');
    expect(normalizeIdentityConfidenceGrade('probable')).toBe('probable');
    expect(normalizeIdentityConfidenceGrade('candidate')).toBe('possible');
    expect(normalizeIdentityConfidenceGrade('low')).toBeNull();
  });

  it('uses identity evidence instead of behavioural risk score', () => {
    const result = deriveProfileIdentityConfidence(
      { identity_confidence_grade: null, profile_confidence: 1 },
      [
        {
          identity_score: 72,
          identity_confidence_grade: 'probable',
        },
      ],
    );

    expect(result.score).toBe(72);
    expect(result.grade).toBe('probable');
    expect(result.letter).toBe('B');
  });

  it('falls back to the profile confidence when no row-level identity score exists', () => {
    const result = deriveProfileIdentityConfidence(
      { identity_confidence_grade: 'possible', profile_confidence: 50 },
      [],
    );

    expect(result.score).toBe(50);
    expect(result.grade).toBe('possible');
    expect(result.letter).toBe('C');
  });

  it('uses aggregate Shopify/CSV profile continuity when row-level scores are absent', () => {
    const result = deriveProfileIdentityConfidence(
      {
        identity_confidence_grade: null,
        profile_confidence: 1,
        emails: ['simeonmurray123@gmail.com', 'simsorsno3@icloud.com'],
        phones: ['+447984249818'],
        addresses: ['234 Joyce Avenue, London, N18 2TS'],
      },
      [],
    );

    expect(result.score).toBe(85);
    expect(result.grade).toBe('definite');
    expect(result.letter).toBe('A');
  });
});
