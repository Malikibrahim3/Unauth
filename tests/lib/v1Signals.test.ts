import { crossMerchantSummary, humanizeClaimHistorySignals, humanizeFraudFlags } from '@/lib/api/v1/signals';

describe('v1 signals', () => {
  it('humanizes known claim history signals', () => {
    const labels = humanizeClaimHistorySignals(['inrAbuse', 'address_clustering']);
    expect(labels).toContain('High item-not-received claim velocity');
    expect(labels).toContain('Address cluster identified');
  });

  it('keeps the deprecated humanizeFraudFlags alias working', () => {
    expect(humanizeFraudFlags(['inrAbuse'])).toEqual(
      humanizeClaimHistorySignals(['inrAbuse'])
    );
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
