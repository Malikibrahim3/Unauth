export interface WebhookEvent {
  at: string;
  topic: string | null;
  status: string;
}

export interface ShopifyStatus {
  connected: boolean;
  linkState?: 'connected' | 'not_connected' | 'disconnected' | 'installed_unlinked';
  shopDomain?: string;
  lastOrderSyncedAt?: string | null;
  lastSyncAt?: string | null;
  lastWebhookAt?: string | null;
  lastWebhookTopic?: string | null;
  lastWebhookStatus?: string | null;
  orderCount?: number;
  auditTransactionCount?: number;
  lastError?: string | null;
  scopes?: string[];
  dataSources?: string[];
  webhookFailures?: number;
  recentWebhooks?: WebhookEvent[];
}

export type SyncStatusVariant = 'card' | 'inline';
