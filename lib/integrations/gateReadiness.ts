export type GateHealthConnection = {
  provider_id: string;
  status: string;
  freshness: 'current' | 'stale' | 'unknown';
  activeIssueCount: number;
  webhook_status?: string | null;
};

const READY_STATUSES = new Set(['connected', 'syncing']);
const READY_WEBHOOK_STATUSES = new Set(['active', 'connected', 'healthy', 'verified']);

/**
 * Connection rows alone are not evidence that a gate can operate. Gate
 * readiness requires a currently fresh, error-free canonical connection; a
 * helpdesk gate also requires an explicitly healthy webhook.
 */
export function hasGateReadyConnection(
  connections: GateHealthConnection[],
  providerId: string,
  options: { requireWebhook?: boolean } = {},
): boolean {
  return connections.some((connection) => {
    if (connection.provider_id !== providerId) return false;
    if (!READY_STATUSES.has(connection.status)) return false;
    if (connection.freshness !== 'current') return false;
    if (connection.activeIssueCount > 0) return false;
    if (options.requireWebhook && !READY_WEBHOOK_STATUSES.has(connection.webhook_status ?? '')) {
      return false;
    }
    return true;
  });
}
