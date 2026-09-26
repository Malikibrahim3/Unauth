import { evaluateRules, type MerchantRule, type RuleCondition } from '@/lib/rules-engine';
import { compareRuleImpact, impactWindow, type ImpactCase } from '@/lib/rules/impact';
import { signImpactProof, verifyImpactProof } from '@/lib/rules/impactToken';
const condition = (partial: Partial<RuleCondition> = {}): RuleCondition => ({ id: 'c', field: 'amount_at_risk', operator: 'gte', value: 100, currency: 'GBP', ...partial });
const rule = (conditions = [condition()], partial: Partial<MerchantRule> = {}): MerchantRule => ({ id: 'r', merchant_id: 'm', name: 'Review threshold', description: null, is_active: true, priority: 0, action: 'manual_review', conditions, condition_operator: 'and', ...partial });
const fallback = rule([], { id: 'fallback', priority: 1, action: 'approve' });
const claim = (amount: number, currency: string | null = 'GBP', id = String(amount)): ImpactCase => ({ id, submittedAt: '2026-09-05T00:00:00Z', sourceHash: id, exposure: amount, currency, signals: { amount_at_risk: amount, amount_at_risk_currency: currency } });

describe('P08 complete-policy impact', () => {
  it('changes exactly £120 and £130 for a £100 to £150 threshold', () => {
    const result = compareRuleImpact([80, 120, 130, 180].map(amount => claim(amount)), [rule(), fallback], [rule([condition({ value: 150 })]), fallback]);
    expect(result.rows.filter(row => row.state === 'changed').map(row => row.id)).toEqual(['120', '130']);
    expect(result.affectedExposureMinor).toEqual({ GBP: 25000 });
    expect(result.before).toEqual({ manual_review: 3, approve: 1, deny: 0, no_match: 0 });
    expect(result.after).toEqual({ manual_review: 1, approve: 3, deny: 0, no_match: 0 });
  });
  it.each([null, 'USD', 'XXX'])('keeps %s currency inconclusive and out of definite totals', currency => {
    const result = compareRuleImpact([claim(120, currency)], [rule(), fallback], [fallback]);
    expect(result.insufficientEvidenceCount).toBe(1);
    expect(result.changedCount).toBe(0);
    expect(result.before.approve).toBe(0);
    expect(result.affectedExposureMinor).toEqual({});
  });
  it('does not invent a legacy threshold currency', () => {
    expect(evaluateRules(claim(120).signals, [rule([condition({ currency: undefined })]), fallback]).certainty).toBe('insufficient_evidence');
  });
  it('preserves a conclusive AND false when the other input is missing', () => {
    const result = evaluateRules({ merchant_claim_count: 1 }, [rule([condition(), condition({ field: 'merchant_claim_count', operator: 'gt', value: 5 })]), fallback]);
    expect(result.rule_id).toBe('fallback');
  });
  it('preserves a conclusive OR true when the other input is missing', () => {
    const result = evaluateRules({ merchant_claim_count: 10 }, [rule([condition(), condition({ field: 'merchant_claim_count', operator: 'gt', value: 5 })], { condition_operator: 'or' }), fallback]);
    expect(result.rule_id).toBe('r');
  });
  it('does not evaluate irrelevant later unknown rules after a winner', () => {
    expect(evaluateRules({}, [rule([], { priority: -1, action: 'deny' }), rule([condition()])]).recommendation).toBe('deny');
  });
  it('does not fall through a potentially winning unknown condition', () => {
    expect(evaluateRules({}, [rule(), fallback])).toMatchObject({ rule_id: null, certainty: 'insufficient_evidence', recommendation: 'manual_review' });
  });
  it('treats unavailable observed counts differently from verified zero', () => {
    const policy = [rule([condition({ field: 'evidence_items_count', operator: 'eq', value: 0 })])];
    expect(evaluateRules({ evidence_items_count: 0 }, policy).rule_id).toBe('r');
    expect(evaluateRules({ evidence_items_count: 0, unavailable_rule_inputs: ['evidence_items_count'] }, policy).certainty).toBe('insufficient_evidence');
  });
  it('fails closed for an unsupported operator', () => {
    expect(evaluateRules(claim(120).signals, [rule([condition({ operator: 'mystery' })]), fallback]).certainty).toBe('insufficient_evidence');
  });
  it.each([['gt', 100, false], ['gte', 100, true], ['lt', 100, false], ['lte', 100, true]] as const)('honours %s at its exact boundary', (operator, amount, matches) => {
    expect(evaluateRules(claim(amount).signals, [rule([condition({ operator })])]).rule_id).toBe(matches ? 'r' : null);
  });
  it('accepts 500 and rejects 501 without sampling', () => {
    expect(compareRuleImpact(Array.from({ length: 500 }, (_, index) => claim(120, 'GBP', String(index))), [], []).rows).toHaveLength(500);
    expect(() => compareRuleImpact(Array.from({ length: 501 }, (_, index) => claim(120, 'GBP', String(index))), [], [])).toThrow('500');
  });
  it.each([7, 30, 90])('freezes an exact %d-day scope', days => {
    const result = impactWindow(days, '2026-09-06T12:00:00Z');
    expect(Date.parse(result.endAt) - Date.parse(result.startAt)).toBe(days * 86400000);
    expect(result.timezone).toBe('UTC');
  });
  it('rejects unsupported windows', () => { expect(() => impactWindow(31, '2026-09-06T12:00:00Z')).toThrow(); });
  it('separates currencies and honours JPY minor units', () => {
    const result = compareRuleImpact([claim(120), claim(200, 'JPY'), claim(50, 'USD')], [rule([], { action: 'deny' })], [fallback]);
    expect(result.affectedExposureMinor).toEqual({ GBP: 12000, JPY: 200, USD: 5000 });
  });
  it('pagination slices one frozen response after source objects change', () => {
    const cases = Array.from({ length: 51 }, (_, i) => claim(120, 'GBP', String(i)));
    const result = compareRuleImpact(cases, [rule()], [fallback]);
    cases[50]!.signals = {};
    expect(result.rows.slice(50)[0]!.state).toBe('changed');
    expect(result.rows.slice(0, 50)).toHaveLength(50);
  });
});

describe('P08 signed read-only proof', () => {
  const proof = { merchantId: 'merchant', target: 'rule', proposedHash: 'hash', revision: '1', expiresAt: Date.now() + 60000, evaluatedCount: 1 };
  beforeAll(() => { process.env.SUPABASE_SERVICE_ROLE_KEY = 'isolated-test-signing-key'; });
  it('accepts only the signed tenant and target', () => {
    const token = signImpactProof(proof);
    expect(verifyImpactProof(token, 'merchant', 'rule')).toEqual(proof);
    expect(verifyImpactProof(token, 'other', 'rule')).toBeNull();
    expect(verifyImpactProof(token, 'merchant', 'other')).toBeNull();
  });
  it('rejects forged, expired and malformed material', () => {
    expect(verifyImpactProof(`${signImpactProof(proof)}x`, 'merchant', 'rule')).toBeNull();
    expect(verifyImpactProof(signImpactProof({ ...proof, expiresAt: Date.now() - 1 }), 'merchant', 'rule')).toBeNull();
    expect(verifyImpactProof({}, 'merchant', 'rule')).toBeNull();
  });
});
