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
