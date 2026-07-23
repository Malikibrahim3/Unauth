import {
  DEFAULT_PLATFORM_SETTINGS,
  mergePlatformSettings,
  parsePlatformSettings,
  platformSettingsSchema,
} from "@/lib/settings/platform";

describe("platform settings", () => {
  it("provides validated defaults", () => {
    expect(parsePlatformSettings({})).toEqual(DEFAULT_PLATFORM_SETTINGS);
  });

  it("recovers legacy JSON-string settings without losing valid values", () => {
    expect(
      parsePlatformSettings(
        JSON.stringify({
          platform: JSON.stringify({
            reportingCurrency: "USD",
            timezone: "America/New_York",
          }),
        }),
      ),
    ).toMatchObject({
      reportingCurrency: "USD",
      timezone: "America/New_York",
      retentionDays: DEFAULT_PLATFORM_SETTINGS.retentionDays,
    });
  });

  it("falls back field-by-field when stored legacy values are invalid", () => {
    expect(
      parsePlatformSettings({
        platform: { reportingCurrency: "GBP", retentionDays: "never" },
      }),
    ).toMatchObject({
      reportingCurrency: "GBP",
      retentionDays: DEFAULT_PLATFORM_SETTINGS.retentionDays,
    });
  });

  it("preserves unrelated merchant settings while replacing platform settings", () => {
    expect(
      mergePlatformSettings(
        JSON.stringify({ onboarding: { complete: true } }),
        platformSettingsSchema.parse({ reportingCurrency: "USD" }),
      ),
    ).toMatchObject({
      onboarding: { complete: true },
      platform: { reportingCurrency: "USD" },
    });
  });

  it("rejects invalid currency and unsafe retention while allowing no policy", () => {
    expect(
      platformSettingsSchema.safeParse({
        reportingCurrency: "dollars",
        retentionDays: 1,
      }).success,
    ).toBe(false);
    expect(platformSettingsSchema.safeParse({ retentionDays: null }).success).toBe(true);
  });
});
