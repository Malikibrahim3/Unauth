import { TABLES } from '@/lib/supabase/tables';
import { upsertSupportProviderConnection } from '@/lib/support/intake/store';
import {
  freshdeskBaseUrlFromDomain,
  normalizeFreshdeskDomain,
} from '@/lib/support/freshdesk/accountIdentity';
import { hashFreshdeskWebhookSecret } from '@/lib/support/freshdesk/webhookSecret';

export type UpsertFreshdeskSupportConnectionInput = {
  merchant_id: string;
  provider_account_id?: string | null;
  provider_account_name?: string | null;
  provider_base_url?: string | null;
  domain?: string | null;
  status?: 'active' | 'disabled' | 'revoked' | 'error';
  last_error?: string | null;
  webhookSecretPlaintext?: string | null;
  webhookSecretHash?: string | null;
  rotateWebhookSecret?: boolean;
  accessTokenEncrypted?: string | null;
};

type PatchableSupabase = {
  from: (table: string) => {
    update: (values: Record<string, unknown>) => {
      eq: (column: string, value: string) => Promise<{ error: { message: string } | null }>;
    };
  };
};

export async function upsertFreshdeskSupportConnection(
  supabase: Parameters<typeof upsertSupportProviderConnection>[0],
  input: UpsertFreshdeskSupportConnectionInput
) {
  const domain = input.domain ? normalizeFreshdeskDomain(input.domain) : null;
  const providerBaseUrl =
    input.provider_base_url ?? (domain ? freshdeskBaseUrlFromDomain(domain) : null);
  const providerAccountId = input.provider_account_id ?? domain ?? null;

  let webhook_secret_hash: string | undefined;
  if (input.webhookSecretPlaintext) {
    webhook_secret_hash = hashFreshdeskWebhookSecret(input.webhookSecretPlaintext);
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
    provider: 'freshdesk',
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

export async function touchFreshdeskSupportConnectionSync(
  supabase: unknown,
  connectionId: string
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
    throw new Error(`touch_freshdesk_connection_failed: ${error.message}`);
  }
}

export async function recordFreshdeskSupportConnectionError(
  supabase: unknown,
  connectionId: string,
  safeErrorCode: string
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
    throw new Error(`record_freshdesk_connection_error_failed: ${error.message}`);
  }
}

export async function markFreshdeskSupportConnectionRevoked(
  supabase: unknown,
  connectionId: string,
  safeErrorCode = 'freshdesk_api_credentials_revoked'
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
    throw new Error(`mark_freshdesk_connection_revoked_failed: ${error.message}`);
  }
}
