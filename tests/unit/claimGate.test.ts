import { classifyClaim, claimGateTypeToStoredClaimType } from '@/lib/claim-gate/classifyClaim';

describe('claim gate classifier', () => {
  it('classifies delivered-not-received wording', async () => {
    await expect(
      classifyClaim('Tracking says delivered but I never received it', 'refund_or_reship'),
    ).resolves.toBe('DELIVERED_NOT_RECEIVED');
  });

  it('classifies refund-after-shipment wording', async () => {
    await expect(
      classifyClaim('Please refund this, it has already shipped', 'refund'),
    ).resolves.toBe('REFUND_AFTER_SHIPMENT');
  });

  it('maps gate claim types onto the stored claim vocabulary', () => {
    expect(claimGateTypeToStoredClaimType('DELIVERED_NOT_RECEIVED')).toBe('item_not_received');
    expect(claimGateTypeToStoredClaimType('DAMAGED_ITEM')).toBe('damaged');
    expect(claimGateTypeToStoredClaimType('UNKNOWN')).toBe('other');
  });
});

