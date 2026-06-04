import type { ZendeskSupportConnectionSettings } from '@/lib/support/zendesk/supportConnectionShared';

export type ZendeskHelpdeskLinkState = 'connected' | 'degraded' | 'disconnected';

export type ZendeskHelpdeskLinkStatus = {
  state: ZendeskHelpdeskLinkState;
  /** True when API credentials are stored — ticket ingest and order linking can run. */
  helpdeskLinked: boolean;
  /** True when the private sidebar app install was verified in Unauth settings. */
  sidebarReady: boolean;
  issues: string[];
};

export function evaluateZendeskHelpdeskLink(
  connection: ZendeskSupportConnectionSettings | null,
): ZendeskHelpdeskLinkStatus {
  if (!connection || connection.status !== 'active') {
    return {
      state: 'disconnected',
      helpdeskLinked: false,
      sidebarReady: false,
      issues:
        connection?.status === 'error' && connection.last_error
          ? [connection.last_error]
          : [],
    };
  }

  const issues: string[] = [];
  const ticketSyncConfigured = connection.zendesk_api_configured;
  const sidebarReady = true;

  if (!ticketSyncConfigured) {
    issues.push(
      'Zendesk API token is not configured. Add subdomain and API token to import tickets into Unauth.',
    );
  }
  if (connection.last_error?.trim()) {
    issues.push(connection.last_error.trim());
  }

  if (!ticketSyncConfigured) {
    return {
      state: 'degraded',
      helpdeskLinked: false,
      sidebarReady,
      issues,
    };
  }

  return {
    state: 'connected',
    helpdeskLinked: true,
    sidebarReady,
    issues,
  };
}

export function isZendeskHelpdeskLinkedForIngest(
  connection: ZendeskSupportConnectionSettings | null,
): boolean {
  return evaluateZendeskHelpdeskLink(connection).helpdeskLinked;
}
