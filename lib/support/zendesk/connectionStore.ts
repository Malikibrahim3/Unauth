import { TABLES } from '@/lib/supabase/tables';
import { upsertSupportProviderConnection } from '@/lib/support/intake/store';
import {
  normalizeZendeskSubdomain,
  zendeskBaseUrlFromSubdomain,
} from '@/lib/support/zendesk/accountIdentity';
import { hashZendeskWebhookSecret } from '@/lib/support/zendesk/webhookSecret';

export type UpsertZendeskSupportConnectionInput = {
  merchant_id: string;
  provider_account_id?: string | null;
  provider_account_name?: string | null;
  provider_base_url?: string | null;
  subdomain?: string | null;
  status?: 'active' | 'disabled' | 'revoked' | 'error';
  last_error?: string | null;
  accessTokenEncrypted?: string | null;
  webhookSecretPlaintext?: string | null;
  webhookSecretHash?: string | null;
  rotateWebhookSecret?: boolean;
};

export async function upsertZendeskSupportConnection(
  supabase: Parameters<typeof upsertSupportProviderConnection>[0],
  input: UpsertZendeskSupportConnectionInput,
) {
  const subdomain = input.subdomain ? normalizeZendeskSubdomain(input.subdomain) : null;
  const providerBaseUrl =
    input.provider_base_url ?? (subdomain ? zendeskBaseUrlFromSubdomain(subdomain) : null);
  const providerAccountId = input.provider_account_id ?? subdomain ?? null;

  let webhook_secret_hash: string | undefined;
  if (input.webhookSecretPlaintext) {
    webhook_secret_hash = hashZendeskWebhookSecret(input.webhookSecretPlaintext);
  } else if (input.webhookSecretHash) {
    webhook_secret_hash = input.webhookSecretHash;
  }

  const now = new Date().toISOString();
  const secretFields =
    webhook_secret_hash !== undefined
      ? {
          webhook_secret_hash,
          ...(input.rotateWebhookSecret
            ? { webhook_secret_rotated_at: now }
            : { webhook_secret_created_at: now }),
        }
      : {};

  return upsertSupportProviderConnection(supabase, {
    merchant_id: input.merchant_id,
    provider: 'zendesk',
    provider_account_id: providerAccountId,
    provider_account_name: input.provider_account_name ?? null,
    provider_base_url: providerBaseUrl,
    status: input.status ?? 'active',
    last_error: input.last_error ?? null,
    ...(input.accessTokenEncrypted !== undefined
      ? { access_token_encrypted: input.accessTokenEncrypted }
      : {}),
    ...secretFields,
  });
}

type PatchableSupabase = {
  from: (table: string) => {
    update: (values: Record<string, unknown>) => {
      eq: (column: string, value: string) => Promise<{ error: { message: string } | null }>;
    };
  };
};

export async function touchZendeskSupportConnectionSync(
  supabase: unknown,
  connectionId: string,
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await (supabase as PatchableSupabase)
    .from(TABLES.SUPPORT_PROVIDER_CONNECTIONS)
    .update({
      last_sync_at: now,
      last_error: null,
      updated_at: now,
    })
    .eq('id', connectionId);

  if (error) {
    throw new Error(`touch_zendesk_connection_failed: ${error.message}`);
  }
}

export async function recordZendeskSupportConnectionError(
  supabase: unknown,
  connectionId: string,
  safeErrorCode: string,
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await (supabase as PatchableSupabase)
    .from(TABLES.SUPPORT_PROVIDER_CONNECTIONS)
    .update({
      last_error: safeErrorCode.slice(0, 500),
      updated_at: now,
    })
    .eq('id', connectionId);

  if (error) {
    throw new Error(`record_zendesk_connection_error_failed: ${error.message}`);
  }
}

export async function markZendeskSupportConnectionRevoked(
  supabase: unknown,
  connectionId: string,
  safeErrorCode = 'zendesk_api_credentials_revoked',
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await (supabase as PatchableSupabase)
    .from(TABLES.SUPPORT_PROVIDER_CONNECTIONS)
    .update({
      status: 'revoked',
      last_error: safeErrorCode.slice(0, 500),
      updated_at: now,
    })
    .eq('id', connectionId);

  if (error) {
    throw new Error(`mark_zendesk_connection_revoked_failed: ${error.message}`);
  }
}
