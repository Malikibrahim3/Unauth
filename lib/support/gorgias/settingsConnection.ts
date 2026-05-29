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
import { encryptGorgiasApiCredentials } from '@/lib/support/gorgias/credentialCrypto';
import { createWidgetTokenForGorgiasSidebar } from '@/lib/support/gorgias/ensureWidgetToken';
import {
  GorgiasSidebarRegistrationError,
  registerGorgiasSidebarWidget,
} from '@/lib/support/gorgias/registerSidebarWidget';
import { env } from '@/lib/utils/env';

// Client-safe constants/type live in the shared module so the client component
// can import them without dragging server-only code into the browser bundle.
// Re-exported here so existing server-side import paths keep working.
export {
  GORGIAS_SUPPORT_WEBHOOK_PATH,
  GORGIAS_SUPPORT_WEBHOOK_HEADER_NAME,
  GORGIAS_SUPPORT_SECRET_SAVE_WARNING,
  type GorgiasSupportConnectionSettings,
  type GorgiasSidebarWidgetSetupResult,
} from '@/lib/support/gorgias/supportConnectionShared';
import {
  GORGIAS_SUPPORT_WEBHOOK_PATH,
  GORGIAS_SUPPORT_WEBHOOK_HEADER_NAME,
  GORGIAS_SUPPORT_SECRET_SAVE_WARNING,
  type GorgiasSupportConnectionSettings,
  type GorgiasSidebarScopeEntry,
  type GorgiasSidebarWidgetSetupResult,
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
  access_token_encrypted: string | null;
  scopes: unknown;
};

const CONNECTION_SETTINGS_SELECT =
  'id, merchant_id, provider_account_id, provider_account_name, provider_base_url, status, last_sync_at, last_error, webhook_secret_hash, webhook_secret_created_at, webhook_secret_rotated_at, access_token_encrypted, scopes';

function readSidebarScopeEntry(scopes: unknown): GorgiasSidebarScopeEntry | null {
  if (!Array.isArray(scopes)) return null;
  for (const entry of scopes) {
    if (
      entry &&
      typeof entry === 'object' &&
      (entry as GorgiasSidebarScopeEntry).kind === 'gorgias_sidebar_widget'
    ) {
      const candidate = entry as GorgiasSidebarScopeEntry;
      if (
        typeof candidate.integration_id === 'number' &&
        typeof candidate.widget_id === 'number' &&
        typeof candidate.registered_at === 'string'
      ) {
        return candidate;
      }
    }
  }
  return null;
}

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
    access_token_encrypted: _accessToken,
    scopes,
    ...rest
  } = row;

  const sidebarScope = readSidebarScopeEntry(scopes);

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
    gorgias_api_configured: Boolean(row.access_token_encrypted?.trim()),
    sidebar_widget_registered: Boolean(sidebarScope),
    sidebar_integration_id: sidebarScope?.integration_id ?? null,
    sidebar_widget_id: sidebarScope?.widget_id ?? null,
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
    gorgias_api_email: z.string().trim().email().optional(),
    gorgias_api_key: z.string().trim().min(1).optional(),
  })
  .refine((value) => Boolean(value.account_id || value.domain), {
    message: 'account_id or domain is required',
  })
  .refine(
    (value) => {
      const hasEmail = Boolean(value.gorgias_api_email);
      const hasKey = Boolean(value.gorgias_api_key);
      return hasEmail === hasKey;
    },
    { message: 'gorgias_api_email and gorgias_api_key must be provided together' }
  );

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
  sidebar_widget: GorgiasSidebarWidgetSetupResult | null;
};

