import { z } from 'zod';
import { TABLES } from '@/lib/supabase/tables';
import { upsertGorgiasSupportConnection } from '@/lib/support/gorgias/connectionStore';
import {
  gorgiasBaseUrlFromDomain,
  normalizeGorgiasDomain,
} from '@/lib/support/gorgias/accountIdentity';
import {
  generateGorgiasWebhookSecret,
  isGorgiasWebhookSecretSufficientLength,
} from '@/lib/support/gorgias/webhookSecret';
import { env } from '@/lib/utils/env';

// Client-safe constants/type live in the shared module so the client component
// can import them without dragging server-only code into the browser bundle.
// Re-exported here so existing server-side import paths keep working.
export {
  GORGIAS_SUPPORT_WEBHOOK_PATH,
  GORGIAS_SUPPORT_WEBHOOK_HEADER_NAME,
  GORGIAS_SUPPORT_SECRET_SAVE_WARNING,
  type GorgiasSupportConnectionSettings,
} from '@/lib/support/gorgias/supportConnectionShared';
import {
  GORGIAS_SUPPORT_WEBHOOK_PATH,
  GORGIAS_SUPPORT_WEBHOOK_HEADER_NAME,
  GORGIAS_SUPPORT_SECRET_SAVE_WARNING,
  type GorgiasSupportConnectionSettings,
} from '@/lib/support/gorgias/supportConnectionShared';

type GorgiasConnectionDbRow = {
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
};

const CONNECTION_SETTINGS_SELECT =
  'id, merchant_id, provider_account_id, provider_account_name, provider_base_url, status, last_sync_at, last_error, webhook_secret_hash, webhook_secret_created_at, webhook_secret_rotated_at';

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
                data: GorgiasConnectionDbRow | null;
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
              data: GorgiasConnectionDbRow | null;
              error: { message: string } | null;
            }>;
          };
        };
      };
    };
  };
};

export function buildGorgiasSupportWebhookUrl(): string {
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  return `${base}${GORGIAS_SUPPORT_WEBHOOK_PATH}`;
}

export function toGorgiasSupportConnectionSettings(
  row: GorgiasConnectionDbRow
): GorgiasSupportConnectionSettings {
  const {
    webhook_secret_hash: _hash,
    merchant_id: _merchantId,
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
    webhook_url: buildGorgiasSupportWebhookUrl(),
  };
}

export async function getMerchantGorgiasSupportConnection(
  supabase: unknown,
  merchantId: string
): Promise<GorgiasSupportConnectionSettings | null> {
  const { data, error } = await (supabase as ListableSupabase)
    .from(TABLES.SUPPORT_PROVIDER_CONNECTIONS)
    .select(CONNECTION_SETTINGS_SELECT)
    .eq('merchant_id', merchantId)
    .eq('provider', 'gorgias')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`get_gorgias_support_connection_failed: ${error.message}`);
  }

  return data ? toGorgiasSupportConnectionSettings(data) : null;
}

export const gorgiasSupportConnectionInputSchema = z
  .object({
    account_id: z.string().trim().min(1).optional(),
    domain: z.string().trim().min(1).optional(),
    name: z.string().trim().min(1).max(200).optional(),
  })
  .refine((value) => Boolean(value.account_id || value.domain), {
    message: 'account_id or domain is required',
  });

export type GorgiasSupportConnectionInput = z.infer<typeof gorgiasSupportConnectionInputSchema>;

export function resolveGorgiasConnectionIdentity(input: GorgiasSupportConnectionInput): {
  provider_account_id: string;
  domain: string | null;
  provider_base_url: string | null;
} {
  if (input.account_id) {
    const accountId = input.account_id.trim();
    const asDomain =
      accountId.includes('.') && !/^\d+$/.test(accountId)
        ? normalizeGorgiasDomain(accountId)
        : null;
    if (asDomain && asDomain.includes('gorgias')) {
      return {
        provider_account_id: asDomain,
        domain: asDomain,
        provider_base_url: gorgiasBaseUrlFromDomain(asDomain),
      };
    }
    return {
      provider_account_id: accountId,
      domain: null,
      provider_base_url: null,
    };
  }

  const domain = normalizeGorgiasDomain(input.domain as string);
  return {
    provider_account_id: domain,
    domain,
    provider_base_url: gorgiasBaseUrlFromDomain(domain),
  };
}

export type CreateGorgiasSupportConnectionResult = {
  connection: GorgiasSupportConnectionSettings;
  webhook_secret_plaintext: string;
  webhook_url: string;
  header_name: string;
  warning: string;
};

