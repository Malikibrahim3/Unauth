import {
  evaluateRules,
  type IdentitySignals,
  type MerchantRule,
} from '@/lib/rules-engine';
import { validateConditions } from '@/lib/rules/fields';
import {
  activeRiskScoreRanges,
  findOverlappingRiskControl,
  makeRiskScoreRangeConditions,
  parseRiskScoreRange,
  riskScorePolicyCoverageError,
} from '@/lib/rules/riskBands';

function signals(overrides: Partial<IdentitySignals> = {}): IdentitySignals {
  return {
    merchant_claim_count: 0,
    days_since_last_claim: null,
    claim_types: [],
    order_value_usd: null,
    account_age_days: null,
    ...overrides,
  };
}

function rule(partial: Partial<MerchantRule>): MerchantRule {
  return {
    id: partial.id ?? 'r1',
    merchant_id: 'm1',
    name: partial.name ?? 'Rule',
    description: null,
    is_active: partial.is_active ?? true,
    priority: partial.priority ?? 0,
    conditions: partial.conditions ?? [],
    action: partial.action ?? 'manual_review',
    condition_operator: partial.condition_operator ?? 'and',
  };
}

describe('evaluateRules', () => {
  it('does not infer a recommendation when no active custom rules are configured', () => {
    const low = evaluateRules(signals(), []);
    expect(low.recommendation).toBe('no_match');
    expect(low.rule_id).toBeNull();
    expect(low.rule_name).toBeNull();
  });

  it('keeps no-rule recommendations virtual so no fake rule id is audited', () => {
    const result = evaluateRules(signals(), []);
    expect(result.rule_id).toBeNull();
    expect(result.matched_conditions).toHaveLength(0);
  });

  it('fires the first matching rule by priority', () => {
    const rules = [
      rule({
        id: 'low-priority',
        priority: 5,
        action: 'deny',
        conditions: [{ id: 'c', field: 'merchant_claim_count', operator: 'gte', value: 1 }],
      }),
      rule({
        id: 'high-priority',
        priority: 0,
        action: 'manual_review',
        conditions: [{ id: 'c', field: 'merchant_claim_count', operator: 'gte', value: 1 }],
      }),
    ];
    const result = evaluateRules(signals({ merchant_claim_count: 3 }), rules);
    expect(result.rule_id).toBe('high-priority');
    expect(result.recommendation).toBe('manual_review');
  });

  it('AND requires every condition to pass', () => {
    const r = rule({
      action: 'manual_review',
      condition_operator: 'and',
      conditions: [
        { id: 'a', field: 'merchant_claim_count', operator: 'gte', value: 3 },
        { id: 'b', field: 'claim_types', operator: 'contains', value: 'item_not_received' },
      ],
    });
    expect(evaluateRules(signals({ merchant_claim_count: 3, claim_types: ['item_not_received'] }), [r]).recommendation).toBe('manual_review');
    expect(evaluateRules(signals({ merchant_claim_count: 3, claim_types: ['refund_request'] }), [r]).recommendation).toBe('no_match');
  });

  it('OR matches when any condition passes', () => {
    const r = rule({
      action: 'deny',
      condition_operator: 'or',
      conditions: [
        { id: 'a', field: 'merchant_claim_count', operator: 'gte', value: 1 },
        { id: 'b', field: 'amount_at_risk', operator: 'gte', value: 100 },
      ],
    });
    expect(evaluateRules(signals({ merchant_claim_count: 1 }), [r]).recommendation).toBe('deny');
    expect(evaluateRules(signals(), [r]).recommendation).toBe('no_match');
  });

  it('treats a rule with no conditions as always matching', () => {
    const r = rule({ action: 'approve', conditions: [] });
    expect(evaluateRules(signals(), [r]).recommendation).toBe('approve');
  });

  it('skips inactive rules', () => {
    const r = rule({ is_active: false, action: 'deny', conditions: [] });
    expect(evaluateRules(signals(), [r]).recommendation).toBe('no_match');
  });

  it('handles string[] contains_any on claim_types', () => {
    const r = rule({
      action: 'manual_review',
      conditions: [{ id: 'a', field: 'claim_types', operator: 'contains_any', value: ['chargeback', 'item_not_received'] }],
    });
    expect(evaluateRules(signals({ claim_types: ['refund_request', 'item_not_received'] }), [r]).recommendation).toBe('manual_review');
    expect(evaluateRules(signals({ claim_types: ['refund_request'] }), [r]).recommendation).toBe('no_match');
  });

  it('does not match numeric comparisons against null actuals', () => {
    const r = rule({
      action: 'approve',
      conditions: [{ id: 'a', field: 'days_since_last_claim', operator: 'lte', value: 30 }],
    });
    expect(evaluateRules(signals({ days_since_last_claim: null }), [r]).recommendation).toBe('no_match');
  });

  it('builds justification lines for the matched conditions', () => {
    const r = rule({
      name: 'Repeat claimant review',
      action: 'manual_review',
      conditions: [{ id: 'a', field: 'merchant_claim_count', operator: 'gte', value: 3 }],
    });
    const result = evaluateRules(signals({ merchant_claim_count: 5 }), [r]);
    expect(result.justification_lines[0]).toContain('Repeat claimant review');
    expect(result.justification_lines.some((l) => l.includes('actual: 5'))).toBe(true);
  });
});

