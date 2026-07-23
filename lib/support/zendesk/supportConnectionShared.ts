export const ZENDESK_CONNECT_CREDENTIALS_ERROR =
  'Could not connect to Zendesk. Check your subdomain, agent email, and API token.';
export const ZENDESK_CONNECT_CREDENTIALS_ERROR_CODE = 'zendesk_credentials_invalid';

export const ZENDESK_SUPPORT_SECRET_HEADERS = [
  'x-unauth-zendesk-secret',
  'x-zendesk-webhook-secret',
] as const;

export const ZENDESK_SUPPORT_WEBHOOK_PATH = '/api/zendesk/support-webhook';

export const ZENDESK_WEBHOOK_DOMAIN_QUERY_PARAM = 'zendesk_subdomain';

export const ZENDESK_SUPPORT_WEBHOOK_HEADER_NAME = ZENDESK_SUPPORT_SECRET_HEADERS[0];

export const ZENDESK_SUPPORT_SECRET_SAVE_WARNING =
  'Save this secret now. It will not be shown again.';

export type ZendeskSupportConnectionSettings = {
  id: string;
  provider_account_id: string | null;
  provider_account_name: string | null;
  provider_base_url: string | null;
  status: string;
  last_sync_at: string | null;
  last_error: string | null;
  zendesk_api_configured: boolean;
  webhook_secret_configured: boolean;
  webhook_secret_rotated_at: string | null;
  webhook_url: string;
};

export class ZendeskCredentialsError extends Error {
  constructor(message = 'zendesk_credentials_invalid') {
    super(message);
    this.name = 'ZendeskCredentialsError';
  }
}
