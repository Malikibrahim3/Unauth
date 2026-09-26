import { createHash } from 'node:crypto';
import type { ClaimDecisionContext } from '@/lib/claims/decision/types';
import type { SupportPayoutCase } from '@/lib/payouts/types';
import type { RuleEvaluationResult } from '@/lib/rules-engine';
import { majorToMinor } from '@/lib/ui/merchantCopy';
import type { ReplacementReadModel } from '@/lib/claims/replacement';

export const RESOLUTION_COMPARISON_VERSION = 'resolution-comparison-v1' as const;
export const RESOLUTION_ACTIONS = [
  'full_refund',
  'partial_refund',
  'same_item_replacement',
  'request_evidence',
  'escalate',
  'no_additional_payout',
] as const;
export type ResolutionAction = (typeof RESOLUTION_ACTIONS)[number];

export type ResolutionCostComponent = {
  id: 'refund' | 'replacement_item' | 'replacement_shipping' | 'support_handling';
  label: string;
  state: 'known' | 'verified_zero' | 'estimated' | 'unavailable';
  amountMinor: number | null;
  currency: string | null;
  provenance: string;
};

export type ResolutionOption = {
  action: ResolutionAction;
  label: string;
  customerResolution: string;
  confirmable: boolean;
  unavailableReason: string | null;
  financial: boolean;
  costs: ResolutionCostComponent[];
  missingComponents: string[];
  policyRestrictions: string[];
  contradictions: string[];
  preparedNextAction: string;
};

