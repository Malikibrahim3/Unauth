/**
 * Cross-scenario runtime state. Scenario 1 always runs first and records the
 * primary merchant's connection (account id + one-time webhook secret) here so
 * later scenarios can sign their webhook POSTs. Scenario 6 adds merchant B.
 */

export type ConnectionInfo = {
  merchantId: string;
  /** provider_account_id stored on the connection — used as the x-gorgias-account-id routing header. */
  accountId: string;
  domain: string;
  /** One-time plaintext webhook secret captured at create/rotate. */
  secretPlaintext: string;
  supportWebhookIntegrationId: number | null;
  sidebarIntegrationId: number | null;
  sidebarWidgetId: number | null;
};

const connections = new Map<string, ConnectionInfo>();

export function setConnection(info: ConnectionInfo): void {
  connections.set(info.merchantId, info);
}

export function getConnection(merchantId: string): ConnectionInfo {
  const c = connections.get(merchantId);
  if (!c) {
    throw new Error(
      `No captured connection for merchant ${merchantId}. Scenario 1 must run first to record the webhook secret.`
    );
  }
  return c;
}

export function hasConnection(merchantId: string): boolean {
  return connections.has(merchantId);
}
