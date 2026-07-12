import { DEFAULT_PLATFORM_SETTINGS, mergePlatformSettings, parsePlatformSettings, platformSettingsSchema } from '@/lib/settings/platform';
describe('platform settings', () => {
  it('provides validated defaults', () => { expect(parsePlatformSettings({})).toEqual(DEFAULT_PLATFORM_SETTINGS); });
  it('preserves unrelated merchant settings while replacing platform settings', () => { expect(mergePlatformSettings({ onboarding: { complete: true } }, platformSettingsSchema.parse({ reportingCurrency: 'USD' }))).toMatchObject({ onboarding: { complete: true }, platform: { reportingCurrency: 'USD' } }); });
  it('rejects invalid currency and unsafe retention', () => { expect(platformSettingsSchema.safeParse({ reportingCurrency: 'dollars', retentionDays: 1 }).success).toBe(false); });
});
