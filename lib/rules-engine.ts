/**
 * lib/rules-engine.ts
 *
 * Merchant-configurable fraud rules engine.
 *
 * Unauth never makes its own judgment. The recommendation returned here is
 * purely the output of the merchant's own rules applied to Unauth's identity
 * signals. The merchant owns the decision. Unauth runs the math.
 *
 * This module is pure (no IO). Persistence + auth live in lib/rules/store.ts;
 * the field/operator catalogue used for validation + UI lives in
 * lib/rules/fields.ts and re-uses the labels exported here.
 */

import { DEFAULT_RISK_CONTROLS, makeRiskScoreRangeConditions } from '@/lib/rules/riskBands';

export type ConfidenceGrade = 'definite' | 'probable' | 'possible' | 'weak';
export type RuleAction = 'approve' | 'manual_review' | 'deny';
export type ConditionOperator = 'and' | 'or';

export interface RuleCondition {
  id: string;
  field: string;
  operator: string;
  value: unknown;
}

export interface MerchantRule {
  id: string;
  merchant_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  priority: number;
  conditions: RuleCondition[];
  action: RuleAction;
  condition_operator: ConditionOperator;
}

export type EvidenceLevel = 'minimal' | 'some' | 'substantial' | 'extensive';

/** The resolved identity signals passed into the engine. */
export interface IdentitySignals {
  confidence_grade: ConfidenceGrade;
  network_claim_count: number;
  merchant_claim_count: number;
  days_since_last_claim: number | null;
  has_cross_merchant_identity: boolean;
  network_merchant_count: number;
  claim_types: string[];
  order_value_usd: number | null;
  account_age_days: number | null;
  is_network_flagged: boolean;
  evidence_score: number;
  evidence_level: EvidenceLevel;
  has_sufficient_data: boolean;
}

/** Signals may include claim-specific extensions; engine reads by field name. */
export type RuleSignals = IdentitySignals;

export interface MatchedCondition extends RuleCondition {
  actual_value: unknown;
}

export interface RuleEvaluationResult {
  recommendation: RuleAction | 'no_match';
  rule_id: string | null;
  rule_name: string | null;
  matched_conditions: MatchedCondition[];
  /** Human-readable explanation of why this recommendation was made. */
  justification: string;
  justification_lines: string[];
}

// ---------------------------------------------------------------------------
// Display labels (single source of truth — re-used by lib/rules/fields.ts)
// ---------------------------------------------------------------------------

export const FIELD_LABELS: Record<string, string> = {
  confidence_grade: 'identity confidence',
  network_claim_count: 'cross-network claim count',
  merchant_claim_count: 'claim count at this store (includes current claim)',
  merchant_prior_claim_count: 'prior claims at this store (excludes current)',
  days_since_last_claim: 'days since last claim',
  has_cross_merchant_identity: 'cross-merchant identity match',
  network_merchant_count: 'number of merchants claimed at',
  claim_types: 'claim types',
  order_value_usd: 'order value',
  account_age_days: 'account age (days)',
  is_network_flagged: 'network flag status',
  evidence_score: 'risk score',
  evidence_level: 'evidence level',
  has_sufficient_data: 'sufficient data available',
  // Current claim
  claim_type: 'claim type',
  amount_at_risk: 'amount at risk',
  ticket_claim_type_confidence: 'ticket claim-type confidence',
  // Delivery
  delivery_status: 'delivery status',
  days_since_delivery: 'days since delivery',
  has_tracking: 'has tracking',
  has_proof_of_delivery: 'has proof of delivery',
  // Evidence on this claim
  has_customer_evidence: 'has customer evidence',
  evidence_items_count: 'evidence items on claim',
  // Outcome history
  merchant_same_type_claim_count: 'same-type claims at this store (includes current)',
  merchant_prior_same_type_claim_count: 'prior same-type claims (excludes current)',
  network_same_type_claim_count: 'prior claims of same type across network',
  prior_approved_claims: 'prior approved claims',
  prior_denied_claims: 'prior denied claims',
  prior_escalated_claims: 'prior escalated claims',
  prior_chargebacks_after_claims: 'prior chargebacks',
  prior_loss_outcomes: 'prior loss outcomes',
  prior_recovered_outcomes: 'prior recovered outcomes',
};

export const OPERATOR_LABELS: Record<string, string> = {
  eq: 'is',
  neq: 'is not',
  gt: 'is greater than',
  gte: 'is at least',
  lt: 'is less than',
  lte: 'is at most',
  in: 'is one of',
  not_in: 'is not one of',
  contains: 'includes',
  not_contains: 'does not include',
  contains_any: 'includes any of',
};

// ---------------------------------------------------------------------------
// Core evaluation
// ---------------------------------------------------------------------------

