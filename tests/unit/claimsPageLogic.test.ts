import { buildCasesSummary, claimNextAction } from '@/app/(app)/cases/claimsPageLogic';
import type { ClaimQueueCounts } from '@/lib/claims/queueCounts';
import type { ClaimRow } from '@/app/(app)/cases/claimsPageData';

const claim = (status: ClaimRow['status']): ClaimRow => ({
  id: `claim-${status}`,
  customer_id: null,
  shop_domain: null,
  shopify_order_id: null,
  claim_type: 'missing_parcel',
  status,
  amount_at_risk: 128,
  currency: 'GBP',
  updated_at: '2026-07-31T12:00:00.000Z',
  next_action_reason: 'Evidence state: Request more customer evidence',
});

describe('claimNextAction workflow-state precedence', () => {
  it.each([
    {
      status: 'recovery_opened',
      evidenceStatus: 'Recovery in progress',
      reviewState:
        'Customer decision recorded. Monitor the recovery route for the next partner update.',
    },
    {
      status: 'decision_recorded',
      evidenceStatus: 'Customer decision recorded',
      reviewState: 'Customer action is complete. Open a recovery route or close the case.',
    },
  ])(
    'uses the $status workflow state instead of a stale next-action reason',
    ({ status, evidenceStatus, reviewState }) => {
      const result = claimNextAction(claim(status), null, 'user-1');

      expect(result).toMatchObject({ evidenceStatus, reviewState });
      expect(result.reviewState).not.toContain('Request more customer evidence');
    },
  );
});

describe('buildCasesSummary coverage truth', () => {
  const counts: ClaimQueueCounts = {
    total: 4, active: 3, unread: 0, assignedToMe: 0, unassigned: 3, overdue: 1,
    awaitingEvidence: 1, awaitingInfo: 1, awaitingCarrier: 0, awaiting3pl: 0,
    awaitingSupplier: 0, readyForDecision: 1, manualReview: 0, closed: 1,
    snoozed: 0, escalated: 0, resolved: 1, open: 1, underReview: 0,
  };
  const completeCoverage = Object.fromEntries(
    Object.keys(counts).map((key) => [key, 'complete']),
  ) as Record<keyof ClaimQueueCounts, 'complete'>;

  it('renders an uncertain zero as unavailable while retaining known positives', () => {
    const summary = buildCasesSummary({
      counts,
      coverageByMetric: { ...completeCoverage, unread: 'unavailable' },
      atRiskRows: [{ amount_at_risk: 125, currency: 'GBP' }],
      atRiskCoverage: 'partial',
    });
    expect(summary.unread).toEqual({ state: 'unavailable', label: 'Unavailable' });
    expect(summary.active.label).toBe('3');
    expect(summary.atRisk.label).toBe('£125.00 observed · partial');
  });

  it('qualifies a dominant-currency subtotal and excluded rows', () => {
    const summary = buildCasesSummary({
      counts,
      coverageByMetric: completeCoverage,
      atRiskRows: [
        { amount_at_risk: 125, currency: 'GBP' },
        { amount_at_risk: 25, currency: 'GBP' },
        { amount_at_risk: 40, currency: 'USD' },
      ],
      atRiskCoverage: 'complete',
    });
    expect(summary.atRisk.state).toBe('mixed_currency');
    expect(summary.atRisk.label).toBe('£150.00 in GBP · 1 case in other currencies excluded');
  });
});
