import {
  mergeMerchantSettings,
  parseMerchantSettings,
} from '@/lib/account/merchantProfile';

describe('merchant onboarding settings', () => {
  it('keeps deferred onboarding distinct from completed setup', () => {
    expect(parseMerchantSettings({
      onboarding_deferred_at: '2026-08-14T14:00:00.000Z',
      onboarding_profile_complete: false,
      setup_complete: false,
    })).toMatchObject({
      onboarding_deferred_at: '2026-08-14T14:00:00.000Z',
      onboarding_profile_complete: false,
      setup_complete: false,
    });
  });

  it('can clear a deferral without discarding unrelated merchant settings', () => {
    expect(mergeMerchantSettings(
      {
        onboarding_deferred_at: '2026-08-14T14:00:00.000Z',
        retained_setting: 'retained',
      },
      { onboarding_deferred_at: null },
    )).toEqual({
      onboarding_deferred_at: null,
      retained_setting: 'retained',
    });
  });
});

import { ORDER_VOLUME_OPTIONS, LEGACY_ORDER_VOLUME_OPTIONS, isMonthlyOrderVolume, orderVolumeCorrection } from '@/lib/constants/merchantProfile';

describe('monthly volume meaning', () => {
  it.each(ORDER_VOLUME_OPTIONS)('roundtrips $value with monthly units', ({ value }) => {
    expect(isMonthlyOrderVolume(value)).toBe(true);
    expect(parseMerchantSettings(mergeMerchantSettings({}, { monthly_order_volume: value })).monthly_order_volume).toBe(value);
    expect(orderVolumeCorrection(value)).toBeNull();
  });
  it.each(LEGACY_ORDER_VOLUME_OPTIONS)('preserves $value until a merchant corrects it', ({ value }) => {
    const stored = mergeMerchantSettings({ monthly_order_volume: value }, { platform: 'shopify' });
    expect(parseMerchantSettings(stored).monthly_order_volume).toBe(value);
    expect(orderVolumeCorrection(value)).toContain('annual band cannot establish');
    expect(parseMerchantSettings(mergeMerchantSettings(stored, { monthly_order_volume: null })).monthly_order_volume).toBeNull();
  });
  it('does not guess an unknown unit', () => {
    expect(orderVolumeCorrection('1000')).toContain('unknown');
    expect(orderVolumeCorrection(null)).toBeNull();
  });
});
