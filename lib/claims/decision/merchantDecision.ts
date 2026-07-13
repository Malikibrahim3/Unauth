import { z } from 'zod';

export const merchantDecisionValues = [
  'approved', 'denied', 'escalated', 'partial_refund', 'full_refund',
  'chargeback_disputed', 'internal_watch', 'no_action',
] as const;
export const merchantOutcomeValues = [
  'loss', 'recovered', 'pending', 'chargeback_won', 'chargeback_lost',
  'customer_verified', 'legitimate',
] as const;

export type MerchantDecision = typeof merchantDecisionValues[number];
export type MerchantOutcome = typeof merchantOutcomeValues[number];

export const allowedOutcomesByDecision: Record<MerchantDecision, readonly MerchantOutcome[]> = {
  approved: ['pending', 'loss', 'recovered', 'legitimate'],
  denied: ['pending', 'loss', 'legitimate'],
  escalated: ['pending'],
  partial_refund: ['pending', 'loss'],
  full_refund: ['pending', 'loss'],
  chargeback_disputed: ['pending', 'recovered', 'chargeback_won', 'chargeback_lost'],
  internal_watch: ['pending'],
  no_action: ['pending', 'legitimate'],
};

export function decisionRequiresRationale(decision: MerchantDecision): boolean {
  return decision === 'denied' || decision === 'escalated' || decision === 'internal_watch';
}

export const merchantDecisionSchema = z.object({
  decision: z.enum(merchantDecisionValues),
  outcome: z.enum(merchantOutcomeValues),
  notes: z.string().trim().max(4000).nullable().optional(),
}).superRefine((value, context) => {
  if (!allowedOutcomesByDecision[value.decision].includes(value.outcome)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['outcome'],
      message: `Outcome “${value.outcome}” is not valid for decision “${value.decision}”.`,
    });
  }
  if (decisionRequiresRationale(value.decision) && !value.notes?.trim()) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['notes'],
      message: 'A rationale is required for this decision.',
    });
  }
});

export function allowedOutcomes(decision: MerchantDecision): readonly MerchantOutcome[] {
  return allowedOutcomesByDecision[decision];
}
