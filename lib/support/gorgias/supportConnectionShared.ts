// Client-safe constants and types for the Gorgias support connection.
//
// IMPORTANT: this module must not import any server-only code (env, node:crypto,
// the Supabase service client, etc.). It is imported by the client component
// `GorgiasSupportSyncClient`, so anything it pulls in is bundled into the
// browser. The server-side helpers in `settingsConnection.ts` re-export from
// here, so API routes keep their existing import paths.

export const GORGIAS_SUPPORT_SECRET_HEADERS = [
  'x-unauth-gorgias-secret',
  'x-gorgias-webhook-secret',
] as const;

export const GORGIAS_SUPPORT_WEBHOOK_PATH = '/api/gorgias/support-webhook';

export const GORGIAS_SUPPORT_WEBHOOK_HEADER_NAME = GORGIAS_SUPPORT_SECRET_HEADERS[0];

export const GORGIAS_SUPPORT_SECRET_SAVE_WARNING =
  'Save this secret now. It will not be shown again.';

// Note shown in place of the old manual widget setup steps — registration is automated.
export const GORGIAS_SIDEBAR_AUTO_NOTE =
  'Once connected, Unauth will automatically appear in your Gorgias ticket sidebar.';

// Connection result copy, shared so the route and the client agree on the exact text.
export const GORGIAS_CONNECT_SUCCESS_MESSAGE =
  'Gorgias connected. Unauth will now appear in every ticket sidebar.';

export const GORGIAS_CONNECT_CREDENTIALS_ERROR =
  'Could not connect to Gorgias. Check your API email and key and try again.';

export const GORGIAS_CONNECT_CREDENTIALS_ERROR_CODE = 'gorgias_credentials_invalid';

export type GorgiasSidebarScopeEntry = {
  kind: 'gorgias_sidebar_widget';
  integration_id: number;
  widget_id: number;
  registered_at: string;
};

export type GorgiasSupportConnectionSettings = {
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
  gorgias_api_configured: boolean;
  sidebar_widget_registered: boolean;
  sidebar_integration_id: number | null;
  sidebar_widget_id: number | null;
};

export type GorgiasSidebarWidgetSetupResult = {
  status: 'success' | 'error';
  integration_id?: number;
  widget_id?: number;
  error?: string;
  // 'auth' = Gorgias rejected the API credentials (treated as a hard connect failure);
  // 'other' = a non-credential failure (e.g. missing domain) the merchant can work around.
  error_kind?: 'auth' | 'other';
  widget_token_plaintext?: string;
};
