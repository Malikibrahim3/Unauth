import type { MatchedCondition, RuleEvaluationResult } from '@/lib/rules-engine';
import { OPERATOR_LABELS } from '@/lib/rules-engine';
import { payoutRecommendationLabel, resolvePayoutRecommendation } from '@/lib/payouts/recommendation';
import { ACTION_LABELS } from '@/lib/rules/summary';
import type { SupportPayoutCase } from '@/lib/payouts/types';
import { summarizeCondition } from '@/lib/rules/summary';
import { FIELD_DEFS_BY_NAME } from '@/lib/rules/fields';
import { CLAIM_TYPE_LABELS } from '@/lib/claims/claimTypes';
import {
  ATTRIBUTION_CONFIDENCE_LABELS,
  EVIDENCE_STRENGTH_LABELS,
  LIKELY_OWNER_LABELS,
  LOSS_ATTRIBUTION_DISPLAY,
  RECOVERABILITY_LABELS,
  REQUESTED_ACTION_LABELS,
} from '@/lib/payouts/types';

export type FormattedClaimDecision = {
  recommendationLabel: string;
  ruleName: string | null;
  summary: string;
  matchedConditions: Array<{ label: string; actual: string }>;
  isNoMatch: boolean;
  isNoRules: boolean;
  tone: 'success' | 'warning' | 'danger' | 'neutral';
};

const DELIVERY_STATUS_LABELS: Record<string, string> = {
  delivered: 'Delivered',
  in_transit: 'In transit',
  pending: 'Pending',
  unknown: 'Unknown',
};

function plainFieldLabel(field: string): string {
  const labels: Record<string, string> = {
    claim_type: 'Claim type',
    amount_at_risk: 'Amount at risk',
    delivery_status: 'Delivery status',
    days_since_delivery: 'Days since delivery',
    has_tracking: 'Has tracking',
    has_proof_of_delivery: 'Has proof of delivery',
    has_customer_evidence: 'Customer evidence attached',
    evidence_items_count: 'Evidence items on claim',
    merchant_claim_count: 'Claims at this store',
    merchant_prior_claim_count: 'Prior claims at this store',
    merchant_same_type_claim_count: 'Same-type claims at this store',
    merchant_prior_same_type_claim_count: 'Prior same-type claims',
    prior_approved_claims: 'Prior approved claims',
    prior_denied_claims: 'Prior denied claims',
    prior_escalated_claims: 'Prior escalated claims',
    total_estimated_loss: 'Total estimated loss',
    above_review_threshold: 'Above review threshold',
    requested_action: 'Requested action',
    loss_attribution: 'Loss attribution',
    loss_attribution_confidence: 'Loss attribution confidence',
    recoverability: 'Recoverability',
    likely_owner: 'Likely loss owner',
    evidence_strength: 'Evidence strength',
  };
  return labels[field] ?? field.replace(/_/g, ' ');
}

function formatPlainValue(field: string, value: unknown): string {
  if (typeof value === 'boolean') {
    if (field === 'has_customer_evidence') return value ? 'Yes' : 'No';
    if (field === 'has_tracking') return value ? 'Yes' : 'No';
    if (field === 'has_proof_of_delivery') return value ? 'Yes' : 'No';
    return value ? 'Yes' : 'No';
  }
  if (field === 'claim_type' && typeof value === 'string') {
    return CLAIM_TYPE_LABELS[value as keyof typeof CLAIM_TYPE_LABELS] ?? value;
  }
  if (field === 'delivery_status' && typeof value === 'string') {
    return DELIVERY_STATUS_LABELS[value] ?? value;
  }
  if (field === 'amount_at_risk' && typeof value === 'number') {
    return `£${value.toLocaleString()}`;
  }
  if (field === 'total_estimated_loss' && typeof value === 'number') {
    return `£${value.toLocaleString()}`;
  }
  if (field === 'order_value_usd' && typeof value === 'number') {
    return `$${value.toLocaleString()}`;
  }
  if (field === 'requested_action' && typeof value === 'string') {
    return REQUESTED_ACTION_LABELS[value as keyof typeof REQUESTED_ACTION_LABELS] ?? value;
  }
  if (field === 'loss_attribution' && typeof value === 'string') {
    return LOSS_ATTRIBUTION_DISPLAY[value as keyof typeof LOSS_ATTRIBUTION_DISPLAY] ?? value;
  }
  if (field === 'loss_attribution_confidence' && typeof value === 'string') {
    return ATTRIBUTION_CONFIDENCE_LABELS[value as keyof typeof ATTRIBUTION_CONFIDENCE_LABELS] ?? value;
  }
  if (field === 'recoverability' && typeof value === 'string') {
    return RECOVERABILITY_LABELS[value as keyof typeof RECOVERABILITY_LABELS] ?? value;
  }
  if (field === 'likely_owner' && typeof value === 'string') {
    return LIKELY_OWNER_LABELS[value as keyof typeof LIKELY_OWNER_LABELS] ?? value;
  }
  if (field === 'evidence_strength' && typeof value === 'string') {
    return EVIDENCE_STRENGTH_LABELS[value as keyof typeof EVIDENCE_STRENGTH_LABELS] ?? value;
  }
  if (Array.isArray(value)) return value.join(', ');
  return String(value ?? '—');
}

