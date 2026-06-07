import {
  computeWidgetReviewLevel,
  computeWidgetTrustSummary,
  type TrustSignalInput,
} from '@/lib/gorgias/widgetTrustSignals';

const base: TrustSignalInput = {
  orderCount: 0,
  claimCount: 0,
  claimRate: 0,
  recentClaimCount: 0,
  confidenceGrade: null,
  networkSignalAvailable: false,
  ce3EvidenceAvailable: false,
};

describe('computeWidgetReviewLevel', () => {
  it('returns established for ≥3 orders with no claims', () => {
    expect(computeWidgetReviewLevel({ ...base, orderCount: 3 })).toBe('established');
    expect(computeWidgetReviewLevel({ ...base, orderCount: 10 })).toBe('established');
  });

  it('returns standard for new customer with no claims', () => {
    expect(computeWidgetReviewLevel(base)).toBe('standard');
    expect(computeWidgetReviewLevel({ ...base, orderCount: 1 })).toBe('standard');
    expect(computeWidgetReviewLevel({ ...base, orderCount: 2 })).toBe('standard');
  });

  it('returns review_recommended for exactly 1 claim', () => {
    expect(computeWidgetReviewLevel({ ...base, orderCount: 5, claimCount: 1, claimRate: 0.2 })).toBe('review_recommended');
  });

  it('returns additional_review for ≥2 recent claims', () => {
    expect(computeWidgetReviewLevel({ ...base, orderCount: 5, claimCount: 2, claimRate: 0.4, recentClaimCount: 2 })).toBe('additional_review');
    expect(computeWidgetReviewLevel({ ...base, orderCount: 10, claimCount: 3, claimRate: 0.3, recentClaimCount: 3 })).toBe('additional_review');
  });

  it('returns additional_review for ≥50% claim rate with ≥2 claims', () => {
    expect(computeWidgetReviewLevel({ ...base, orderCount: 4, claimCount: 2, claimRate: 0.5, recentClaimCount: 1 })).toBe('additional_review');
    expect(computeWidgetReviewLevel({ ...base, orderCount: 3, claimCount: 2, claimRate: 0.67, recentClaimCount: 0 })).toBe('additional_review');
  });

  it('review_recommended takes priority over established when claims > 0', () => {
    // 3 orders, 1 claim — claim present means review_recommended not established
    expect(computeWidgetReviewLevel({ ...base, orderCount: 3, claimCount: 1, claimRate: 0.33 })).toBe('review_recommended');
  });
});

describe('computeWidgetTrustSummary', () => {
  it('established: shows order count with no claims', () => {
    const out = computeWidgetTrustSummary({ ...base, orderCount: 5 });
    expect(out).toBe('Established customer · 5 orders, no prior claims');
  });

  it('established: singular order word', () => {
    // 3 orders minimum for established, but let's check a specific case that hits the path
    const out = computeWidgetTrustSummary({ ...base, orderCount: 3 });
    expect(out).toContain('3 orders');
  });

  it('standard: new to store', () => {
    const out = computeWidgetTrustSummary(base);
    expect(out).toBe('Standard handling · new to this store');
  });

  it('standard: 1 order, no claims', () => {
    const out = computeWidgetTrustSummary({ ...base, orderCount: 1 });
    expect(out).toBe('Standard handling · 1 order at this store');
  });

  it('review_recommended: shows claim and order count', () => {
    const out = computeWidgetTrustSummary({ ...base, orderCount: 5, claimCount: 1, claimRate: 0.2 });
    expect(out).toBe('Review recommended · 1 claim from 5 orders');
  });

  it('review_recommended: includes last claim timing when lastClaimAt is provided', () => {
    const lastClaimAt = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const out = computeWidgetTrustSummary({ ...base, orderCount: 5, claimCount: 1, claimRate: 0.2, lastClaimAt });
    expect(out).toContain('Review recommended');
    expect(out).toMatch(/last \d+ (day|days|month|months) ago/);
  });

  it('additional_review: recent claims path includes timing', () => {
    const lastClaimAt = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    const out = computeWidgetTrustSummary({ ...base, orderCount: 5, claimCount: 3, claimRate: 0.6, recentClaimCount: 2, lastClaimAt });
    expect(out).toContain('Additional review recommended');
    expect(out).toContain('2 claims in last 90 days');
    expect(out).toMatch(/last \d+ days? ago/);
  });

  it('additional_review: high-rate path includes timing', () => {
    const lastClaimAt = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString();
    const out = computeWidgetTrustSummary({ ...base, orderCount: 4, claimCount: 2, claimRate: 0.5, recentClaimCount: 1, lastClaimAt });
    expect(out).toContain('Additional review recommended');
    expect(out).toContain('50% claim rate');
    expect(out).toMatch(/last .+ ago/);
  });

  it('does not include last timing when lastClaimAt is absent', () => {
    const out = computeWidgetTrustSummary({ ...base, orderCount: 5, claimCount: 1, claimRate: 0.2 });
    expect(out).not.toContain('last');
  });

  it('does not include last timing when lastClaimAt is null', () => {
    const out = computeWidgetTrustSummary({ ...base, orderCount: 5, claimCount: 1, claimRate: 0.2, lastClaimAt: null });
    expect(out).not.toContain('last');
  });

  it('established and standard levels never include last timing', () => {
    const lastClaimAt = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    const established = computeWidgetTrustSummary({ ...base, orderCount: 5, lastClaimAt });
    const standard = computeWidgetTrustSummary({ ...base, orderCount: 1, lastClaimAt });
    expect(established).not.toContain('last');
    expect(standard).not.toContain('last');
  });

  it('never contains blocked language', () => {
    const inputs: TrustSignalInput[] = [
      { ...base, orderCount: 5, claimCount: 3, claimRate: 0.6, recentClaimCount: 2 },
      { ...base, orderCount: 5, claimCount: 1, claimRate: 0.2 },
      { ...base, orderCount: 5 },
      base,
    ];
    const blocked = ['fraudster', 'blacklist', 'bad actor', 'deny', 'block'];
    for (const input of inputs) {
      const out = computeWidgetTrustSummary(input).toLowerCase();
      for (const word of blocked) {
        expect(out).not.toContain(word);
      }
    }
  });

  it('formatDaysAgo: today (same day)', () => {
    const lastClaimAt = new Date(Date.now() - 60 * 1000).toISOString();
    const out = computeWidgetTrustSummary({ ...base, orderCount: 5, claimCount: 1, claimRate: 0.2, lastClaimAt });
    expect(out).toContain('last today');
  });

  it('formatDaysAgo: 1 day ago', () => {
    const lastClaimAt = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    const out = computeWidgetTrustSummary({ ...base, orderCount: 5, claimCount: 1, claimRate: 0.2, lastClaimAt });
    expect(out).toContain('last 1 day ago');
  });
});
