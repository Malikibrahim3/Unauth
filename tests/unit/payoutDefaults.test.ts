import { DEFAULT_PAYOUT_RULES } from '@/lib/rules/payoutDefaults';
import { validateConditions, RULE_ACTIONS } from '@/lib/rules/fields';

/**
 * Payout-policy default rules (CR-2): the merchant-facing starting point must be
 * driven by payout-case facts, never by identity/network/risk-score signals.
 */
describe('default payout rules', () => {
  const IDENTITY_NETWORK_RISK_FIELDS = new Set([
    'evidence_score',
    'confidence_grade',
    'has_cross_merchant_identity',
    'is_network_flagged',
    'network_claim_count',
    'network_merchant_count',
    'network_same_type_claim_count',
  ]);

  it('ships at least one default rule', () => {
    expect(DEFAULT_PAYOUT_RULES.length).toBeGreaterThan(0);
  });

  it('every default rule has valid conditions and a valid action', () => {
    for (const rule of DEFAULT_PAYOUT_RULES) {
      expect(validateConditions(rule.conditions)).toEqual([]);
      expect(RULE_ACTIONS).toContain(rule.action);
    }
  });

  it('does not use any identity, network, or risk-score field', () => {
    const usedFields = DEFAULT_PAYOUT_RULES.flatMap((r) => r.conditions.map((c) => c.field));
    for (const field of usedFields) {
      expect(IDENTITY_NETWORK_RISK_FIELDS.has(field)).toBe(false);
    }
  });

  it('covers the core payout-policy scenarios', () => {
    const names = DEFAULT_PAYOUT_RULES.map((r) => r.name.toLowerCase()).join(' | ');
    expect(names).toContain('proof of delivery');
    expect(names).toContain('evidence');
    expect(names).toContain('recoverable');
    expect(names).toContain('high-value');
  });
});
