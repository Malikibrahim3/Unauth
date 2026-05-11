import { describe, expect, it } from '@jest/globals';
import { IDENTITY_PRODUCT_CONTRACT, isContextField, isCoreIdentityField } from '@/lib/identity/productContract';

describe('identity product contract', () => {
  it('keeps core identity inputs separate from merchant context', () => {
    for (const field of IDENTITY_PRODUCT_CONTRACT.coreInputs) {
      expect(isCoreIdentityField(field)).toBe(true);
      expect(isContextField(field)).toBe(false);
    }

    for (const field of IDENTITY_PRODUCT_CONTRACT.nonCoreContext) {
      expect(isContextField(field)).toBe(true);
      expect(isCoreIdentityField(field)).toBe(false);
    }
  });

  it('states the product is identity resolution, not fraud scoring', () => {
    expect(IDENTITY_PRODUCT_CONTRACT.productType).toBe('identity-resolution');
    expect(IDENTITY_PRODUCT_CONTRACT.coreQuestion).toMatch(/same person|household|account entity/);
  });
});
