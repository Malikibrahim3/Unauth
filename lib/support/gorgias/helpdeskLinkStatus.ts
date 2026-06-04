import type { GorgiasSupportConnectionSettings } from '@/lib/support/gorgias/supportConnectionShared';

/** Canonical Gorgias helpdesk link states — shared by settings UI and Gorgias widget. */
export type GorgiasHelpdeskLinkState = 'connected' | 'degraded' | 'disconnected';

export type GorgiasHelpdeskLinkStatus = {
  state: GorgiasHelpdeskLinkState;
  /** True when status is active and API credentials are stored. */
  helpdeskLinked: boolean;
  /** True when the sidebar HTTP widget was registered in Gorgias. */
  widgetReady: boolean;
  /** Human-readable issues when state is degraded. */
  issues: string[];
};

export function evaluateGorgiasHelpdeskLink(
  connection: GorgiasSupportConnectionSettings | null,
): GorgiasHelpdeskLinkStatus {
  if (!connection || connection.status !== 'active') {
    return {
      state: 'disconnected',
      helpdeskLinked: false,
      widgetReady: false,
      issues: connection?.status === 'error' && connection.last_error
        ? [connection.last_error]
        : [],
    };
  }

  const issues: string[] = [];
  if (!connection.gorgias_api_configured) {
    issues.push('Gorgias API credentials are missing.');
  }
  if (!connection.sidebar_widget_registered) {
    issues.push('Sidebar widget is not registered in Gorgias.');
  }
  if (connection.last_error?.trim()) {
    issues.push(connection.last_error.trim());
  }

  const helpdeskLinked = connection.gorgias_api_configured;
  const widgetReady = helpdeskLinked && connection.sidebar_widget_registered;

  if (!helpdeskLinked) {
    return {
      state: 'disconnected',
      helpdeskLinked: false,
      widgetReady: false,
      issues,
    };
  }

  if (!widgetReady) {
    return {
      state: 'degraded',
      helpdeskLinked: true,
      widgetReady: false,
      issues,
    };
  }

  return {
    state: 'connected',
    helpdeskLinked: true,
    widgetReady: true,
    issues,
  };
}

/** Widget treats the helpdesk as disconnected unless the link is at least active + credentialed. */
export function isGorgiasHelpdeskLinkedForWidget(
  connection: GorgiasSupportConnectionSettings | null,
): boolean {
  return evaluateGorgiasHelpdeskLink(connection).helpdeskLinked;
}
