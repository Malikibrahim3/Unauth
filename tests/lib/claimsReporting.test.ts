import { buildClaimOpsMetrics } from '@/lib/claims/reporting';

describe('claims reporting metrics', () => {
  it('calculates claim operations counts and value at risk', () => {
    const now = new Date('2026-05-27T12:00:00.000Z');
    const metrics = buildClaimOpsMetrics([
      { id: 'c1', status: 'open', amount_at_risk: 100, submitted_at: '2026-05-23T10:00:00.000Z' },
      { id: 'c2', status: 'under_review', amount_at_risk: 200, submitted_at: '2026-05-26T10:00:00.000Z' },
      { id: 'c4', status: 'evidence_requested', amount_at_risk: 75, submitted_at: '2026-05-26T12:00:00.000Z' },
      { id: 'c3', status: 'resolved', amount_at_risk: 50, submitted_at: '2026-05-20T10:00:00.000Z' },
    ], [
      { claim_id: 'c3', decision: 'denied', outcome: 'loss', amount_refunded: 0, amount_recovered: 0, followed_recommendation: true, updated_at: '2026-05-21T10:00:00.000Z' },
      { claim_id: 'c2', decision: 'approved', outcome: 'recovered', amount_refunded: 25, amount_recovered: 10, followed_recommendation: false, updated_at: '2026-05-26T11:00:00.000Z' },
    ], now);

    expect(metrics.totalClaims).toBe(4);
    expect(metrics.openClaims).toBe(1);
    expect(metrics.inReviewOrPendingClaims).toBe(2);
    expect(metrics.evidenceRequestedClaims).toBe(1);
    expect(metrics.resolvedClaims).toBe(1);
    expect(metrics.deniedClaims).toBe(1);
    expect(metrics.approvedClaims).toBe(1);
    expect(metrics.recoveredOutcomes).toBe(1);
    expect(metrics.lossOutcomes).toBe(1);
    expect(metrics.recommendationCount).toBe(2);
    expect(metrics.followedRecommendations).toBe(1);
    expect(metrics.recommendationFollowThroughRate).toBe(0.5);
    expect(metrics.valueAtRisk).toBe(425);
    expect(metrics.amountRefunded).toBe(25);
    expect(metrics.amountRecovered).toBe(10);
    expect(metrics.overdueClaims).toBe(1);
  });
});