describe('legacy evidence-strength bands', () => {
  it('parses inclusive evidence-strength ranges', () => {
    expect(
      parseRiskScoreRange({
        conditions: makeRiskScoreRangeConditions({ lower: 40, upper: 74 }),
        condition_operator: 'and',
      }),
    ).toEqual({ lower: 40, upper: 74 });
  });

  it('detects overlapping active compatibility controls', () => {
    const existing = rule({
      id: 'existing',
      conditions: makeRiskScoreRangeConditions({ lower: 40, upper: 74 }),
      action: 'manual_review',
    });
    const overlap = findOverlappingRiskControl([existing], { lower: 70, upper: 90 });
    expect(overlap?.id).toBe('existing');
    expect(findOverlappingRiskControl([existing], { lower: 75, upper: 100 })).toBeNull();
  });

  it('detects gaps in compatibility coverage', () => {
    const rules = [
      rule({ id: 'low', conditions: makeRiskScoreRangeConditions({ lower: 0, upper: 20 }), action: 'approve' }),
      rule({ id: 'high', conditions: makeRiskScoreRangeConditions({ lower: 75, upper: 100 }), action: 'deny' }),
    ];
    expect(riskScorePolicyCoverageError(activeRiskScoreRanges(rules))).toContain('band values 21-74');
  });

  it('accepts complete adjacent compatibility coverage', () => {
    const rules = [
      rule({ id: 'low', conditions: makeRiskScoreRangeConditions({ lower: 0, upper: 39 }), action: 'approve' }),
      rule({ id: 'review', conditions: makeRiskScoreRangeConditions({ lower: 40, upper: 74 }), action: 'manual_review' }),
      rule({ id: 'high', conditions: makeRiskScoreRangeConditions({ lower: 75, upper: 100 }), action: 'deny' }),
    ];
    expect(riskScorePolicyCoverageError(activeRiskScoreRanges(rules))).toBeNull();
  });
});

describe('validateConditions', () => {
  it('accepts valid conditions', () => {
    expect(
      validateConditions([{ id: 'a', field: 'merchant_claim_count', operator: 'gte', value: 3 }]),
    ).toEqual([]);
  });

  it('rejects unknown fields', () => {
    const errs = validateConditions([{ id: 'a', field: 'nope', operator: 'eq', value: 1 }]);
    expect(errs).toHaveLength(1);
  });

  it('rejects operators incompatible with the field type', () => {
    const errs = validateConditions([{ id: 'a', field: 'claim_type', operator: 'gt', value: 1 }]);
    expect(errs).toHaveLength(1);
  });

  it('rejects a non-numeric value for a numeric field', () => {
    const errs = validateConditions([{ id: 'a', field: 'order_value_usd', operator: 'gte', value: 'lots' }]);
    expect(errs).toHaveLength(1);
  });

  it('rejects an invalid enum option', () => {
    const errs = validateConditions([{ id: 'a', field: 'claim_type', operator: 'eq', value: 'amazing' }]);
    expect(errs).toHaveLength(1);
  });

  it('allows an empty conditions array (matches everything)', () => {
    expect(validateConditions([])).toEqual([]);
  });

  it('rejects raw evidence_score conditions', () => {
    const errs = validateConditions([{ id: 'a', field: 'evidence_score', operator: 'contains', value: 45 }]);
    expect(errs).toHaveLength(1);
  });

  it('rejects an invalid evidence_level option', () => {
    const errs = validateConditions([{ id: 'a', field: 'evidence_level', operator: 'eq', value: 'amazing' }]);
    expect(errs).toHaveLength(1);
  });

  it('rejects non-equality operators on has_sufficient_data', () => {
    const errs = validateConditions([{ id: 'a', field: 'has_sufficient_data', operator: 'gt', value: true }]);
    expect(errs).toHaveLength(1);
  });
});

describe('claim evidence field evaluation', () => {
  it('matches on named evidence completeness fields', () => {
    const r = rule({
      action: 'approve',
      conditions: [{ id: 'a', field: 'has_customer_evidence', operator: 'eq', value: true }],
    });
    expect(evaluateRules(signals({ has_customer_evidence: true } as any), [r]).recommendation).toBe('approve');
    expect(evaluateRules(signals({ has_customer_evidence: false } as any), [r]).recommendation).toBe('no_match');
  });
});