function formatMatchedConditionPlain(c: MatchedCondition): { label: string; actual: string } {
  const def = FIELD_DEFS_BY_NAME[c.field];
  if (def?.type === 'boolean' && c.operator === 'eq') {
    const label = plainFieldLabel(c.field);
    if (c.value === true) {
      if (c.field === 'has_customer_evidence' && c.actual_value === false) {
        return { label: 'No customer evidence has been attached', actual: '' };
      }
      return { label: `${label} is present`, actual: '' };
    }
    if (c.value === false) {
      return { label: `No ${label.toLowerCase()}`, actual: '' };
    }
  }

  if (def?.type === 'enum' && c.operator === 'eq') {
    return {
      label: `${plainFieldLabel(c.field)} is ${formatPlainValue(c.field, c.value)}`,
      actual: '',
    };
  }

  if (typeof c.value === 'number' && ['gte', 'gt', 'lte', 'lt', 'eq'].includes(c.operator)) {
    const op = OPERATOR_LABELS[c.operator] ?? c.operator;
    const actual = formatPlainValue(c.field, c.actual_value);
    return {
      label: `${plainFieldLabel(c.field)} ${op} ${formatPlainValue(c.field, c.value)}`,
      actual: actual !== formatPlainValue(c.field, c.value) ? `(actual: ${actual})` : '',
    };
  }

  return {
    label: summarizeCondition(c),
    actual: formatPlainValue(c.field, c.actual_value),
  };
}

export function formatClaimDecisionRecommendation(
  evaluation: RuleEvaluationResult,
  ruleCount: number,
  payoutCase?: SupportPayoutCase,
): FormattedClaimDecision {
  if (evaluation.recommendation === 'no_match') {
    if (ruleCount === 0) {
      return {
        recommendationLabel: 'No active rules',
        ruleName: null,
        summary: 'Add rules to generate claim recommendations.',
        matchedConditions: [],
        isNoMatch: false,
        isNoRules: true,
        tone: 'neutral',
      };
    }
    return {
      recommendationLabel: 'No rule matched',
      ruleName: null,
      summary: 'No merchant rule matched. Continue with standard review.',
      matchedConditions: [],
      isNoMatch: true,
      isNoRules: false,
      tone: 'neutral',
    };
  }

  const resolved = payoutCase
    ? (payoutCase.recommendation ?? resolvePayoutRecommendation(evaluation, payoutCase))
    : null;

  const tone =
    evaluation.recommendation === 'approve'
      ? 'success'
      : evaluation.recommendation === 'deny'
        ? 'danger'
        : 'warning';

  return {
    recommendationLabel: resolved
      ? payoutRecommendationLabel(resolved.action)
      : (ACTION_LABELS[evaluation.recommendation] ?? evaluation.recommendation),
    ruleName: evaluation.rule_name,
    summary: resolved?.explanation ?? (evaluation.justification_lines.slice(1).join('. ') || evaluation.justification),
    matchedConditions: evaluation.matched_conditions.map(formatMatchedConditionPlain),
    isNoMatch: false,
    isNoRules: false,
    tone,
  };
}
