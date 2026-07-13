import { allowedOutcomes, merchantDecisionSchema } from '@/lib/claims/decision/merchantDecision';

describe('merchant payout decision contract', () => {
  it.each([
    ['approved', 'loss'],
    ['full_refund', 'pending'],
    ['chargeback_disputed', 'chargeback_won'],
    ['no_action', 'legitimate'],
  ] as const)('accepts %s with %s', (decision, outcome) => {
    expect(merchantDecisionSchema.safeParse({ decision, outcome, notes: null }).success).toBe(true);
  });

  it.each([
    ['approved', 'chargeback_won'],
    ['denied', 'chargeback_won'],
    ['escalated', 'recovered'],
    ['partial_refund', 'legitimate'],
  ] as const)('rejects invalid pair %s with %s', (decision, outcome) => {
    expect(merchantDecisionSchema.safeParse({ decision, outcome, notes: 'Reviewed' }).success).toBe(false);
  });

  it.each(['denied', 'escalated', 'internal_watch'] as const)('requires rationale for %s', (decision) => {
    const outcome = allowedOutcomes(decision)[0];
    expect(merchantDecisionSchema.safeParse({ decision, outcome, notes: '  ' }).success).toBe(false);
    expect(merchantDecisionSchema.safeParse({ decision, outcome, notes: 'Policy requirement not met.' }).success).toBe(true);
  });
});
