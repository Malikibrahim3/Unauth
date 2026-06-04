export type ApiKeyRow = {
  id: string;
  key_prefix: string;
  name: string;
  created_at: string;
  last_used_at: string | null;
  rate_limit_per_minute: number;
};

export type HelpdeskOption = {
  id: 'gorgias' | 'zendesk' | 'freshdesk';
  name: string;
  description: string;
  statusKey: 'gorgias' | 'zendesk' | 'freshdesk';
  href: string;
  logo: string;
};

export type ConnectionState = { connected: boolean; detail: string | null };

export type GorgiasHelpdeskConnectionState = ConnectionState & {
  widgetReady: boolean;
  linkState: 'connected' | 'degraded' | 'disconnected';
};

export type ConnectionStatus = {
  gorgias: GorgiasHelpdeskConnectionState;
  shopify: ConnectionState;
  zendesk: ConnectionState;
  freshdesk: ConnectionState;
};
