import { computeEvidenceScore, type BehavioralSignals } from '@/lib/engine/evidence/score';
import {
  CLAIM_TYPE_SEVERITY,
  EVIDENCE_SCORING_CONFIG_VERSION,
} from '@/lib/engine/evidence/config';
import { CANONICAL_CLAIM_TYPES } from '@/lib/claims/claimTypes';

const base: BehavioralSignals = {
  network_claim_count: 0,
  network_merchant_count: 1,
  days_since_last_claim: null,
  claim_types: [],
  is_network_flagged: false,
};
const s = (o: Partial<BehavioralSignals> = {}): BehavioralSignals => ({ ...base, ...o });
const pts = (sig: BehavioralSignals, factor: string): number =>
  computeEvidenceScore(sig).breakdown.find((f) => f.factor === factor)!.points;

describe('computeEvidenceScore', () => {
  describe('network claim frequency tiers', () => {
    it.each([
      [0, 0],
      [1, 8],
      [2, 18],
      [3, 27],
      [4, 35],
      [50, 35],
    ])('count %i -> %i pts', (count, expected) => {
      expect(pts(s({ network_claim_count: count }), 'network_claim_frequency')).toBe(expected);
    });
  });

  describe('merchant breadth tiers', () => {
    it.each([
      [1, 0],
      [2, 12],
      [3, 20],
      [4, 25],
      [20, 25],
    ])('merchants %i -> %i pts', (merchants, expected) => {
      expect(pts(s({ network_merchant_count: merchants }), 'network_breadth')).toBe(expected);
    });
  });

  describe('recency cutoffs', () => {
    it.each([
      [0, 20],
      [7, 20],
      [8, 16],
      [30, 16],
      [31, 10],
      [90, 10],
      [91, 4],
      [400, 4],
    ])('days %i -> %i pts', (days, expected) => {
      expect(pts(s({ network_claim_count: 1, days_since_last_claim: days }), 'claim_recency')).toBe(expected);
    });

    it('null days -> 0 pts ("No claims on record")', () => {
      const r = computeEvidenceScore(s({ days_since_last_claim: null }));
      const f = r.breakdown.find((x) => x.factor === 'claim_recency')!;
      expect(f.points).toBe(0);
      expect(f.reason).toBe('No claims on record');
    });
  });

  describe('claim type severity', () => {
    it('awards the configured points for every canonical claim type', () => {
      for (const t of CANONICAL_CLAIM_TYPES) {
        expect(pts(s({ network_claim_count: 1, claim_types: [t] }), 'claim_severity')).toBe(
          CLAIM_TYPE_SEVERITY[t],
        );
      }
    });

    it('takes the single most severe type (max, not additive)', () => {
      expect(pts(s({ network_claim_count: 2, claim_types: ['damaged', 'chargeback'] }), 'claim_severity')).toBe(15);
    });

    it('treats unknown claim types as zero severity', () => {
      expect(pts(s({ network_claim_count: 1, claim_types: ['totally_unknown'] }), 'claim_severity')).toBe(0);
      // unknown alongside a known type does not suppress the known severity
      expect(pts(s({ network_claim_count: 1, claim_types: ['totally_unknown', 'chargeback'] }), 'claim_severity')).toBe(15);
    });

    it('empty claim_types -> 0 ("No claim types on record")', () => {
      const f = computeEvidenceScore(s({ network_claim_count: 1 })).breakdown.find((x) => x.factor === 'claim_severity')!;
      expect(f.points).toBe(0);
      expect(f.reason).toBe('No claim types on record');
    });
  });

  describe('network flag bonus', () => {
    it('adds the bonus when flagged, nothing otherwise', () => {
      expect(pts(s({ is_network_flagged: true }), 'network_flag')).toBe(5);
      expect(pts(s({ is_network_flagged: false }), 'network_flag')).toBe(0);
    });
  });

  describe('total score', () => {
    it('caps at 100 when every factor is maxed', () => {
      const r = computeEvidenceScore(
        s({
          network_claim_count: 10,
          network_merchant_count: 10,
          days_since_last_claim: 1,
          claim_types: [...CANONICAL_CLAIM_TYPES],
          is_network_flagged: true,
        }),
      );
      expect(r.evidence_score).toBe(100);
      expect(r.evidence_score).toBeLessThanOrEqual(100);
    });
  });

  describe('evidence level boundaries', () => {
    // Each constructed signal sums to the exact boundary score.
    it('19 -> minimal, 20 -> some', () => {
      // 8 (1 claim) + 4 (recency >90) + 2 (other) + 5 (flag) = 19
      const r19 = computeEvidenceScore(
        s({ network_claim_count: 1, days_since_last_claim: 120, claim_types: ['other'], is_network_flagged: true }),
      );
      expect(r19.evidence_score).toBe(19);
      expect(r19.evidence_level).toBe('minimal');
      // 8 (1 claim) + 12 (2 merchants) = 20
      const r20 = computeEvidenceScore(s({ network_claim_count: 1, network_merchant_count: 2 }));
      expect(r20.evidence_score).toBe(20);
      expect(r20.evidence_level).toBe('some');
    });

    it('44 -> some, 45 -> substantial', () => {
      // 35 (4 claims) + 9 (item_not_received) = 44
      const r44 = computeEvidenceScore(s({ network_claim_count: 4, claim_types: ['item_not_received'] }));
      expect(r44.evidence_score).toBe(44);
      expect(r44.evidence_level).toBe('some');
      // 35 (4 claims) + 10 (recency 60d) = 45
      const r45 = computeEvidenceScore(s({ network_claim_count: 4, days_since_last_claim: 60 }));
      expect(r45.evidence_score).toBe(45);
      expect(r45.evidence_level).toBe('substantial');
    });

    it('69 -> substantial, 70 -> extensive', () => {
      // 35 (4 claims) + 25 (4 merchants) + 9 (item_not_received) = 69
      const r69 = computeEvidenceScore(
        s({ network_claim_count: 4, network_merchant_count: 4, claim_types: ['item_not_received'] }),
      );
      expect(r69.evidence_score).toBe(69);
      expect(r69.evidence_level).toBe('substantial');
      // 35 + 25 + 10 (recency 60d) = 70
      const r70 = computeEvidenceScore(
        s({ network_claim_count: 4, network_merchant_count: 4, days_since_last_claim: 60 }),
      );
      expect(r70.evidence_score).toBe(70);
      expect(r70.evidence_level).toBe('extensive');
    });
  });

  describe('has_sufficient_data', () => {
    it('is false with zero claims and no flag, and forces level to minimal', () => {
      // Points exist (breadth + recency + severity) but data is insufficient.
      const r = computeEvidenceScore(
        s({ network_merchant_count: 5, days_since_last_claim: 5, claim_types: ['chargeback'] }),
      );
      expect(r.has_sufficient_data).toBe(false);
      expect(r.evidence_level).toBe('minimal');
    });

    it('is true when claims exist', () => {
      expect(computeEvidenceScore(s({ network_claim_count: 1 })).has_sufficient_data).toBe(true);
    });

    it('is true when only a watchlist flag exists', () => {
      const r = computeEvidenceScore(s({ network_claim_count: 0, is_network_flagged: true }));
      expect(r.has_sufficient_data).toBe(true);
    });
  });

  it('returns the config version', () => {
    expect(computeEvidenceScore(base).scoring_config_version).toBe(EVIDENCE_SCORING_CONFIG_VERSION);
    expect(EVIDENCE_SCORING_CONFIG_VERSION).toBe('v1.0');
  });

  it('never uses "risk" or "fraud" wording in output strings', () => {
    const scenarios: BehavioralSignals[] = [
      base,
      s({ network_claim_count: 3, network_merchant_count: 3, days_since_last_claim: 10, claim_types: ['chargeback', 'return_abuse'], is_network_flagged: true }),
      s({ network_claim_count: 1, claim_types: ['refund_request'] }),
    ];
    for (const sig of scenarios) {
      const text = computeEvidenceScore(sig)
        .breakdown.flatMap((f) => [f.label, f.reason])
        .join(' ');
      expect(text).not.toMatch(/risk|fraud/i);
    }
  });

  it('severity keys align exactly with the canonical claim-type list', () => {
    expect(Object.keys(CLAIM_TYPE_SEVERITY).sort()).toEqual([...CANONICAL_CLAIM_TYPES].sort());
  });
});
