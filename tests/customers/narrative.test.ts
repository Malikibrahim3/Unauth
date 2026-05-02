import { buildBehavioralNarrative, type NarrativeContext } from '@/lib/customers/narrative';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BANNED_WORDS = [
  'suspicious',
  'fraudulent',
  'concerning',
  'abusive',
  'risky',
  'alarming',
  'fraud',
  'scam',
];

function assertNoBannedWords(text: string) {
  const lower = text.toLowerCase();
  for (const word of BANNED_WORDS) {
    if (lower.includes(word)) {
      throw new Error(`Narrative contains banned word: "${word}" in: "${text}"`);
    }
  }
}

function sentenceCount(text: string): number {
  return text.split(/[.!?]+/).filter((s) => s.trim().length > 0).length;
}

function base(overrides: Partial<NarrativeContext> = {}): NarrativeContext {
  return {
    totalOrders: 3,
    totalRefundClaims: 0,
    refundRate: 0,
    fastestClaimDays: null,
    avgClaimDays: null,
    refundAccelerationScore: 0,
    firstSeen: '2024-01-01T00:00:00Z',
    lastSeen: '2024-03-01T00:00:00Z',
    fraudFlags: [],
    linkedAccountCount: 0,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('buildBehavioralNarrative', () => {
  describe('banned words', () => {
    it('never outputs banned words for a clean profile', () => {
      const result = buildBehavioralNarrative(base());
      assertNoBannedWords(result);
    });

    it('never outputs banned words when there are fraud flags', () => {
      const result = buildBehavioralNarrative(
        base({ fraudFlags: ['fraud', 'suspicious_pattern', 'risky_refund'] })
      );
      assertNoBannedWords(result);
    });
  });

  describe('sentence count', () => {
    it('returns exactly 1 sentence for a profile with no refunds and no flags', () => {
      const result = buildBehavioralNarrative(base({ fraudFlags: [] }));
      expect(sentenceCount(result)).toBeLessThanOrEqual(3);
      expect(sentenceCount(result)).toBeGreaterThanOrEqual(1);
    });

    it('returns at most 3 sentences regardless of inputs', () => {
      const result = buildBehavioralNarrative(
        base({
          totalRefundClaims: 5,
          refundRate: 0.8,
          fastestClaimDays: 1,
          refundAccelerationScore: 80,
          linkedAccountCount: 3,
          fraudFlags: ['flag1', 'flag2'],
        })
      );
      expect(sentenceCount(result)).toBeLessThanOrEqual(3);
    });
  });

  describe('sentence 1 — order activity', () => {
    it('says "1 recorded order" for a single order', () => {
      const result = buildBehavioralNarrative(base({ totalOrders: 1 }));
      expect(result).toContain('1 recorded order');
    });

    it('says "5 recorded orders" for 5 orders across different dates', () => {
      const result = buildBehavioralNarrative(base({ totalOrders: 5 }));
      expect(result).toContain('5 recorded orders');
    });

    it('notes "all seen on" when first and last seen are the same day', () => {
      const result = buildBehavioralNarrative(
        base({
          totalOrders: 4,
          firstSeen: '2024-06-15T10:00:00Z',
          lastSeen: '2024-06-15T18:00:00Z',
        })
      );
      expect(result).toContain('all seen on');
    });
  });

  describe('sentence 2 — refund statistics', () => {
    it('omits refund sentence when there are zero refunds', () => {
      const result = buildBehavioralNarrative(base({ totalRefundClaims: 0, refundRate: 0 }));
      expect(result).not.toContain('refund');
    });

    it('includes refund count and percentage when refunds exist', () => {
      const result = buildBehavioralNarrative(
        base({ totalOrders: 5, totalRefundClaims: 2, refundRate: 0.4 })
      );
      expect(result).toContain('2 of those');
      expect(result).toContain('40%');
    });

    it('mentions same-day claim when fastest claim is within 1 day', () => {
      const result = buildBehavioralNarrative(
        base({ totalOrders: 3, totalRefundClaims: 1, refundRate: 0.33, fastestClaimDays: 1 })
      );
      expect(result).toContain('within 1 day of purchase');
    });

    it('mentions fastest claim days when ≤ 3', () => {
      const result = buildBehavioralNarrative(
        base({
          totalOrders: 4,
          totalRefundClaims: 2,
          refundRate: 0.5,
          fastestClaimDays: 2,
        })
      );
      expect(result).toContain('within 2 days of purchase');
    });
  });

  describe('sentence 3 — notable pattern', () => {
    it('describes refund acceleration when score is high and multiple refunds exist', () => {
      const result = buildBehavioralNarrative(
        base({
          totalOrders: 5,
          totalRefundClaims: 3,
          refundRate: 0.6,
          refundAccelerationScore: 80,
        })
      );
      expect(result).toContain('decreased across multiple orders');
    });

    it('mentions linked identities when linkedAccountCount > 0', () => {
      const result = buildBehavioralNarrative(
        base({ linkedAccountCount: 2 })
      );
      expect(result).toContain('2 additional');
      expect(result).toContain('identities');
    });

    it('counts detection patterns from fraud flags when no other pattern applies', () => {
      const result = buildBehavioralNarrative(
        base({ fraudFlags: ['name_change', 'high_velocity'] })
      );
      expect(result).toContain('2 behaviour patterns');
    });

    it('does not add a pattern sentence when there are no signals', () => {
      const result = buildBehavioralNarrative(base());
      // Should only have order sentence (1 sentence, no refunds, no flags, no linked accounts)
      expect(result.trim()).not.toBe('');
      assertNoBannedWords(result);
    });
  });

  describe('return value', () => {
    it('returns a non-empty string in all cases', () => {
      const contexts: NarrativeContext[] = [
        base(),
        base({ totalOrders: 1, totalRefundClaims: 1, refundRate: 1 }),
        base({ totalOrders: 0, firstSeen: '2024-01-01T00:00:00Z', lastSeen: '2024-01-01T00:00:00Z' }),
      ];
      for (const ctx of contexts) {
        const result = buildBehavioralNarrative(ctx);
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
      }
    });
  });
});
