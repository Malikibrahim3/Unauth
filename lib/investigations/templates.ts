import type {
  InvestigationRecommendation,
  InvestigationTarget,
} from '@/lib/investigations/types';

const TARGET_LABELS: Record<InvestigationTarget, string> = {
  carrier: 'carrier team',
  '3pl': 'fulfilment team',
  warehouse: 'warehouse team',
  supplier: 'supplier team',
  customer: 'customer',
  internal: 'internal team',
};

export function composeInvestigationRequest(input: {
  recommendation: InvestigationRecommendation;
  caseReference: string;
  orderReference?: string | null;
}): { subject: string; summary: string; body: string } {
  const target = input.recommendation.targetName
    ?? TARGET_LABELS[input.recommendation.targetType];
  const orderLine = input.orderReference
    ? `Order reference: ${input.orderReference}`
    : `Case reference: ${input.caseReference}`;
  const requested = input.recommendation.requestedEvidence.length > 0
    ? input.recommendation.requestedEvidence.map((item) => `- ${item.replaceAll('_', ' ')}`).join('\n')
    : '- A written finding and any supporting record';
  const subject = `Evidence request: ${input.orderReference ?? input.caseReference}`;
  const summary = `Ask ${target} to resolve: ${input.recommendation.evidenceGap}`;
  const body = [
    `Hello ${target},`,
    '',
    'We are reviewing a customer case and need to resolve one factual question:',
    input.recommendation.evidenceGap,
    '',
    orderLine,
    '',
    'Please provide:',
    requested,
    '',
    'Please reply with the available records, the person or team responding, and any relevant reference number.',
    '',
    'Thank you.',
  ].join('\n');
  return { subject, summary, body };
}

