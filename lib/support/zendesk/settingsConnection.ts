import { z } from 'zod';
import { TABLES } from '@/lib/supabase/tables';
import { upsertZendeskSupportConnection } from '@/lib/support/zendesk/connectionStore';
import {
  normalizeZendeskSubdomain,
  zendeskBaseUrlFromSubdomain,
} from '@/lib/support/zendesk/accountIdentity';
import { encryptZendeskApiCredentials } from '@/lib/support/zendesk/credentialCrypto';
import { validateZendeskApiCredentials } from '@/lib/support/zendesk/zendeskApi';
import {
  generateZendeskWebhookSecret,
  isZendeskWebhookSecretSufficientLength,
} from '@/lib/support/zendesk/webhookSecret';
import {
  ZENDESK_SUPPORT_SECRET_SAVE_WARNING,
  ZENDESK_SUPPORT_WEBHOOK_HEADER_NAME,
  ZENDESK_SUPPORT_WEBHOOK_PATH,
  ZENDESK_WEBHOOK_DOMAIN_QUERY_PARAM,
  ZendeskCredentialsError,
  type ZendeskSupportConnectionSettings,
} from '@/lib/support/zendesk/supportConnectionShared';
import { env } from '@/lib/utils/env';

type ZendeskConnectionDbRow = {
  id: string;
  merchant_id: string;
  provider_account_id: string | null;
  provider_account_name: string | null;
  provider_base_url: string | null;
  status: string;
  last_sync_at: string | null;
  last_error: string | null;
  webhook_secret_hash: string | null;
  webhook_secret_rotated_at: string | null;
  access_token_encrypted: string | null;
};

// v2 helpdesk_connections has webhook_secret_rotated_at only (no *_created_at in SELECT)
const CONNECTION_SETTINGS_SELECT =
  'id, merchant_id, provider_account_id, provider_account_name, provider_base_url, status, last_sync_at, last_error, webhook_secret_hash, webhook_secret_rotated_at, access_token_encrypted';

type ListableSupabase = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        eq: (column: string, value: string) => {
          order: (
            column: string,
            opts: { ascending: boolean },
          ) => {
            limit: (n: number) => {
              maybeSingle: () => Promise<{
                data: ZendeskConnectionDbRow | null;
                error: { message: string } | null;
              }>;
            };
          };
        };
      };
    };
  };
};

export const zendeskSupportConnectionInputSchema = z.object({
  subdomain: z.string().trim().min(1),
  name: z.string().trim().min(1).max(200).optional(),
  zendesk_agent_email: z.string().trim().email(),
  zendesk_api_token: z.string().trim().min(1),
});

export type ZendeskSupportConnectionInput = z.infer<typeof zendeskSupportConnectionInputSchema>;

export function resolveZendeskConnectionIdentity(input: ZendeskSupportConnectionInput): {
  provider_account_id: string;
  subdomain: string;
  provider_base_url: string;
} {
  const subdomain = normalizeZendeskSubdomain(input.subdomain);
  return {
    provider_account_id: subdomain,
    subdomain,
    provider_base_url: zendeskBaseUrlFromSubdomain(subdomain),
  };
}

export type BuildZendeskSupportWebhookUrlOptions = {
  subdomain?: string | null;
};

export function buildZendeskSupportWebhookUrl(
  options?: BuildZendeskSupportWebhookUrlOptions,
): string {
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, '');
  const url = new URL(`${base}${ZENDESK_SUPPORT_WEBHOOK_PATH}`);
  const subdomain = options?.subdomain?.trim();
  if (subdomain) {
    url.searchParams.set(
      ZENDESK_WEBHOOK_DOMAIN_QUERY_PARAM,
      normalizeZendeskSubdomain(subdomain),
    );
  }
  return url.toString();
}

export function toZendeskSupportConnectionSettings(
  row: ZendeskConnectionDbRow,
): ZendeskSupportConnectionSettings {
  const {
    merchant_id: _merchantId,
    access_token_encrypted: _accessToken,
    webhook_secret_hash: _hash,
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
    zendesk_api_configured: Boolean(row.access_token_encrypted?.trim()),
    webhook_secret_configured: Boolean(row.webhook_secret_hash?.trim()),
    webhook_secret_rotated_at: rest.webhook_secret_rotated_at,
    webhook_url: buildZendeskSupportWebhookUrl(),
  };
}

