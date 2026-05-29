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
};
