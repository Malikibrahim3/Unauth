import { buildCustomerResponse, customerResponseContainsInternalTerm } from '@/lib/claims/customerResponses';

describe('customer response templates', () => {
  it('renders safe denied language', () => {
    const text = buildCustomerResponse({ decision: 'denied', outcome: 'suspected_fraud' });
    expect(text).toContain("unable to approve");
    expect(customerResponseContainsInternalTerm(text)).toBe(false);
  });

  it('renders safe approved language', () => {
    const text = buildCustomerResponse({ decision: 'approved', outcome: 'legitimate' });
    expect(text).toContain('approved it');
    expect(customerResponseContainsInternalTerm(text)).toBe(false);
  });

  it('renders pending language for pending status', () => {
    const text = buildCustomerResponse({ status: 'pending' });
    expect(text).toContain('waiting for additional delivery information');
    expect(customerResponseContainsInternalTerm(text)).toBe(false);
  });
});
