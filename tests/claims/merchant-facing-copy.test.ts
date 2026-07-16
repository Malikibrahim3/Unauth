import { humanizeEvidenceKey } from '@/components/claims/payout/payoutCopy';
import { sanitizeMerchantText } from '@/app/(app)/claims/claimsPageData';
import { formatPayoutRecommendationRuleLine } from '@/lib/payouts/recommendation';

const RAW_ENUM = /[a-z]+_[a-z]+/;

describe('merchant-facing payout copy', () => {
  it('does not leak snake_case evidence keys or recommendation labels', () => {
    expect(humanizeEvidenceKey('proof_of_delivery')).not.toMatch(RAW_ENUM);
    expect(sanitizeMerchantText('Gather proof_of_delivery before review.')).not.toMatch(RAW_ENUM);
    expect(formatPayoutRecommendationRuleLine({
      action: 'request_customer_evidence',
      ruleName: 'Delivery review',
      ruleId: 'rule-1',
      explanation: 'Evidence is incomplete.',
      openRecovery: false,
      requestedEvidence: ['proof of delivery'],
    })).not.toMatch(/→|↗|[a-z]+_[a-z]+/);
  });
});
