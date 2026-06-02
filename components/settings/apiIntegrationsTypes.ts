export type ApiKeyRow = {
  id: string;
  key_prefix: string;
  name: string;
  created_at: string;
  last_used_at: string | null;
  rate_limit_per_minute: number;
};

export type HelpdeskOption = {
  id: 'gorgias' | 'zendesk';
  name: string;
  description: string;
  statusKey: 'gorgias' | 'zendesk';
  href: string;
  logo: string;
};

export type ConnectionState = { connected: boolean; detail: string | null };
export type ConnectionStatus = {
  gorgias: ConnectionState;
  shopify: ConnectionState;
  zendesk: ConnectionState;
};
