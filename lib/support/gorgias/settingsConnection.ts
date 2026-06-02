import type { SupabaseClient } from '@supabase/supabase-js';
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
import {
  encryptGorgiasApiCredentials,
  decryptGorgiasApiCredentials,
} from '@/lib/support/gorgias/credentialCrypto';
import { createWidgetTokenForGorgiasSidebar } from '@/lib/support/gorgias/ensureWidgetToken';
import {
  GorgiasSidebarRegistrationError,
  registerGorgiasSidebarWidget,
  refreshGorgiasSidebarWidgetIntegrationUrl,
  refreshGorgiasSidebarWidgetTemplate,
  gorgiasApiBaseUrl,
} from '@/lib/support/gorgias/registerSidebarWidget';
import {
  registerGorgiasSupportWebhook,
  deleteGorgiasSupportWebhookIntegration,
} from '@/lib/support/gorgias/registerSupportWebhook';
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
  GORGIAS_WEBHOOK_DOMAIN_QUERY_PARAM,
  GORGIAS_WEBHOOK_SECRET_QUERY_PARAM,
  type GorgiasSupportConnectionSettings,
  type GorgiasSidebarScopeEntry,
  type GorgiasSidebarWidgetSetupResult,
  type GorgiasSupportWebhookScopeEntry,
} from '@/lib/support/gorgias/supportConnectionShared';
import { nudgeRecentGorgiasTicketsWithAccessBestEffort } from '@/lib/support/gorgias/widgetRefreshNudge';

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

