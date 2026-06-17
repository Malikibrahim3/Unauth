import {
  evaluateRules,
  type IdentitySignals,
  type MerchantRule,
} from '@/lib/rules-engine';
import { validateConditions } from '@/lib/rules/fields';

function signals(overrides: Partial<IdentitySignals> = {}): IdentitySignals {
  return {
    confidence_grade: 'probable',
    network_claim_count: 0,
    merchant_claim_count: 0,
    days_since_last_claim: null,
    has_cross_merchant_identity: false,
    network_merchant_count: 0,
    claim_types: [],
    order_value_usd: null,
    account_age_days: null,
    is_network_flagged: false,
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
  it('returns no_match when no rules are configured', () => {
    const result = evaluateRules(signals(), []);
    expect(result.recommendation).toBe('no_match');
    expect(result.rule_id).toBeNull();
  });

  it('fires the first matching rule by priority', () => {
    const rules = [
      rule({
        id: 'low-priority',
        priority: 5,
        action: 'deny',
        conditions: [{ id: 'c', field: 'network_claim_count', operator: 'gte', value: 1 }],
      }),
      rule({
        id: 'high-priority',
        priority: 0,
        action: 'manual_review',
        conditions: [{ id: 'c', field: 'network_claim_count', operator: 'gte', value: 1 }],
      }),
    ];
    const result = evaluateRules(signals({ network_claim_count: 3 }), rules);
    expect(result.rule_id).toBe('high-priority');
    expect(result.recommendation).toBe('manual_review');
  });

  it('AND requires every condition to pass', () => {
    const r = rule({
      action: 'manual_review',
      condition_operator: 'and',
      conditions: [
        { id: 'a', field: 'network_claim_count', operator: 'gte', value: 3 },
        { id: 'b', field: 'confidence_grade', operator: 'in', value: ['definite', 'probable'] },
      ],
    });
    expect(evaluateRules(signals({ network_claim_count: 3, confidence_grade: 'probable' }), [r]).recommendation).toBe('manual_review');
    expect(evaluateRules(signals({ network_claim_count: 3, confidence_grade: 'weak' }), [r]).recommendation).toBe('no_match');
  });

  it('OR matches when any condition passes', () => {
    const r = rule({
      action: 'deny',
      condition_operator: 'or',
      conditions: [
        { id: 'a', field: 'is_network_flagged', operator: 'eq', value: true },
        { id: 'b', field: 'network_claim_count', operator: 'gte', value: 10 },
      ],
    });
    expect(evaluateRules(signals({ is_network_flagged: true }), [r]).recommendation).toBe('deny');
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
      name: 'Serial Network Abuser',
      action: 'manual_review',
      conditions: [{ id: 'a', field: 'network_claim_count', operator: 'gte', value: 3 }],
    });
    const result = evaluateRules(signals({ network_claim_count: 5 }), [r]);
    expect(result.justification_lines[0]).toContain('Serial Network Abuser');
    expect(result.justification_lines.some((l) => l.includes('actual: 5'))).toBe(true);
  });
});

describe('validateConditions', () => {
  it('accepts valid conditions', () => {
    expect(
      validateConditions([{ id: 'a', field: 'network_claim_count', operator: 'gte', value: 3 }]),
    ).toEqual([]);
  });

  it('rejects unknown fields', () => {
    const errs = validateConditions([{ id: 'a', field: 'nope', operator: 'eq', value: 1 }]);
    expect(errs).toHaveLength(1);
  });

  it('rejects operators incompatible with the field type', () => {
    const errs = validateConditions([{ id: 'a', field: 'confidence_grade', operator: 'gt', value: 1 }]);
    expect(errs).toHaveLength(1);
  });

  it('rejects a non-numeric value for a numeric field', () => {
    const errs = validateConditions([{ id: 'a', field: 'order_value_usd', operator: 'gte', value: 'lots' }]);
    expect(errs).toHaveLength(1);
  });

  it('rejects an invalid enum option', () => {
    const errs = validateConditions([{ id: 'a', field: 'confidence_grade', operator: 'eq', value: 'amazing' }]);
    expect(errs).toHaveLength(1);
  });

  it('allows an empty conditions array (matches everything)', () => {
    expect(validateConditions([])).toEqual([]);
  });
});