export async function getMerchantZendeskSupportConnection(
  supabase: unknown,
  merchantId: string,
): Promise<ZendeskSupportConnectionSettings | null> {
  const { data, error } = await (supabase as ListableSupabase)
    .from(TABLES.SUPPORT_PROVIDER_CONNECTIONS)
    .select(CONNECTION_SETTINGS_SELECT)
    .eq('merchant_id', merchantId)
    .eq('provider', 'zendesk')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`get_zendesk_support_connection_failed: ${error.message}`);
  }

  return data ? toZendeskSupportConnectionSettings(data) : null;
}

async function validateAndEncryptCredentials(
  input: ZendeskSupportConnectionInput,
  providerBaseUrl: string,
  subdomain: string,
): Promise<string> {
  const credentials = {
    email: input.zendesk_agent_email,
    api_token: input.zendesk_api_token,
  };
  try {
    await validateZendeskApiCredentials(subdomain, credentials);
  } catch (error) {
    if (error instanceof ZendeskCredentialsError) {
      throw error;
    }
    throw new ZendeskCredentialsError('zendesk_credentials_invalid');
  }

  return encryptZendeskApiCredentials(credentials);
}

export type CreateZendeskSupportConnectionResult = {
  connection: ZendeskSupportConnectionSettings;
  webhook_secret_plaintext: string;
  webhook_url: string;
  header_name: string;
  warning: string;
  manual_webhook_setup: true;
};

export async function createMerchantZendeskSupportConnection(
  supabase: Parameters<typeof upsertZendeskSupportConnection>[0],
  merchantId: string,
  input: ZendeskSupportConnectionInput,
): Promise<CreateZendeskSupportConnectionResult> {
  const parsed = zendeskSupportConnectionInputSchema.parse(input);
  const identity = resolveZendeskConnectionIdentity(parsed);

  const existing = await getMerchantZendeskSupportConnection(supabase, merchantId);
  if (existing?.status === 'active' && existing.zendesk_api_configured) {
    throw new Error('zendesk_connection_already_exists');
  }

  const webhookSecretPlaintext = generateZendeskWebhookSecret();
  if (!isZendeskWebhookSecretSufficientLength(webhookSecretPlaintext)) {
    throw new Error('generated_webhook_secret_invalid');
  }

  const accessTokenEncrypted = await validateAndEncryptCredentials(
    parsed,
    identity.provider_base_url,
    identity.subdomain,
  );

  await upsertZendeskSupportConnection(supabase, {
    merchant_id: merchantId,
    provider_account_id: identity.provider_account_id,
    provider_account_name: parsed.name ?? null,
    provider_base_url: identity.provider_base_url,
    subdomain: identity.subdomain,
    status: 'active',
    last_error: null,
    webhookSecretPlaintext,
    rotateWebhookSecret: false,
    accessTokenEncrypted,
  });

  const connection = await getMerchantZendeskSupportConnection(supabase, merchantId);
  if (!connection) {
    throw new Error('zendesk_connection_missing_after_upsert');
  }

  return {
    connection,
    webhook_secret_plaintext: webhookSecretPlaintext,
    webhook_url: buildZendeskSupportWebhookUrl({
      subdomain: identity.subdomain,
    }),
    header_name: ZENDESK_SUPPORT_WEBHOOK_HEADER_NAME,
    warning: ZENDESK_SUPPORT_SECRET_SAVE_WARNING,
    manual_webhook_setup: true,
  };
}

export async function updateMerchantZendeskSupportConnection(
  supabase: Parameters<typeof upsertZendeskSupportConnection>[0],
  merchantId: string,
  input: ZendeskSupportConnectionInput,
): Promise<{ connection: ZendeskSupportConnectionSettings }> {
  const parsed = zendeskSupportConnectionInputSchema.parse(input);
  const existing = await getMerchantZendeskSupportConnection(supabase, merchantId);
  if (!existing) {
    throw new Error('zendesk_connection_not_found');
  }

  const identity = resolveZendeskConnectionIdentity(parsed);
  const accessTokenEncrypted = await validateAndEncryptCredentials(
    parsed,
    identity.provider_base_url,
    identity.subdomain,
  );

  await upsertZendeskSupportConnection(supabase, {
    merchant_id: merchantId,
    provider_account_id: identity.provider_account_id,
    provider_account_name: parsed.name ?? null,
    provider_base_url: identity.provider_base_url,
    subdomain: identity.subdomain,
    status: 'active',
    last_error: null,
    accessTokenEncrypted,
  });

  const connection = await getMerchantZendeskSupportConnection(supabase, merchantId);
  if (!connection) {
    throw new Error('zendesk_connection_missing_after_upsert');
  }

  return { connection };
}
