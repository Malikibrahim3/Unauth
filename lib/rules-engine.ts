/**
 * lib/rules-engine.ts
 *
 * Merchant-configurable claim review rules engine.
 *
 * Unauth never makes its own judgment. The recommendation returned here is
 * purely the output of the merchant's own rules applied to the claim evidence
 * and the merchant's own history. The merchant owns the decision.
 *
 * This module is pure (no IO). Persistence + auth live in lib/rules/store.ts;
 * the field/operator catalogue used for validation + UI lives in
 * lib/rules/fields.ts and re-uses the labels exported here.
 */

import { normaliseCurrencyOrNull, toMinorUnits } from '@/lib/canonical/money';

export type ConfidenceGrade = 'definite' | 'probable' | 'possible' | 'weak';
export type RuleAction = 'approve' | 'manual_review' | 'deny';
export type ConditionOperator = 'and' | 'or';

export interface RuleCondition {
  id: string;
  field: string;
  operator: string;
  value: unknown;
  /** Explicitly confirmed threshold currency; legacy absence stays unknown. */
  currency?: string | null;
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

/** Merchant-local claim review signals passed into the engine. */
export interface IdentitySignals {
  merchant_claim_count: number;
  days_since_last_claim: number | null;
  claim_types: string[];
  order_value_usd: number | null;
  account_age_days: number | null;
}

/** Signals may include claim-specific extensions; engine reads by field name. */
export type RuleSignals = IdentitySignals;
export type RuleSignalBag = IdentitySignals | Record<string, unknown>;

export interface MatchedCondition extends RuleCondition {
  actual_value: unknown;
}

export interface RuleEvaluationResult {
  certainty?: 'definite' | 'insufficient_evidence';
  missing_inputs?: string[];
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
  merchant_claim_count: 'claim count at this store (includes current claim)',
  merchant_prior_claim_count: 'prior claims at this store (excludes current)',
  days_since_last_claim: 'days since last claim',
  claim_types: 'claim types',
  order_value_usd: 'order value',
  account_age_days: 'account age (days)',
  is_network_flagged: 'identity is on the network watchlist',
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
  prior_approved_claims: 'prior approved claims',
  prior_denied_claims: 'prior denied claims',
  prior_escalated_claims: 'prior escalated claims',
  prior_chargebacks_after_claims: 'prior chargebacks',
  prior_loss_outcomes: 'prior loss outcomes',
  prior_recovered_outcomes: 'prior recovered outcomes',
  // Payout & recovery
  total_estimated_loss: 'total estimated loss',
  above_review_threshold: 'above merchant review threshold',
  requested_action: 'requested action',
  loss_attribution: 'loss attribution (advisory)',
  loss_attribution_confidence: 'loss attribution confidence',
  recoverability: 'recoverability',
  likely_owner: 'likely loss owner',
  evidence_strength: 'evidence strength',
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

/** Historical persisted spellings share the engine's canonical semantics. */
export function normalizeRuleOperator(operator: string): string | null {
  const aliases: Record<string, string> = {
    equals: 'eq', equal: 'eq', '=': 'eq', '==': 'eq', '===': 'eq',
    not_equals: 'neq', not_equal: 'neq', '!=': 'neq', '!==': 'neq', '<>': 'neq',
    greater_than: 'gt', '>': 'gt', greater_than_or_equal: 'gte', greater_than_or_equals: 'gte', '>=': 'gte',
    less_than: 'lt', '<': 'lt', less_than_or_equal: 'lte', less_than_or_equals: 'lte', '<=': 'lte',
  };
  return Object.hasOwn(OPERATOR_LABELS, operator) ? operator : Object.hasOwn(aliases, operator) ? aliases[operator] : null;
}

export function normalizeRuleCondition(condition: RuleCondition): RuleCondition {
  return { ...condition, operator: normalizeRuleOperator(condition.operator) ?? condition.operator };
}

// ---------------------------------------------------------------------------
// Core evaluation
// ---------------------------------------------------------------------------

export function evaluateRules(
  signals: RuleSignalBag,
  rules: MerchantRule[],
): RuleEvaluationResult {
  // Sort by priority ascending (lower number = higher priority).
  const sorted = [...rules]
    .filter((r) => r.is_active)
    .sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));

  if (sorted.length === 0) {
    return {
      recommendation: 'no_match',
      rule_id: null,
      rule_name: null,
      matched_conditions: [],
      justification: 'No active claim review rules are configured.',
      justification_lines: [],
    };
  }

