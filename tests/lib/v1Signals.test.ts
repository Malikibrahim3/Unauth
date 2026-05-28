import { crossMerchantSummary, humanizeFraudFlags } from '@/lib/api/v1/signals';

describe('v1 signals', () => {
  it('humanizes known fraud flags', () => {
    const labels = humanizeFraudFlags(['inrAbuse', 'address_clustering']);
    expect(labels).toContain('High INR velocity');
    expect(labels).toContain('Address cluster detected');
  });

  it('omits cross-merchant block below k-anonymity threshold', () => {
    expect(crossMerchantSummary(2, 5, true)).toBeNull();
  });

  it('includes cross-merchant block at k-anonymity threshold', () => {
    expect(crossMerchantSummary(4, 6, true)).toEqual({
      merchant_count: 4,
      claim_count: 6,
      flagged: true,
    });
  });
});
