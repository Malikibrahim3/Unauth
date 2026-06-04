import {
  evaluateGorgiasHelpdeskLink,
  isGorgiasHelpdeskLinkedForWidget,
} from '@/lib/support/gorgias/helpdeskLinkStatus';
import type { GorgiasSupportConnectionSettings } from '@/lib/support/gorgias/supportConnectionShared';

function baseConnection(
  overrides: Partial<GorgiasSupportConnectionSettings> = {},
): GorgiasSupportConnectionSettings {
  return {
    id: 'conn-1',
    provider_account_id: 'unauth.gorgias.com',
    provider_account_name: 'Unauth',
    provider_base_url: 'https://unauth.gorgias.com',
    status: 'active',
    last_sync_at: null,
    last_error: null,
    webhook_secret_configured: true,
    webhook_secret_created_at: null,
    webhook_secret_rotated_at: null,
    webhook_url: 'https://app.example/api/gorgias/support-webhook',
    gorgias_api_configured: true,
    sidebar_widget_registered: true,
    sidebar_integration_id: 1,
    sidebar_widget_id: 2,
    support_webhook_registered: true,
    support_webhook_integration_id: 3,
    ...overrides,
  };
}

describe('evaluateGorgiasHelpdeskLink', () => {
  it('marks a fully configured active connection as connected', () => {
    const link = evaluateGorgiasHelpdeskLink(baseConnection());
    expect(link.state).toBe('connected');
    expect(link.helpdeskLinked).toBe(true);
    expect(link.widgetReady).toBe(true);
    expect(isGorgiasHelpdeskLinkedForWidget(baseConnection())).toBe(true);
  });

  it('marks active without sidebar registration as degraded', () => {
    const connection = baseConnection({ sidebar_widget_registered: false });
    const link = evaluateGorgiasHelpdeskLink(connection);
    expect(link.state).toBe('degraded');
    expect(link.helpdeskLinked).toBe(true);
    expect(link.widgetReady).toBe(false);
    expect(isGorgiasHelpdeskLinkedForWidget(connection)).toBe(true);
  });

  it('marks disabled or missing credentials as disconnected for the widget', () => {
    expect(evaluateGorgiasHelpdeskLink(null).state).toBe('disconnected');
    expect(isGorgiasHelpdeskLinkedForWidget(null)).toBe(false);
    expect(
      isGorgiasHelpdeskLinkedForWidget(
        baseConnection({ status: 'disabled', gorgias_api_configured: false }),
      ),
    ).toBe(false);
  });
});