async function registerGorgiasSidebarForConnection(
  supabase: Parameters<typeof upsertGorgiasSupportConnection>[0],
  merchantId: string,
  input: GorgiasSupportConnectionInput,
  identity: {
    provider_account_id: string;
    domain: string | null;
    provider_base_url: string | null;
  }
): Promise<{
  result: GorgiasSidebarWidgetSetupResult;
  accessTokenEncrypted: string | null;
  scopes: GorgiasSidebarScopeEntry[] | null;
}> {
  if (!input.gorgias_api_email || !input.gorgias_api_key) {
    return { result: { status: 'error', error: 'Gorgias API credentials are required.' }, accessTokenEncrypted: null, scopes: null };
  }

  if (!identity.provider_base_url) {
    return {
      result: {
        status: 'error',
        error: 'Gorgias account domain is required to register the sidebar widget.',
      },
      accessTokenEncrypted: null,
      scopes: null,
    };
  }

  const credentials = {
    email: input.gorgias_api_email,
    api_key: input.gorgias_api_key,
  };
  const accessTokenEncrypted = encryptGorgiasApiCredentials(credentials);

  let widgetTokenPlaintext: string;
  try {
    const created = await createWidgetTokenForGorgiasSidebar(supabase, merchantId);
    widgetTokenPlaintext = created.widgetToken;
  } catch {
    return {
      result: {
        status: 'error',
        error: 'Could not create a widget token for Gorgias.',
      },
      accessTokenEncrypted,
      scopes: null,
    };
  }

  try {
    const registered = await registerGorgiasSidebarWidget({
      providerBaseUrl: identity.provider_base_url,
      credentials,
      widgetToken: widgetTokenPlaintext,
    });

    const sidebarScope: GorgiasSidebarScopeEntry = {
      kind: 'gorgias_sidebar_widget',
      integration_id: registered.integrationId,
      widget_id: registered.widgetId,
      registered_at: new Date().toISOString(),
    };

    return {
      result: {
        status: 'success',
        integration_id: registered.integrationId,
        widget_id: registered.widgetId,
        widget_token_plaintext: widgetTokenPlaintext,
      },
      accessTokenEncrypted,
      scopes: [sidebarScope],
    };
  } catch (error) {
    const detail =
      error instanceof GorgiasSidebarRegistrationError
        ? error.detail
        : error instanceof Error
          ? error.message
          : 'Unknown Gorgias API error';

    return {
      result: {
        status: 'error',
        error: detail,
        widget_token_plaintext: widgetTokenPlaintext,
      },
      accessTokenEncrypted,
      scopes: null,
    };
  }
}

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

  const sidebarRegistration = await registerGorgiasSidebarForConnection(
    supabase,
    merchantId,
    parsed,
    identity
  );

  await upsertGorgiasSupportConnection(supabase, {
    merchant_id: merchantId,
    provider_account_id: identity.provider_account_id,
    domain: identity.domain,
    provider_base_url: identity.provider_base_url,
    provider_account_name: parsed.name ?? null,
    status: 'active',
    last_error: sidebarRegistration.result.status === 'error' ? sidebarRegistration.result.error ?? null : null,
    webhookSecretPlaintext,
    rotateWebhookSecret: false,
    ...(sidebarRegistration.accessTokenEncrypted
      ? { accessTokenEncrypted: sidebarRegistration.accessTokenEncrypted }
      : {}),
    ...(sidebarRegistration.scopes ? { scopes: sidebarRegistration.scopes } : {}),
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
    sidebar_widget: sidebarRegistration.result,
  };
}

export async function updateMerchantGorgiasSupportConnectionMetadata(
  supabase: Parameters<typeof upsertGorgiasSupportConnection>[0],
  merchantId: string,
  input: GorgiasSupportConnectionInput
): Promise<GorgiasSupportConnectionSettings> {
  const parsed = gorgiasSupportConnectionInputSchema.parse(input);
  const identity = resolveGorgiasConnectionIdentity(parsed);

  const sidebarRegistration = await registerGorgiasSidebarForConnection(
    supabase,
    merchantId,
    parsed,
    identity
  );

  await upsertGorgiasSupportConnection(supabase, {
    merchant_id: merchantId,
    provider_account_id: identity.provider_account_id,
    domain: identity.domain,
    provider_base_url: identity.provider_base_url,
    provider_account_name: parsed.name ?? null,
    status: 'active',
    last_error: sidebarRegistration.result.status === 'error' ? sidebarRegistration.result.error ?? null : null,
    ...(sidebarRegistration.accessTokenEncrypted
      ? { accessTokenEncrypted: sidebarRegistration.accessTokenEncrypted }
      : {}),
    ...(sidebarRegistration.scopes ? { scopes: sidebarRegistration.scopes } : {}),
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