function readGorgiasWebhookScopeEntry(scopes: unknown): GorgiasSupportWebhookScopeEntry | null {
  if (!Array.isArray(scopes)) return null;
  for (const entry of scopes) {
    if (
      entry &&
      typeof entry === 'object' &&
      (entry as GorgiasSupportWebhookScopeEntry).kind === 'gorgias_support_webhook'
    ) {
      const candidate = entry as GorgiasSupportWebhookScopeEntry;
      if (
        typeof candidate.integration_id === 'number' &&
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

export type BuildGorgiasSupportWebhookUrlOptions = {
  /** Baked into the Gorgias integration URL so inbound webhooks resolve the merchant. */
  domain?: string | null;
  /** Only for Gorgias-side registration — never show in settings UI copy. */
  webhookSecretPlaintext?: string | null;
};

export function buildGorgiasSupportWebhookUrl(
  options?: BuildGorgiasSupportWebhookUrlOptions
): string {
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  const url = new URL(`${base}${GORGIAS_SUPPORT_WEBHOOK_PATH}`);
  const domain = options?.domain?.trim();
  if (domain) {
    url.searchParams.set(GORGIAS_WEBHOOK_DOMAIN_QUERY_PARAM, normalizeGorgiasDomain(domain));
  }
  const secret = options?.webhookSecretPlaintext?.trim();
  if (secret) {
    url.searchParams.set(GORGIAS_WEBHOOK_SECRET_QUERY_PARAM, secret);
  }
  return url.toString();
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
  const webhookScope = readGorgiasWebhookScopeEntry(scopes);

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
    support_webhook_registered: Boolean(webhookScope),
    support_webhook_integration_id: webhookScope?.integration_id ?? null,
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

/**
 * Best-effort: bump the Gorgias HTTP integration URL `_cb` so Gorgias refetches widget JSON.
 * Gorgias caches HTTP card responses; a deploy fix alone does not update open tickets.
 */
export async function refreshMerchantGorgiasSidebarWidgetUrlBestEffort(
  supabase: unknown,
  merchantId: string
): Promise<void> {
  const existing = await getMerchantGorgiasSupportConnection(supabase, merchantId);
  if (
    !existing ||
    existing.status !== 'active' ||
    !existing.provider_base_url ||
    existing.sidebar_integration_id == null ||
    existing.sidebar_widget_id == null
  ) {
    return;
  }

  const rawRow = await getGorgiasConnectionRawRow(supabase, merchantId);
  if (!rawRow?.access_token_encrypted) {
    return;
  }

  try {
    const credentials = decryptGorgiasApiCredentials(rawRow.access_token_encrypted);
    await Promise.all([
      refreshGorgiasSidebarWidgetIntegrationUrl({
        providerBaseUrl: existing.provider_base_url,
        credentials,
        integrationId: existing.sidebar_integration_id,
      }),
      refreshGorgiasSidebarWidgetTemplate({
        providerBaseUrl: existing.provider_base_url,
        credentials,
        widgetId: existing.sidebar_widget_id,
      }),
    ]);
  } catch {
    // Never block settings load on Gorgias cache refresh.
  }
}

async function getGorgiasConnectionRawRow(
  supabase: unknown,
  merchantId: string
): Promise<GorgiasConnectionDbRow | null> {
  const { data, error } = await (supabase as ListableSupabase)
    .from(TABLES.SUPPORT_PROVIDER_CONNECTIONS)
    .select(CONNECTION_SETTINGS_SELECT)
    .eq('merchant_id', merchantId)
    .eq('provider', 'gorgias')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`get_gorgias_raw_row_failed: ${error.message}`);
  }
  return data;
}

export const gorgiasSupportConnectionInputSchema = z
  .object({
    account_id: z.string().trim().min(1).optional(),
    domain: z.string().trim().min(1).optional(),
    name: z.string().trim().min(1).max(200).optional(),
    // Required: both are needed to register the sidebar widget and are stored encrypted.
    gorgias_api_email: z.string().trim().email(),
    gorgias_api_key: z.string().trim().min(1),
  })
  .refine((value) => Boolean(value.account_id || value.domain), {
    message: 'account_id or domain is required',
  });

/**
 * Thrown when Gorgias rejects the supplied REST API credentials (HTTP 401/403).
 * The route maps this to a friendly "check your email and key" message and no
 * connection is persisted, so the merchant can correct the credentials and retry.
 */
export class GorgiasCredentialsError extends Error {
  constructor(public readonly detail: string) {
    super('gorgias_credentials_invalid');
    this.name = 'GorgiasCredentialsError';
  }
}

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
    // Bare shop slug (e.g. "acme" from the reconnect form) → acme.gorgias.com
    if (/^[a-z0-9]+$/i.test(accountId)) {
      const slugDomain = `${accountId.toLowerCase()}.gorgias.com`;
      return {
        provider_account_id: slugDomain,
        domain: slugDomain,
        provider_base_url: gorgiasBaseUrlFromDomain(slugDomain),
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
  support_webhook_auto_registered: boolean;
};

export type UpdateGorgiasSupportConnectionResult = {
  connection: GorgiasSupportConnectionSettings;
  sidebar_widget: GorgiasSidebarWidgetSetupResult;
};

function mergeGorgiasConnectionIdentityForUpdate(
  resolved: {
    provider_account_id: string;
    domain: string | null;
    provider_base_url: string | null;
  },
  existing: GorgiasSupportConnectionSettings
): {
  provider_account_id: string;
  domain: string | null;
  provider_base_url: string | null;
} {
  if (resolved.provider_base_url) {
    return resolved;
  }

  const existingUrl = existing.provider_base_url?.trim();
  if (!existingUrl) {
    return resolved;
  }

  const domain = normalizeGorgiasDomain(
    existingUrl.replace(/^https?:\/\//i, '').split('/')[0] ?? existingUrl
  );

  return {
    provider_account_id:
      resolved.provider_account_id || existing.provider_account_id || domain,
    domain: resolved.domain ?? domain,
    provider_base_url: gorgiasBaseUrlFromDomain(domain),
  };
}

async function registerGorgiasSidebarForConnection(
  supabase: SupabaseClient,
  merchantId: string,
  input: GorgiasSupportConnectionInput,
  identity: {
    provider_account_id: string;
    domain: string | null;
    provider_base_url: string | null;
  },
  previous?: { integrationId: number; widgetId: number } | null
): Promise<{
  result: GorgiasSidebarWidgetSetupResult;
  accessTokenEncrypted: string | null;
  scopes: GorgiasSidebarScopeEntry[] | null;
}> {
  if (!input.gorgias_api_email || !input.gorgias_api_key) {
    return { result: { status: 'error', error: 'Gorgias API credentials are required.' }, accessTokenEncrypted: null, scopes: null };
  }

  const credentials = {
    email: input.gorgias_api_email,
    api_key: input.gorgias_api_key,
  };
  const accessTokenEncrypted = encryptGorgiasApiCredentials(credentials);

  if (!identity.provider_base_url) {
    return {
      result: {
        status: 'error',
        error: 'Gorgias account domain is required to register the sidebar widget.',
      },
      accessTokenEncrypted,
      scopes: null,
    };
  }

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
      previous: previous ?? null,
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
    const isAuthError =
      error instanceof GorgiasSidebarRegistrationError &&
      (error.status === 401 || error.status === 403);
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
        error_kind: isAuthError ? 'auth' : 'other',
        widget_token_plaintext: widgetTokenPlaintext,
      },
      accessTokenEncrypted,
      scopes: null,
    };
  }
}

export async function createMerchantGorgiasSupportConnection(
  supabase: SupabaseClient,
  merchantId: string,
  input: GorgiasSupportConnectionInput
): Promise<CreateGorgiasSupportConnectionResult> {
  const parsed = gorgiasSupportConnectionInputSchema.parse(input);
  const identity = resolveGorgiasConnectionIdentity(parsed);

  const existing = await getMerchantGorgiasSupportConnection(supabase, merchantId);
  // Block if there's an active/error connection or one that still has stored credentials.
  // A cleanly disabled+wiped row (status='disabled', no credentials) can be reactivated here.
  if (existing && !(existing.status === 'disabled' && !existing.gorgias_api_configured)) {
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

  // Wrong credentials = hard failure: don't persist a half-broken connection.
  if (
    sidebarRegistration.result.status === 'error' &&
    sidebarRegistration.result.error_kind === 'auth'
  ) {
    throw new GorgiasCredentialsError(
      sidebarRegistration.result.error ?? 'gorgias_credentials_invalid'
    );
  }

  // Auto-register the inbound webhook integration in Gorgias. Best-effort: a failure
  // gracefully falls back to the manual one-time-secret panel — connect still succeeds.
  let webhookScope: GorgiasSupportWebhookScopeEntry | null = null;
  let supportWebhookAutoRegistered = false;
  if (
    identity.provider_base_url &&
    identity.domain &&
    sidebarRegistration.accessTokenEncrypted
  ) {
    try {
      const { integrationId } = await registerGorgiasSupportWebhook({
        providerBaseUrl: identity.provider_base_url,
        credentials: {
          email: parsed.gorgias_api_email,
          api_key: parsed.gorgias_api_key,
        },
        webhookUrl: buildGorgiasSupportWebhookUrl({
          domain: identity.domain,
          webhookSecretPlaintext,
        }),
        webhookSecretPlaintext,
        domain: identity.domain,
        previousIntegrationId: null,
      });
      webhookScope = {
        kind: 'gorgias_support_webhook',
        integration_id: integrationId,
        registered_at: new Date().toISOString(),
      };
      supportWebhookAutoRegistered = true;
    } catch {
      // Graceful fallback — merchant gets the one-time secret panel for manual setup.
      supportWebhookAutoRegistered = false;
    }
  }

  const mergedScopes: unknown[] = [
    ...(sidebarRegistration.scopes ?? []),
    ...(webhookScope ? [webhookScope] : []),
  ];

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
    ...(mergedScopes.length > 0 ? { scopes: mergedScopes } : {}),
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
    support_webhook_auto_registered: supportWebhookAutoRegistered,
  };
}

export async function updateMerchantGorgiasSupportConnectionMetadata(
  supabase: SupabaseClient,
  merchantId: string,
  input: GorgiasSupportConnectionInput
): Promise<UpdateGorgiasSupportConnectionResult> {
  const parsed = gorgiasSupportConnectionInputSchema.parse(input);
  const existing = await getMerchantGorgiasSupportConnection(supabase, merchantId);
  if (!existing) {
    throw new Error('gorgias_connection_not_found');
  }

  const identity = mergeGorgiasConnectionIdentityForUpdate(
    resolveGorgiasConnectionIdentity(parsed),
    existing
  );

  const previousScope =
    existing.sidebar_integration_id != null && existing.sidebar_widget_id != null
      ? { integrationId: existing.sidebar_integration_id, widgetId: existing.sidebar_widget_id }
      : null;

  const sidebarRegistration = await registerGorgiasSidebarForConnection(
    supabase,
    merchantId,
    parsed,
    identity,
    previousScope
  );

  // Wrong credentials = hard failure: don't persist a half-broken connection.
  if (
    sidebarRegistration.result.status === 'error' &&
    sidebarRegistration.result.error_kind === 'auth'
  ) {
    throw new GorgiasCredentialsError(
      sidebarRegistration.result.error ?? 'gorgias_credentials_invalid'
    );
  }

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
  return { connection, sidebar_widget: sidebarRegistration.result };
}

export type RotateGorgiasWebhookSecretResult = {
  connection: GorgiasSupportConnectionSettings;
  webhook_secret_plaintext: string;
  webhook_url: string;
  header_name: string;
  warning: string;
};

export async function rotateMerchantGorgiasWebhookSecret(
  supabase: SupabaseClient,
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

  // Re-register the Gorgias webhook integration with the new secret so Gorgias starts
  // sending the new secret immediately. Best-effort: failure falls back to manual.
  let updatedWebhookScope: GorgiasSupportWebhookScopeEntry | null =
    existing.support_webhook_integration_id != null
      ? {
          kind: 'gorgias_support_webhook',
          integration_id: existing.support_webhook_integration_id,
          registered_at: new Date().toISOString(),
        }
      : null;

  if (existing.provider_base_url && existing.support_webhook_integration_id != null) {
    const rawRow = await getGorgiasConnectionRawRow(supabase, merchantId);
    if (rawRow?.access_token_encrypted) {
      try {
        const credentials = decryptGorgiasApiCredentials(rawRow.access_token_encrypted);
        const domain =
          existing.provider_base_url
            .replace(/^https?:\/\//i, '')
            .split('/')[0] ?? '';
        const { integrationId } = await registerGorgiasSupportWebhook({
          providerBaseUrl: existing.provider_base_url,
          credentials,
          webhookUrl: buildGorgiasSupportWebhookUrl({
            domain,
            webhookSecretPlaintext,
          }),
          webhookSecretPlaintext,
          domain,
          previousIntegrationId: existing.support_webhook_integration_id,
        });
        updatedWebhookScope = {
          kind: 'gorgias_support_webhook',
          integration_id: integrationId,
          registered_at: new Date().toISOString(),
        };
      } catch {
        // Best-effort — still rotate the local secret; merchant may need to reconfigure.
      }
    }
  }

  // Rebuild scopes preserving the existing sidebar scope and replacing the webhook scope.
  const sidebarScope: GorgiasSidebarScopeEntry | null =
    existing.sidebar_integration_id != null && existing.sidebar_widget_id != null
      ? {
          kind: 'gorgias_sidebar_widget',
          integration_id: existing.sidebar_integration_id,
          widget_id: existing.sidebar_widget_id,
          registered_at: new Date().toISOString(),
        }
      : null;

  const updatedScopes: unknown[] = [
    ...(sidebarScope ? [sidebarScope] : []),
    ...(updatedWebhookScope ? [updatedWebhookScope] : []),
  ];

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
    ...(updatedScopes.length > 0 ? { scopes: updatedScopes } : {}),
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

  const rawRow = await getGorgiasConnectionRawRow(supabase, merchantId);
  const credentials =
    rawRow?.access_token_encrypted && existing.provider_base_url
      ? decryptGorgiasApiCredentials(rawRow.access_token_encrypted)
      : null;

  // Keep the sidebar widget in Gorgias so agents can see "Connect to Unauth" after disconnect.
  // The inbound support webhook is removed because Unauth should no longer ingest live helpdesk data.
  if (existing.provider_base_url && credentials) {
    try {
      if (existing.sidebar_widget_id != null) {
        await refreshGorgiasSidebarWidgetTemplate({
          providerBaseUrl: existing.provider_base_url,
          credentials,
          widgetId: existing.sidebar_widget_id,
        });
      }

      if (existing.support_webhook_integration_id != null) {
        const apiBaseUrl = gorgiasApiBaseUrl(existing.provider_base_url);
        await deleteGorgiasSupportWebhookIntegration(
          apiBaseUrl,
          credentials,
          existing.support_webhook_integration_id
        );
      }
    } catch {
      // Remote cleanup/template refresh failed — proceed with local wipe regardless.
    }
  }

  const now = new Date().toISOString();
  const sidebarScope: GorgiasSidebarScopeEntry | null =
    existing.sidebar_integration_id != null && existing.sidebar_widget_id != null
      ? {
          kind: 'gorgias_sidebar_widget',
          integration_id: existing.sidebar_integration_id,
          widget_id: existing.sidebar_widget_id,
          registered_at: now,
        }
      : null;

  const { data, error } = await (supabase as ListableSupabase)
    .from(TABLES.SUPPORT_PROVIDER_CONNECTIONS)
    .update({
      status: 'disabled',
      access_token_encrypted: null,
      webhook_secret_hash: null,
      webhook_secret_created_at: null,
      webhook_secret_rotated_at: null,
      scopes: sidebarScope ? [sidebarScope] : [],
      last_error: null,
      updated_at: now,
    })
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

  if (existing.status === 'active' && existing.provider_base_url && credentials) {
    await nudgeRecentGorgiasTicketsWithAccessBestEffort({
      supabase: supabase as SupabaseClient,
      merchantId,
      access: {
        providerBaseUrl: existing.provider_base_url,
        credentials,
      },
      reason: 'gorgias_connection_disabled',
      payload: {
        event: 'gorgias_connection_disabled',
        merchant_id: merchantId,
        disabled_at: now,
      },
    });
  }

  return toGorgiasSupportConnectionSettings(data);
}