export function evaluateRules(
  signals: RuleSignals,
  rules: MerchantRule[],
): RuleEvaluationResult {
  // Sort by priority ascending (lower number = higher priority).
  const sorted = [...rules]
    .filter((r) => r.is_active)
    .sort((a, b) => a.priority - b.priority);

  if (sorted.length === 0) {
    return evaluateDefaultRiskControls(signals);
  }

  for (const rule of sorted) {
    const matched = evaluateRule(signals, rule);
    // A rule with zero conditions is treated as "always matches".
    if (matched.length > 0 || rule.conditions.length === 0) {
      const justification_lines = buildJustificationLines(rule, matched);
      return {
        recommendation: rule.action,
        rule_id: rule.id,
        rule_name: rule.name,
        matched_conditions: matched,
        justification: justification_lines.join('. '),
        justification_lines,
      };
    }
  }

  return {
    recommendation: 'no_match',
    rule_id: null,
    rule_name: null,
    matched_conditions: [],
    justification: 'No rules matched for this identity.',
    justification_lines: [],
  };
}

function evaluateDefaultRiskControls(signals: RuleSignals): RuleEvaluationResult {
  const score = typeof signals.evidence_score === 'number' && Number.isFinite(signals.evidence_score)
    ? signals.evidence_score
    : 0;
  const control = DEFAULT_RISK_CONTROLS.find((band) => score >= band.lower && score <= band.upper)
    ?? DEFAULT_RISK_CONTROLS[DEFAULT_RISK_CONTROLS.length - 1]!;
  const rule: MerchantRule = {
    id: '',
    merchant_id: '',
    name: control.name,
    description: control.description,
    is_active: true,
    priority: 0,
    conditions: makeRiskScoreRangeConditions(control),
    action: control.action,
    condition_operator: 'and',
  };
  const matched = evaluateRule(signals, rule);
  const justification_lines = buildJustificationLines(rule, matched);
  return {
    recommendation: control.action,
    rule_id: null,
    rule_name: control.name,
    matched_conditions: matched,
    justification: justification_lines.join('. '),
    justification_lines,
  };
}

function evaluateRule(signals: RuleSignals, rule: MerchantRule): MatchedCondition[] {
  const results: Array<MatchedCondition | null> = rule.conditions.map((condition) => {
    const actual = getSignalValue(signals, condition.field);
    const passes = evaluateCondition(condition, actual);
    return passes ? { ...condition, actual_value: actual } : null;
  });

  if (rule.condition_operator === 'and') {
    const allPassed = results.every((r) => r !== null);
    return allPassed ? (results as MatchedCondition[]) : [];
  }
  // 'or' — any condition passing is enough; report the conditions that passed.
  const passed = results.filter((r): r is MatchedCondition => r !== null);
  return passed.length > 0 ? passed : [];
}

function getSignalValue(signals: RuleSignals, field: string): unknown {
  const bag = signals as IdentitySignals & Record<string, unknown>;
  if (!Object.prototype.hasOwnProperty.call(bag, field)) return null;
  return bag[field];
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function evaluateCondition(condition: RuleCondition, actual: unknown): boolean {
  const { operator, value } = condition;
  if (actual === null || actual === undefined) return false;

  switch (operator) {
    case 'eq':
      return actual === value;
    case 'neq':
      return actual !== value;
    case 'gt':
      return isNumber(actual) && isNumber(value) && actual > value;
    case 'gte':
      return isNumber(actual) && isNumber(value) && actual >= value;
    case 'lt':
      return isNumber(actual) && isNumber(value) && actual < value;
    case 'lte':
      return isNumber(actual) && isNumber(value) && actual <= value;
    case 'in':
      return Array.isArray(value) && value.includes(actual);
    case 'not_in':
      return Array.isArray(value) && !value.includes(actual);
    case 'contains':
      return Array.isArray(actual) && actual.includes(value as string);
    case 'not_contains':
      return Array.isArray(actual) && !actual.includes(value as string);
    case 'contains_any':
      return (
        Array.isArray(value) &&
        Array.isArray(actual) &&
        value.some((v) => actual.includes(v))
      );
    default:
      return false;
  }
}

// ---------------------------------------------------------------------------
// Justification builder
// ---------------------------------------------------------------------------

function buildJustificationLines(rule: MerchantRule, matched: MatchedCondition[]): string[] {
  const lines: string[] = [`Rule "${rule.name}" triggered`];
  for (const c of matched) {
    const fieldLabel = FIELD_LABELS[c.field] ?? c.field;
    const opLabel = OPERATOR_LABELS[c.operator] ?? c.operator;
    const valueLabel = formatValue(c.field, c.value);
    const actualLabel = formatValue(c.field, c.actual_value);
    lines.push(`${fieldLabel} ${opLabel} ${valueLabel} (actual: ${actualLabel})`);
  }
  return lines;
}

export function formatValue(field: string, value: unknown): string {
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  if (field === 'order_value_usd' && typeof value === 'number') {
    return `$${value.toLocaleString()}`;
  }
  return String(value ?? '—');
}
