export const ZENDESK_CONNECT_CREDENTIALS_ERROR =
  'Could not connect to Zendesk. Check your subdomain, agent email, and API token.';
export const ZENDESK_CONNECT_CREDENTIALS_ERROR_CODE = 'zendesk_credentials_invalid';

export type ZendeskSupportConnectionSettings = {
  id: string;
  provider_account_id: string | null;
  provider_account_name: string | null;
  provider_base_url: string | null;
  status: string;
  last_sync_at: string | null;
  last_error: string | null;
  zendesk_api_configured: boolean;
};

export class ZendeskCredentialsError extends Error {
  constructor(message = 'zendesk_credentials_invalid') {
    super(message);
    this.name = 'ZendeskCredentialsError';
  }
}
