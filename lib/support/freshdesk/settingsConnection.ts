import { z } from 'zod';
import { TABLES } from '@/lib/supabase/tables';
import { env } from '@/lib/utils/env';
import { upsertFreshdeskSupportConnection } from '@/lib/support/freshdesk/connectionStore';
import {
  freshdeskBaseUrlFromDomain,
  normalizeFreshdeskDomain,
} from '@/lib/support/freshdesk/accountIdentity';
import {
  encryptFreshdeskApiCredentials,
} from '@/lib/support/freshdesk/credentialCrypto';
import { validateFreshdeskApiCredentials } from '@/lib/support/freshdesk/freshdeskApi';
import {
  generateFreshdeskWebhookSecret,
  isFreshdeskWebhookSecretSufficientLength,
} from '@/lib/support/freshdesk/webhookSecret';
import {
  FRESHDESK_SUPPORT_SECRET_SAVE_WARNING,
  FRESHDESK_SUPPORT_WEBHOOK_HEADER_NAME,
  FRESHDESK_SUPPORT_WEBHOOK_PATH,
  FRESHDESK_WEBHOOK_DOMAIN_QUERY_PARAM,
  FRESHDESK_WEBHOOK_SECRET_QUERY_PARAM,
  FreshdeskCredentialsError,
  type FreshdeskSupportConnectionSettings,
} from '@/lib/support/freshdesk/supportConnectionShared';

type FreshdeskConnectionDbRow = {
  id: string;
  merchant_id: string;
  provider_account_id: string | null;
  provider_account_name: string | null;
  provider_base_url: string | null;
  status: string;
  last_sync_at: string | null;
  last_error: string | null;
  webhook_secret_hash: string | null;
  webhook_secret_created_at: string | null;
  webhook_secret_rotated_at: string | null;
  access_token_encrypted: string | null;
};

const CONNECTION_SETTINGS_SELECT =
  'id, merchant_id, provider_account_id, provider_account_name, provider_base_url, status, last_sync_at, last_error, webhook_secret_hash, webhook_secret_created_at, webhook_secret_rotated_at, access_token_encrypted';

type ListableSupabase = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        eq: (column: string, value: string) => {
          order: (
            column: string,
            opts: { ascending: boolean }
          ) => {
            limit: (n: number) => {
              maybeSingle: () => Promise<{
                data: FreshdeskConnectionDbRow | null;
                error: { message: string } | null;
              }>;
            };
          };
        };
      };
    };
    update: (values: Record<string, unknown>) => {
      eq: (column: string, value: string) => {
        eq: (column2: string, value2: string) => {
          select: (columns: string) => {
            single: () => Promise<{
              data: FreshdeskConnectionDbRow | null;
              error: { message: string } | null;
            }>;
          };
        };
      };
    };
  };
};

export const freshdeskSupportConnectionInputSchema = z.object({
  domain: z.string().trim().min(1),
  name: z.string().trim().min(1).max(200).optional(),
  freshdesk_api_key: z.string().trim().min(1),
});

export type FreshdeskSupportConnectionInput = z.infer<
  typeof freshdeskSupportConnectionInputSchema
>;

export function resolveFreshdeskConnectionIdentity(input: FreshdeskSupportConnectionInput): {
  provider_account_id: string;
  domain: string;
  provider_base_url: string;
} {
  const domain = normalizeFreshdeskDomain(input.domain);
  return {
    provider_account_id: domain,
    domain,
    provider_base_url: freshdeskBaseUrlFromDomain(domain),
  };
}

export type BuildFreshdeskSupportWebhookUrlOptions = {
  domain?: string | null;
  webhookSecretPlaintext?: string | null;
};

export function buildFreshdeskSupportWebhookUrl(
  options?: BuildFreshdeskSupportWebhookUrlOptions
): string {
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, '');
  const url = new URL(`${base}${FRESHDESK_SUPPORT_WEBHOOK_PATH}`);
  const domain = options?.domain?.trim();
  if (domain) {
    url.searchParams.set(FRESHDESK_WEBHOOK_DOMAIN_QUERY_PARAM, normalizeFreshdeskDomain(domain));
  }
  const secret = options?.webhookSecretPlaintext?.trim();
  if (secret) {
    url.searchParams.set(FRESHDESK_WEBHOOK_SECRET_QUERY_PARAM, secret);
  }
  return url.toString();
}

