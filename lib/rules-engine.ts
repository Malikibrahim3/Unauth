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
  merchant_claim_count: 'claim count at this store',
  days_since_last_claim: 'days since last claim',
  has_cross_merchant_identity: 'cross-merchant identity match',
  network_merchant_count: 'number of merchants claimed at',
  claim_types: 'claim types',
  order_value_usd: 'order value',
  account_age_days: 'account age (days)',
  is_network_flagged: 'network flag status',
  evidence_score: 'evidence score',
  evidence_level: 'evidence level',
  has_sufficient_data: 'sufficient data available',
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
  signals: IdentitySignals,
  rules: MerchantRule[],
): RuleEvaluationResult {
  // Sort by priority ascending (lower number = higher priority).
  const sorted = [...rules]
    .filter((r) => r.is_active)
    .sort((a, b) => a.priority - b.priority);

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

function evaluateRule(signals: IdentitySignals, rule: MerchantRule): MatchedCondition[] {
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

function getSignalValue(signals: IdentitySignals, field: string): unknown {
  if (!Object.prototype.hasOwnProperty.call(signals, field)) return null;
  return signals[field as keyof IdentitySignals] ?? null;
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
