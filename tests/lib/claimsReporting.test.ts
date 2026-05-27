import { buildClaimOpsMetrics } from '@/lib/claims/reporting';

describe('claims reporting metrics', () => {
  it('calculates claim operations counts and value at risk', () => {
    const now = new Date('2026-05-27T12:00:00.000Z');
    const metrics = buildClaimOpsMetrics([
      { id: 'c1', status: 'open', amount_at_risk: 100, submitted_at: '2026-05-23T10:00:00.000Z' },
      { id: 'c2', status: 'under_review', amount_at_risk: 200, submitted_at: '2026-05-26T10:00:00.000Z' },
      { id: 'c3', status: 'resolved', amount_at_risk: 50, submitted_at: '2026-05-20T10:00:00.000Z' },
    ], [
      { claim_id: 'c3', decision: 'denied', outcome: 'suspected_fraud', amount_refunded: 0, updated_at: '2026-05-21T10:00:00.000Z' },
      { claim_id: 'c2', decision: 'approved', outcome: 'legitimate', amount_refunded: 25, updated_at: '2026-05-26T11:00:00.000Z' },
    ], now);

    expect(metrics.totalClaims).toBe(3);
    expect(metrics.openClaims).toBe(1);
    expect(metrics.inReviewOrPendingClaims).toBe(1);
    expect(metrics.resolvedClaims).toBe(1);
    expect(metrics.deniedClaims).toBe(1);
    expect(metrics.approvedClaims).toBe(1);
    expect(metrics.suspectedFraudOutcomes).toBe(1);
    expect(metrics.legitimateOutcomes).toBe(1);
    expect(metrics.valueAtRisk).toBe(350);
    expect(metrics.amountRefunded).toBe(25);
    expect(metrics.overdueClaims).toBe(1);
  });
});
