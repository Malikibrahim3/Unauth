// Client-safe constants and types for the Freshdesk support connection.

export const FRESHDESK_SUPPORT_SECRET_HEADERS = [
  'x-unauth-freshdesk-secret',
  'x-freshdesk-webhook-secret',
] as const;

export const FRESHDESK_SUPPORT_WEBHOOK_PATH = '/api/freshdesk/support-webhook';

export const FRESHDESK_WEBHOOK_DOMAIN_QUERY_PARAM = 'freshdesk_domain';

export const FRESHDESK_SUPPORT_WEBHOOK_HEADER_NAME = FRESHDESK_SUPPORT_SECRET_HEADERS[0];

export const FRESHDESK_SUPPORT_SECRET_SAVE_WARNING =
  'Save this secret now. It will not be shown again.';

export const FRESHDESK_CONNECT_SUCCESS_MESSAGE =
  'Freshdesk connected. Complete the automation webhook steps below to sync tickets.';

export const FRESHDESK_CONNECT_CREDENTIALS_ERROR =
  'Could not connect to Freshdesk. Check your domain and API key and try again.';

export const FRESHDESK_CONNECT_CREDENTIALS_ERROR_CODE = 'freshdesk_credentials_invalid';

export class FreshdeskCredentialsError extends Error {
  constructor(public readonly detail: string) {
    super('freshdesk_credentials_invalid');
    this.name = 'FreshdeskCredentialsError';
  }
}

export type FreshdeskSupportConnectionSettings = {
  id: string;
  provider_account_id: string | null;
  provider_account_name: string | null;
  provider_base_url: string | null;
  status: string;
  last_sync_at: string | null;
  last_error: string | null;
  webhook_secret_configured: boolean;
  webhook_secret_created_at: string | null;
  webhook_secret_rotated_at: string | null;
  webhook_url: string;
  freshdesk_api_configured: boolean;
};
