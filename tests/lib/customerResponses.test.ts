import { buildCustomerResponse, customerResponseContainsInternalTerm } from '@/lib/claims/customerResponses';

describe('customer response templates', () => {
  it.each([
    [{ decision: 'denied', outcome: 'suspected_fraud' }, 'unable to approve'],
    [{ decision: 'approved', outcome: 'legitimate' }, 'approved it'],
    [{ decision: 'full_refund', outcome: 'recovered' }, 'approved it'],
    [{ decision: 'partial_refund', outcome: 'pending' }, 'waiting for additional'],
    [{ decision: 'escalated', outcome: 'pending' }, 'still reviewing'],
    [{ decision: 'chargeback_disputed', outcome: 'pending' }, 'still reviewing'],
    [{ decision: 'no_action', outcome: 'legitimate' }, 'no further action is being taken'],
    [{ decision: 'no_action', outcome: 'suspected_fraud' }, 'no further action is being taken'],
    [{ status: 'pending' }, 'waiting for additional delivery information'],
  ])('renders safe language for %j', (input, expected) => {
    const text = buildCustomerResponse(input);
    expect(text).toContain(expected);
    expect(customerResponseContainsInternalTerm(text)).toBe(false);
  });
});