export async function createMerchantGorgiasSupportConnection(
  supabase: Parameters<typeof upsertGorgiasSupportConnection>[0],
  merchantId: string,
  input: GorgiasSupportConnectionInput
): Promise<CreateGorgiasSupportConnectionResult> {
  const parsed = gorgiasSupportConnectionInputSchema.parse(input);
  const identity = resolveGorgiasConnectionIdentity(parsed);

  const existing = await getMerchantGorgiasSupportConnection(supabase, merchantId);
  if (existing) {
    throw new Error('gorgias_connection_already_exists');
  }

  const webhookSecretPlaintext = generateGorgiasWebhookSecret();
  if (!isGorgiasWebhookSecretSufficientLength(webhookSecretPlaintext)) {
    throw new Error('generated_webhook_secret_invalid');
  }

  await upsertGorgiasSupportConnection(supabase, {
    merchant_id: merchantId,
    provider_account_id: identity.provider_account_id,
    domain: identity.domain,
    provider_base_url: identity.provider_base_url,
    provider_account_name: parsed.name ?? null,
    status: 'active',
    last_error: null,
    webhookSecretPlaintext,
    rotateWebhookSecret: false,
  });

  const connection = await getMerchantGorgiasSupportConnection(supabase, merchantId);
  if (!connection) {
    throw new Error('gorgias_connection_missing_after_upsert');
  }

  return {
    connection,
    webhook_secret_plaintext: webhookSecretPlaintext,
    webhook_url: buildGorgiasSupportWebhookUrl(),
    header_name: GORGIAS_SUPPORT_WEBHOOK_HEADER_NAME,
    warning: GORGIAS_SUPPORT_SECRET_SAVE_WARNING,
  };
}

export async function updateMerchantGorgiasSupportConnectionMetadata(
  supabase: Parameters<typeof upsertGorgiasSupportConnection>[0],
  merchantId: string,
  input: GorgiasSupportConnectionInput
): Promise<GorgiasSupportConnectionSettings> {
  const parsed = gorgiasSupportConnectionInputSchema.parse(input);
  const identity = resolveGorgiasConnectionIdentity(parsed);

  await upsertGorgiasSupportConnection(supabase, {
    merchant_id: merchantId,
    provider_account_id: identity.provider_account_id,
    domain: identity.domain,
    provider_base_url: identity.provider_base_url,
    provider_account_name: parsed.name ?? null,
    status: 'active',
    last_error: null,
  });

  const connection = await getMerchantGorgiasSupportConnection(supabase, merchantId);
  if (!connection) {
    throw new Error('gorgias_connection_missing_after_upsert');
  }
  return connection;
}

export type RotateGorgiasWebhookSecretResult = {
  connection: GorgiasSupportConnectionSettings;
  webhook_secret_plaintext: string;
  webhook_url: string;
  header_name: string;
  warning: string;
};

export async function rotateMerchantGorgiasWebhookSecret(
  supabase: Parameters<typeof upsertGorgiasSupportConnection>[0],
  merchantId: string
): Promise<RotateGorgiasWebhookSecretResult> {
  const existing = await getMerchantGorgiasSupportConnection(supabase, merchantId);
  if (!existing) {
    throw new Error('gorgias_connection_not_found');
  }

  const webhookSecretPlaintext = generateGorgiasWebhookSecret();
  if (!isGorgiasWebhookSecretSufficientLength(webhookSecretPlaintext)) {
    throw new Error('generated_webhook_secret_invalid');
  }

  await upsertGorgiasSupportConnection(supabase, {
    merchant_id: merchantId,
    provider_account_id: existing.provider_account_id,
    provider_base_url: existing.provider_base_url,
    status:
      existing.status === 'active' ||
      existing.status === 'disabled' ||
      existing.status === 'error' ||
      existing.status === 'revoked'
        ? existing.status
        : 'active',
    webhookSecretPlaintext,
    rotateWebhookSecret: true,
  });

  const connection = await getMerchantGorgiasSupportConnection(supabase, merchantId);
  if (!connection) {
    throw new Error('gorgias_connection_missing_after_rotate');
  }

  return {
    connection,
    webhook_secret_plaintext: webhookSecretPlaintext,
    webhook_url: buildGorgiasSupportWebhookUrl(),
    header_name: GORGIAS_SUPPORT_WEBHOOK_HEADER_NAME,
    warning: GORGIAS_SUPPORT_SECRET_SAVE_WARNING,
  };
}

export async function disableMerchantGorgiasSupportConnection(
  supabase: unknown,
  merchantId: string
): Promise<GorgiasSupportConnectionSettings> {
  const existing = await getMerchantGorgiasSupportConnection(supabase, merchantId);
  if (!existing) {
    throw new Error('gorgias_connection_not_found');
  }

  const now = new Date().toISOString();
  const { data, error } = await (supabase as ListableSupabase)
    .from(TABLES.SUPPORT_PROVIDER_CONNECTIONS)
    .update({ status: 'disabled', updated_at: now })
    .eq('id', existing.id)
    .eq('merchant_id', merchantId)
    .select(CONNECTION_SETTINGS_SELECT)
    .single();

  if (error) {
    throw new Error(`disable_gorgias_connection_failed: ${error.message}`);
  }

  if (!data) {
    throw new Error('gorgias_connection_not_found');
  }

  return toGorgiasSupportConnectionSettings(data);
}
