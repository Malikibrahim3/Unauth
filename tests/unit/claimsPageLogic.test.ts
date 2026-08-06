import { claimNextAction } from '@/app/(app)/cases/claimsPageLogic';
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
