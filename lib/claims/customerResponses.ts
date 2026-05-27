export const INTERNAL_CUSTOMER_RESPONSE_TERMS = [
  'fraud',
  'suspected fraud',
  'suspected_fraud',
  'fraud pattern',
  'cross-merchant',
  'cross-merchant match',
  'watchlist',
  'linked identity',
  'abuse',
];

type ResponseInput = {
  decision?: string | null;
  outcome?: string | null;
  status?: string | null;
};

export function buildCustomerResponse(input: ResponseInput): string {
  const decision = input.decision ?? '';
  const outcome = input.outcome ?? '';
  const status = input.status ?? '';

  if (status === 'pending' || decision === 'escalated' || outcome === 'pending') {
    return "We're still reviewing your claim and waiting for additional delivery information. We'll update you as soon as this review is complete.";
  }

  if (decision === 'no_action') {
    return "We've reviewed the information available and no further action is being taken at this time. If you have additional evidence, please reply and we'll review it.";
  }

  if (decision === 'approved' || decision === 'full_refund' || decision === 'partial_refund') {
    return "We've reviewed your claim and approved it. Our team will process the next step shortly.";
  }

  if (outcome === 'customer_verified' || outcome === 'legitimate') {
    return "We've reviewed your claim and the information available supports it. Our team will process the next step shortly.";
  }

  if (decision === 'denied' || decision === 'blacklist' || outcome === 'suspected_fraud') {
    return "We've reviewed the information available for this order and we're unable to approve this claim at this time. If you have additional evidence, please reply with it and we'll review again.";
  }

  return "We're still reviewing your claim and waiting for additional delivery information. We'll update you as soon as this review is complete.";
}

export function customerResponseContainsInternalTerm(response: string): boolean {
  const lower = response.toLowerCase();
  return INTERNAL_CUSTOMER_RESPONSE_TERMS.some((term) => lower.includes(term));
}