  for (const rule of sorted) {
    const result = evaluateRule(signals, rule);
    if (result.state === 'unknown') {
      const explanation = `Insufficient evidence to determine whether rule "${rule.name}" wins: ${result.missing.join(', ')}.`;
      return {
        recommendation: 'manual_review', certainty: 'insufficient_evidence',
        rule_id: null, rule_name: null, matched_conditions: [],
        missing_inputs: result.missing,
        justification: explanation, justification_lines: [explanation],
      };
    }
    const matched = result.matched;
    if (result.state === 'true') {
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
    justification: 'No claim review rules matched.',
    justification_lines: [],
  };
}

export const MONETARY_RULE_FIELDS = new Set(['order_value_usd', 'amount_at_risk', 'total_estimated_loss']);

type ConditionState = 'true' | 'false' | 'unknown';
function evaluateRule(signals: RuleSignalBag, rule: MerchantRule): {
  state: ConditionState; matched: MatchedCondition[]; missing: string[];
} {
  if (!['and', 'or'].includes(rule.condition_operator)) {
    return { state: 'unknown', matched: [], missing: ['unsupported condition grouping'] };
  }
  const results = rule.conditions.map(condition => {
    const actual = getSignalValue(signals, condition.field);
    const operator = normalizeRuleOperator(condition.operator);
    let missing: string | null = !operator ? `${condition.field}: unsupported operator` : null;
    if (actual == null || (typeof actual === 'number' && !Number.isFinite(actual))) missing ??= condition.field;
    if (MONETARY_RULE_FIELDS.has(condition.field)) {
      const expectedCurrency = normaliseCurrencyOrNull(condition.currency);
      const actualCurrency = normaliseCurrencyOrNull(getSignalValue(signals, `${condition.field}_currency`) as string | null);
      if (!expectedCurrency || !actualCurrency || expectedCurrency !== actualCurrency) {
        missing ??= `${condition.field}: confirmed matching currency required`;
      }
    }
    if (['gt', 'gte', 'lt', 'lte'].includes(operator ?? '') && (!isNumber(actual) || !isNumber(condition.value))) missing ??= `${condition.field}: numeric evidence required`;
    if (condition.value == null) missing ??= `${condition.field}: missing threshold`;
    if (MONETARY_RULE_FIELDS.has(condition.field) && (!isNumber(actual) || !isNumber(condition.value) || !Number.isSafeInteger(toMinorUnits(actual, condition.currency ?? '')) || !Number.isSafeInteger(toMinorUnits(condition.value, condition.currency ?? '')))) missing ??= `${condition.field}: supported amount required`;
    const state: ConditionState = missing ? 'unknown' : evaluateCondition(condition, actual) ? 'true' : 'false';
    return { state, missing, match: { ...condition, actual_value: actual } };
  });
  const matched = results.filter(r => r.state === 'true').map(r => r.match);
  // Empty rules retain their existing catch-all semantics for both groupings.
  const state: ConditionState = !results.length ? 'true'
    : rule.condition_operator === 'and'
      ? results.some(r => r.state === 'false') ? 'false' : results.some(r => r.state === 'unknown') ? 'unknown' : 'true'
      : matched.length ? 'true' : results.some(r => r.state === 'unknown') ? 'unknown' : 'false';
  return { state, matched, missing: state === 'unknown' ? [...new Set(results.flatMap(r => r.missing ? [r.missing] : []))] : [] };
}

function getSignalValue(signals: RuleSignalBag, field: string): unknown {
  const bag = signals as Record<string, unknown>;
  if (Array.isArray(bag.unavailable_rule_inputs) && bag.unavailable_rule_inputs.includes(field)) return null;
  if (!Object.prototype.hasOwnProperty.call(bag, field)) return null;
  return bag[field];
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function evaluateCondition(condition: RuleCondition, actual: unknown): boolean {
  let { value } = condition;
  if (MONETARY_RULE_FIELDS.has(condition.field) && isNumber(actual) && isNumber(value) && condition.currency) {
    actual = toMinorUnits(actual, condition.currency);
    value = toMinorUnits(value, condition.currency);
  }
  const operator = normalizeRuleOperator(condition.operator);
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
    const opLabel = OPERATOR_LABELS[normalizeRuleOperator(c.operator) ?? ''] ?? c.operator;
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
    return `${value.toLocaleString()} (currency specified by condition)`;
  }
  return String(value ?? '—');
}
