import type { FreshdeskSupportConnectionSettings } from '@/lib/support/freshdesk/supportConnectionShared';

export type FreshdeskHelpdeskLinkState = 'connected' | 'degraded' | 'disconnected';

export type FreshdeskHelpdeskLinkStatus = {
  state: FreshdeskHelpdeskLinkState;
  helpdeskLinked: boolean;
  issues: string[];
};

export function evaluateFreshdeskHelpdeskLink(
  connection: FreshdeskSupportConnectionSettings | null,
): FreshdeskHelpdeskLinkStatus {
  if (!connection || connection.status !== 'active') {
    return {
      state: 'disconnected',
      helpdeskLinked: false,
      issues:
        connection?.status === 'error' && connection.last_error
          ? [connection.last_error]
          : [],
    };
  }

  const issues: string[] = [];
  if (!connection.freshdesk_api_configured) {
    issues.push('Freshdesk API key is not configured.');
  }
  if (connection.last_error?.trim()) {
    issues.push(connection.last_error.trim());
  }

  const helpdeskLinked = connection.freshdesk_api_configured;
  if (!helpdeskLinked) {
    return {
      state: 'disconnected',
      helpdeskLinked: false,
      issues,
    };
  }

  return {
    state: 'connected',
    helpdeskLinked: true,
    issues,
  };
}
