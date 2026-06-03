import { parseProductGateEnv, shouldEnforceProductGates } from '@/lib/product/gates';
import { ENTITLEMENT_META, getFeatureAccessLabel } from '@/lib/product/entitlements';

describe('product gates env', () => {
  it('shouldEnforceProductGates returns false when env var absent', () => {
    const prior = process.env.ENFORCE_PRODUCT_GATES;
    delete process.env.ENFORCE_PRODUCT_GATES;
    expect(shouldEnforceProductGates()).toBe(false);
    if (prior !== undefined) process.env.ENFORCE_PRODUCT_GATES = prior;
  });

  it('parseProductGateEnv handles true/false and 1/0', () => {
    expect(parseProductGateEnv(undefined)).toBe(false);
    expect(parseProductGateEnv('')).toBe(false);
    expect(parseProductGateEnv('true')).toBe(true);
    expect(parseProductGateEnv('TRUE')).toBe(true);
    expect(parseProductGateEnv('1')).toBe(true);
    expect(parseProductGateEnv('false')).toBe(false);
    expect(parseProductGateEnv('0')).toBe(false);
    expect(parseProductGateEnv('yes')).toBe(false);
  });
});

describe('entitlement metadata', () => {
  it('CHECKOUT_CONTROLS metadata is future-facing', () => {
    expect(ENTITLEMENT_META.CHECKOUT_CONTROLS.availability).toBe('future');
    expect(getFeatureAccessLabel('CHECKOUT_CONTROLS')).toContain('Future');
  });
});
