import { DEMO_CASE_STEPS, MERCHANT_CASE_V1 } from '@/lib/demo/merchantCaseV1';

describe('public demo fixture', () => {
  it('has the complete five-step supervised workflow', () => {
    expect(DEMO_CASE_STEPS.map((step) => step.id)).toEqual([
      'incoming',
      'evidence',
      'recommendation',
      'decision',
      'recovery',
    ]);
    expect(MERCHANT_CASE_V1.decisions.length).toBeGreaterThan(1);
  });

  it('contains no provider identifiers or real customer data', () => {
    const serialized = JSON.stringify(MERCHANT_CASE_V1).toLowerCase();
    expect(serialized).not.toContain('@');
    expect(serialized).not.toContain('shopify');
    expect(serialized).not.toContain('gorgias');
    expect(serialized).toContain('synthetic');
  });
});