export function toFreshdeskSupportConnectionSettings(
  row: FreshdeskConnectionDbRow
): FreshdeskSupportConnectionSettings {
  const {
    webhook_secret_hash: _hash,
    merchant_id: _merchantId,
    access_token_encrypted: _accessToken,
    ...rest
  } = row;

  return {
    id: rest.id,
    provider_account_id: rest.provider_account_id,
    provider_account_name: rest.provider_account_name,
    provider_base_url: rest.provider_base_url,
    status: rest.status,
    last_sync_at: rest.last_sync_at,
    last_error: rest.last_error,
    webhook_secret_configured: Boolean(row.webhook_secret_hash?.trim()),
    webhook_secret_created_at: rest.webhook_secret_created_at,
    webhook_secret_rotated_at: rest.webhook_secret_rotated_at,
    webhook_url: buildFreshdeskSupportWebhookUrl(),
    freshdesk_api_configured: Boolean(row.access_token_encrypted?.trim()),
  };
}

export async function getMerchantFreshdeskSupportConnection(
  supabase: unknown,
  merchantId: string
): Promise<FreshdeskSupportConnectionSettings | null> {
  const { data, error } = await (supabase as ListableSupabase)
    .from(TABLES.SUPPORT_PROVIDER_CONNECTIONS)
    .select(CONNECTION_SETTINGS_SELECT)
    .eq('merchant_id', merchantId)
    .eq('provider', 'freshdesk')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`get_freshdesk_support_connection_failed: ${error.message}`);
  }

  return data ? toFreshdeskSupportConnectionSettings(data) : null;
}

export type CreateFreshdeskSupportConnectionResult = {
  connection: FreshdeskSupportConnectionSettings;
  webhook_secret_plaintext: string;
  webhook_url: string;
  header_name: string;
  warning: string;
  manual_webhook_setup: true;
};

export type UpdateFreshdeskSupportConnectionResult = {
  connection: FreshdeskSupportConnectionSettings;
};

export type RotateFreshdeskWebhookSecretResult = {
  connection: FreshdeskSupportConnectionSettings;
  webhook_secret_plaintext: string;
  webhook_url: string;
  header_name: string;
  warning: string;
};

async function validateAndEncryptCredentials(
  input: FreshdeskSupportConnectionInput,
  providerBaseUrl: string
): Promise<string> {
  try {
    await validateFreshdeskApiCredentials(providerBaseUrl, input.freshdesk_api_key);
  } catch (error) {
    if (error instanceof FreshdeskCredentialsError) {
      throw error;
    }
    throw new FreshdeskCredentialsError('freshdesk_credentials_invalid');
  }

  return encryptFreshdeskApiCredentials({ api_key: input.freshdesk_api_key });
}

export async function createMerchantFreshdeskSupportConnection(
  supabase: Parameters<typeof upsertFreshdeskSupportConnection>[0],
  merchantId: string,
  input: FreshdeskSupportConnectionInput
): Promise<CreateFreshdeskSupportConnectionResult> {
  const parsed = freshdeskSupportConnectionInputSchema.parse(input);
  const identity = resolveFreshdeskConnectionIdentity(parsed);

  const existing = await getMerchantFreshdeskSupportConnection(supabase, merchantId);
  if (existing && !(existing.status === 'disabled' && !existing.freshdesk_api_configured)) {
    throw new Error('freshdesk_connection_already_exists');
  }

  const webhookSecretPlaintext = generateFreshdeskWebhookSecret();
  if (!isFreshdeskWebhookSecretSufficientLength(webhookSecretPlaintext)) {
    throw new Error('generated_webhook_secret_invalid');
  }

  const accessTokenEncrypted = await validateAndEncryptCredentials(parsed, identity.provider_base_url);

  await upsertFreshdeskSupportConnection(supabase, {
    merchant_id: merchantId,
    provider_account_id: identity.provider_account_id,
    domain: identity.domain,
    provider_base_url: identity.provider_base_url,
    provider_account_name: parsed.name ?? null,
    status: 'active',
    last_error: null,
    webhookSecretPlaintext,
    rotateWebhookSecret: false,
    accessTokenEncrypted,
  });

  const connection = await getMerchantFreshdeskSupportConnection(supabase, merchantId);
  if (!connection) {
    throw new Error('freshdesk_connection_missing_after_upsert');
  }

  return {
    connection,
    webhook_secret_plaintext: webhookSecretPlaintext,
    webhook_url: buildFreshdeskSupportWebhookUrl({
      domain: identity.domain,
      webhookSecretPlaintext,
    }),
    header_name: FRESHDESK_SUPPORT_WEBHOOK_HEADER_NAME,
    warning: FRESHDESK_SUPPORT_SECRET_SAVE_WARNING,
    manual_webhook_setup: true,
  };
}

