import {
  evaluateZendeskHelpdeskLink,
  isZendeskHelpdeskLinkedForIngest,
} from '@/lib/support/zendesk/helpdeskLinkStatus';
import type { ZendeskSupportConnectionSettings } from '@/lib/support/zendesk/supportConnectionShared';

function baseConnection(
  overrides: Partial<ZendeskSupportConnectionSettings> = {},
): ZendeskSupportConnectionSettings {
  return {
    id: 'conn-1',
    provider_account_id: 'unauth',
    provider_account_name: null,
    provider_base_url: 'https://unauth.zendesk.com',
    status: 'active',
    last_sync_at: null,
    last_error: null,
    zendesk_api_configured: false,
    ...overrides,
  };
}

describe('evaluateZendeskHelpdeskLink', () => {
  it('treats verify-install-only as degraded sidebar without ticket sync', () => {
    const link = evaluateZendeskHelpdeskLink(baseConnection());
    expect(link.state).toBe('degraded');
    expect(link.sidebarReady).toBe(true);
    expect(link.helpdeskLinked).toBe(false);
    expect(isZendeskHelpdeskLinkedForIngest(baseConnection())).toBe(false);
  });

  it('treats API credentials as connected for ingest', () => {
    const link = evaluateZendeskHelpdeskLink(
      baseConnection({ zendesk_api_configured: true }),
    );
    expect(link.state).toBe('connected');
    expect(link.helpdeskLinked).toBe(true);
    expect(isZendeskHelpdeskLinkedForIngest(baseConnection({ zendesk_api_configured: true }))).toBe(
      true,
    );
  });
});
