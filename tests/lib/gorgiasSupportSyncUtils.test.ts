import {
  formatGorgiasSidebarWidgetRegistrationWarning,
  isGorgiasIntegrationLimitError,
} from '@/components/settings/gorgiasSupportSyncUtils';

describe('gorgiasSupportSyncUtils', () => {
  describe('isGorgiasIntegrationLimitError', () => {
    it('detects Gorgias integration limit errors', () => {
      expect(
        isGorgiasIntegrationLimitError(
          'Your account has reached the integration limit. To add more integrations, upgrade your plan.',
        ),
      ).toBe(true);
    });

    it('returns false for other errors', () => {
      expect(isGorgiasIntegrationLimitError('Invalid API credentials')).toBe(false);
    });
  });

  describe('formatGorgiasSidebarWidgetRegistrationWarning', () => {
    it('explains how to fix integration limit errors', () => {
      const text = formatGorgiasSidebarWidgetRegistrationWarning(
        'Your account has reached the integration limit. To add more integrations, upgrade your plan.',
        true,
      );
      expect(text).toContain('integration limit');
      expect(text).toContain('Settings, then Integrations');
      expect(text).not.toContain('Reconnect to try again.');
    });

    it('keeps reconnect guidance for other sidebar registration failures', () => {
      const text = formatGorgiasSidebarWidgetRegistrationWarning('HTTP 500', false);
      expect(text).toContain('(HTTP 500)');
      expect(text).toContain('Reconnect to try again.');
    });
  });
});