export async function updateMerchantFreshdeskSupportConnectionMetadata(
  supabase: Parameters<typeof upsertFreshdeskSupportConnection>[0],
  merchantId: string,
  input: FreshdeskSupportConnectionInput
): Promise<UpdateFreshdeskSupportConnectionResult> {
  const parsed = freshdeskSupportConnectionInputSchema.parse(input);
  const existing = await getMerchantFreshdeskSupportConnection(supabase, merchantId);
  if (!existing) {
    throw new Error('freshdesk_connection_not_found');
  }

  const identity = resolveFreshdeskConnectionIdentity(parsed);
  const accessTokenEncrypted = await validateAndEncryptCredentials(parsed, identity.provider_base_url);

  await upsertFreshdeskSupportConnection(supabase, {
    merchant_id: merchantId,
    provider_account_id: identity.provider_account_id,
    domain: identity.domain,
    provider_base_url: identity.provider_base_url,
    provider_account_name: parsed.name ?? null,
    status: 'active',
    last_error: null,
    accessTokenEncrypted,
  });

  const connection = await getMerchantFreshdeskSupportConnection(supabase, merchantId);
  if (!connection) {
    throw new Error('freshdesk_connection_missing_after_upsert');
  }

  return { connection };
}

export async function rotateMerchantFreshdeskWebhookSecret(
  supabase: Parameters<typeof upsertFreshdeskSupportConnection>[0],
  merchantId: string
): Promise<RotateFreshdeskWebhookSecretResult> {
  const existing = await getMerchantFreshdeskSupportConnection(supabase, merchantId);
  if (!existing) {
    throw new Error('freshdesk_connection_not_found');
  }

  const webhookSecretPlaintext = generateFreshdeskWebhookSecret();
  if (!isFreshdeskWebhookSecretSufficientLength(webhookSecretPlaintext)) {
    throw new Error('generated_webhook_secret_invalid');
  }

  const domain =
    existing.provider_account_id ??
    existing.provider_base_url?.replace(/^https?:\/\//i, '').split('/')[0] ??
    null;

  await upsertFreshdeskSupportConnection(supabase, {
    merchant_id: merchantId,
    provider_account_id: existing.provider_account_id,
    provider_base_url: existing.provider_base_url,
    provider_account_name: existing.provider_account_name,
    status: 'active',
    webhookSecretPlaintext,
    rotateWebhookSecret: true,
    domain,
  });

  const connection = await getMerchantFreshdeskSupportConnection(supabase, merchantId);
  if (!connection) {
    throw new Error('freshdesk_connection_missing_after_upsert');
  }

  return {
    connection,
    webhook_secret_plaintext: webhookSecretPlaintext,
    webhook_url: buildFreshdeskSupportWebhookUrl({
      domain,
      webhookSecretPlaintext,
    }),
    header_name: FRESHDESK_SUPPORT_WEBHOOK_HEADER_NAME,
    warning: FRESHDESK_SUPPORT_SECRET_SAVE_WARNING,
  };
}

export async function disableMerchantFreshdeskSupportConnection(
  supabase: unknown,
  merchantId: string
): Promise<FreshdeskSupportConnectionSettings> {
  const existing = await getMerchantFreshdeskSupportConnection(supabase, merchantId);
  if (!existing) {
    throw new Error('freshdesk_connection_not_found');
  }

  const now = new Date().toISOString();
  const { data, error } = await (supabase as ListableSupabase)
    .from(TABLES.SUPPORT_PROVIDER_CONNECTIONS)
    .update({
      status: 'disabled',
      access_token_encrypted: null,
      webhook_secret_hash: null,
      webhook_secret_created_at: null,
      webhook_secret_rotated_at: null,
      last_error: null,
      updated_at: now,
    })
    .eq('id', existing.id)
    .eq('merchant_id', merchantId)
    .select(CONNECTION_SETTINGS_SELECT)
    .single();

  if (error) {
    throw new Error(`disable_freshdesk_connection_failed: ${error.message}`);
  }

  if (!data) {
    throw new Error('freshdesk_connection_not_found');
  }

  return toFreshdeskSupportConnectionSettings(data);
}