export type ResolutionComparison = {
  version: typeof RESOLUTION_COMPARISON_VERSION;
  token: string;
  caseVersion: number;
  caseUpdatedAt: string | null;
  evidenceVersion: string;
  policyVersion: string;
  currency: string | null;
  recommendation: string;
  recommendationUncertainty: string;
  priorConcession: ClaimDecisionContext['priorConcessions'];
  recovery: {
    recoverability: string;
    likelyOwner: string;
    nextAction: string;
    deadline: null;
    note: string;
  };
  replacement: ReplacementReadModel | null;
  options: ResolutionOption[];
};

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => `${JSON.stringify(key)}:${stable(child)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function minor(amount: number | null, currency: string | null): number | null {
  if (amount == null || !currency) return null;
  try {
    return majorToMinor(amount, currency);
  } catch {
    return null;
  }
}

function component(
  id: ResolutionCostComponent['id'],
  label: string,
  amount: number | null,
  currency: string | null,
  provenance: string,
  estimated = false,
): ResolutionCostComponent {
  const amountMinor = minor(amount, currency);
  return {
    id,
    label,
    state: amountMinor == null ? 'unavailable' : amountMinor === 0 ? 'verified_zero' : estimated ? 'estimated' : 'known',
    amountMinor,
    currency: amountMinor == null ? null : currency,
    provenance,
  };
}

function option(input: Omit<ResolutionOption, 'missingComponents'>): ResolutionOption {
  return {
    ...input,
    missingComponents: input.costs.filter((cost) => cost.state === 'unavailable').map((cost) => cost.label),
  };
}

export function buildResolutionComparison(input: {
  context: ClaimDecisionContext;
  evaluation: RuleEvaluationResult;
  payoutCase: SupportPayoutCase;
  replacement?: ReplacementReadModel | null;
}): ResolutionComparison {
  const { context, evaluation, payoutCase, replacement = null } = input;
  const currency = context.claim.currency ?? context.order?.currency ?? null;
  const refund = component(
    'refund',
    'Refund amount',
    context.claim.costs.refundAmount,
    currency,
    'Recorded case refund amount',
  );
  const refundEstimate = refund.state === 'unavailable'
    ? component('refund', 'Refund amount', context.claim.amountAtRisk, currency, 'Case amount at risk; estimate only', true)
    : refund;
  const replacementItem = component(
    'replacement_item',
    'Replacement item cost',
    context.claim.costs.replacementItemValue,
    currency,
    'Recorded replacement estimate; order retail value is not used',
    true,
  );
  const replacementShipping = component(
    'replacement_shipping',
    'Replacement shipping cost',
    context.claim.costs.replacementShippingCost,
    currency,
    'Recorded replacement shipping estimate',
    true,
  );
  const support = component(
    'support_handling',
    'Support handling cost',
    context.claim.costs.estimatedSupportCost,
    currency,
    'Recorded support estimate',
    true,
  );
  const evidenceMissing = payoutCase.evidence.items.filter((item) => item.state === 'missing' || item.state === 'unavailable');
  const duplicateContradictions = context.priorConcessions.count > 0
    ? [`${context.priorConcessions.count} prior refund record${context.priorConcessions.count === 1 ? '' : 's'} exist for this order; review before another concession.`]
    : [];
  const policyRestriction = evaluation.recommendation === 'deny'
    ? ['The matched merchant rule recommends denial; a payout requires an override rationale.']
    : evaluation.recommendation === 'manual_review' || evaluation.recommendation === 'no_match'
      ? ['Policy does not currently authorise an automatic payout; merchant review is required.']
      : [];
  const evidenceVersion = [
    context.evidence.totalEvidenceItems,
    context.evidence.latestEvidenceAt ?? 'no-evidence-time',
    [...(context.evidence.evidenceTypes ?? [])].sort().join(','),
  ].join(':');
  const policyVersion = `${payoutCase.configVersion}:${evaluation.rule_id ?? 'no-matched-rule'}`;
  const options: ResolutionOption[] = [
    option({
      action: 'full_refund', label: 'Full refund', customerResolution: 'Authorise the reviewed amount back to the customer.',
      confirmable: Boolean(currency), unavailableReason: currency ? null : 'A known ISO currency is required.', financial: true,
      costs: [refundEstimate, support], policyRestrictions: policyRestriction, contradictions: duplicateContradictions,
      preparedNextAction: 'Review the exact refund amount and record the internal authorisation. No provider refund is sent.',
    }),
    option({
      action: 'partial_refund', label: 'Partial refund', customerResolution: 'Authorise a merchant-entered portion of the claim.',
      confirmable: Boolean(currency), unavailableReason: currency ? null : 'A known ISO currency is required.', financial: true,
      costs: [component('refund', 'Partial refund amount', null, currency, 'Merchant must enter the exact amount'), support],
      policyRestrictions: policyRestriction, contradictions: duplicateContradictions,
      preparedNextAction: 'Enter and review the exact partial amount before recording the internal authorisation.',
    }),
    option({
      action: 'same_item_replacement', label: 'Same-item replacement', customerResolution: 'Prepare a replacement of the confirmed original item.',
      confirmable: replacement?.ready === true,
      unavailableReason: replacement?.ready
        ? null
        : replacement?.unavailableReasons.join(' ') || 'Confirmed item, order, currency, connection, and replacement storage checks are required.',
      financial: true, costs: [replacementItem, replacementShipping, support], policyRestrictions: policyRestriction,
      contradictions: duplicateContradictions,
      preparedNextAction: replacement?.ready
        ? 'Select exact eligible quantities and review the authorised budget. Recording prepares a manual Shopify handoff only.'
        : 'Resolve the named item, source, currency, or eligibility gate before authorising a replacement.',
    }),
    option({
      action: 'request_evidence', label: 'Request evidence', customerResolution: 'Keep the case open while the named missing fact is obtained.',
      confirmable: evidenceMissing.length > 0, unavailableReason: evidenceMissing.length ? null : 'No feasible missing evidence requirement is currently identified.',
      financial: false, costs: [], policyRestrictions: [], contradictions: [],
      preparedNextAction: evidenceMissing[0]?.reason ?? 'No missing evidence request is currently prepared.',
    }),
    option({
      action: 'escalate', label: 'Escalate', customerResolution: 'Route the case to a permitted merchant reviewer without deciding payout.',
      confirmable: true, unavailableReason: null, financial: false, costs: [], policyRestrictions: [],
      contradictions: duplicateContradictions,
      preparedNextAction: 'Record the escalation rationale and assign the follow-up separately.',
    }),
    option({
      action: 'no_additional_payout', label: 'No additional payout', customerResolution: 'Record that this review authorises no further payout.',
      confirmable: true, unavailableReason: null, financial: false, costs: [], policyRestrictions: policyRestriction,
      contradictions: duplicateContradictions,
      preparedNextAction: 'Record the rationale. This does not assert a provider denial or erase prior concessions.',
    }),
  ];
  const snapshotWithoutToken = {
    version: RESOLUTION_COMPARISON_VERSION,
    caseVersion: context.claim.stateVersion,
    caseUpdatedAt: context.claim.updatedAt,
    evidenceVersion,
    policyVersion,
    currency,
    recommendation: payoutCase.nextAction,
    recommendationUncertainty: payoutCase.attribution.confidence,
    priorConcession: context.priorConcessions,
    recovery: {
      recoverability: payoutCase.recovery.recoverability,
      likelyOwner: payoutCase.recovery.likelyOwner,
      nextAction: payoutCase.recovery.suggestedNextAction,
      deadline: null,
      note: 'Possible recovery is separate and does not reduce the immediate resolution cost.',
    },
    replacement,
    options,
  };
  return {
    ...snapshotWithoutToken,
    token: createHash('sha256').update(stable(snapshotWithoutToken)).digest('hex'),
  };
}
