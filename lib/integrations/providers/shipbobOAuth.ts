import { createHash, randomBytes } from 'node:crypto';
import { decryptIntegrationCredentials, encryptIntegrationCredentials } from '@/lib/integrations/secrets';
import { upsertConnection } from '@/lib/connectors/connectionStore';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createShipBobSubscription, deleteShipBobSubscription, listShipBobSubscriptions, SHIPBOB_WEBHOOK_TOPICS, type ShipBobCredentials } from '@/lib/connectors/providers/shipbob/api';

export const SHIPBOB_READ_SCOPES = [
  'openid',
  'channels_read',
  'orders_read',
  'fulfillments_read',
  'locations_read',
  'returns_read',
  'webhooks_read',
  'webhooks_write',
  'offline_access',
] as const;

export type ShipBobOAuthState = {
  state: string;
  codeVerifier: string;
  sandbox: boolean;
  merchantId?: string;
  userId?: string;
  expiresAt?: string;
};

export function createShipBobOAuthState(sandbox: boolean): ShipBobOAuthState {
  const codeVerifier = randomBytes(32).toString('base64url');
  return {
    state: randomBytes(32).toString('base64url'),
    codeVerifier,
    sandbox,
  };
}

export function shipBobCodeChallenge(codeVerifier: string): string {
  return createHash('sha256').update(codeVerifier).digest('base64url');
}

export function sealShipBobOAuthState(input: {
  oauthState: ShipBobOAuthState;
  merchantId: string;
  userId: string;
  now?: number;
}): string {
  return encryptIntegrationCredentials({
    state: input.oauthState.state,
    codeVerifier: input.oauthState.codeVerifier,
    sandbox: input.oauthState.sandbox,
    merchantId: input.merchantId,
    userId: input.userId,
    expiresAt: new Date((input.now ?? Date.now()) + 10 * 60 * 1000).toISOString(),
  });
}

export function openShipBobOAuthState(token: string, now = Date.now()): ShipBobOAuthState {
  const payload = decryptIntegrationCredentials(token);
  const state = typeof payload.state === 'string' ? payload.state : '';
  const codeVerifier = typeof payload.codeVerifier === 'string' ? payload.codeVerifier : '';
  const merchantId = typeof payload.merchantId === 'string' ? payload.merchantId : '';
  const userId = typeof payload.userId === 'string' ? payload.userId : '';
  const expiresAt = typeof payload.expiresAt === 'string' ? payload.expiresAt : '';
  if (!state || !codeVerifier || !merchantId || !userId || !expiresAt) throw new Error('shipbob_oauth_state_invalid');
  if (!Number.isFinite(Date.parse(expiresAt)) || Date.parse(expiresAt) <= now) throw new Error('shipbob_oauth_state_expired');
  return { state, codeVerifier, sandbox: payload.sandbox === true, merchantId, userId, expiresAt };
}

export function shipBobOAuthBaseUrl(sandbox: boolean): string {
  return sandbox ? 'https://authstage.shipbob.com' : 'https://auth.shipbob.com';
}

export function shipBobApiBaseUrl(sandbox: boolean): string {
  return sandbox ? 'https://sandbox-api.shipbob.com/2026-01' : 'https://api.shipbob.com/2026-01';
}

export async function exchangeShipBobOAuthCode(input: {
  code: string;
  codeVerifier: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  sandbox: boolean;
}): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
}> {
  const body = new URLSearchParams({
    client_id: input.clientId,
    client_secret: input.clientSecret,
    code: input.code,
    code_verifier: input.codeVerifier,
    grant_type: 'authorization_code',
    redirect_uri: input.redirectUri,
  });
  const response = await fetch(`${shipBobOAuthBaseUrl(input.sandbox)}/connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || typeof payload.access_token !== 'string') {
    // Include ShipBob's OAuth error code (invalid_grant, invalid_client, …) so
    // the failing cause is diagnosable downstream, not just the HTTP status.
    const errorCode = typeof payload.error === 'string' ? payload.error : 'no_error_code';
    throw new Error(`shipbob_oauth_token_exchange_failed:${response.status}:${errorCode}`);
  }
  return payload;
}

/**
 * Refresh the stored ShipBob access token when it is expired or near expiry.
 * ShipBob access tokens live ~1 hour; the initial import commonly runs later
 * than that via the cron worker, so every sync path must call this first.
 * Returns the (possibly refreshed) decrypted credential payload, or null when
 * no ShipBob credential exists for the merchant.
 */
export async function refreshShipBobCredentialsIfNeeded(
  client: SupabaseClient,
  merchantId: string,
  input: { clientId: string; clientSecret: string; now?: number },
): Promise<Record<string, unknown> | null> {
  const { data, error } = await client
    .from('integration_credentials')
    .select('encrypted_payload,expires_at')
    .eq('merchant_id', merchantId)
    .eq('provider_id', 'shipbob')
    .maybeSingle();
  if (error) throw new Error(`shipbob_credential_lookup_failed:${error.message}`);
  if (!data?.encrypted_payload) return null;
  const payload = decryptIntegrationCredentials(data.encrypted_payload);

  const now = input.now ?? Date.now();
  const expiresAtMs = data.expires_at ? Date.parse(data.expires_at) : null;
  const skewMs = 5 * 60 * 1000;
  const needsRefresh = expiresAtMs !== null && Number.isFinite(expiresAtMs) && expiresAtMs <= now + skewMs;
  if (!needsRefresh) return payload;
  const refreshToken = typeof payload.refreshToken === 'string' ? payload.refreshToken : null;
  if (!refreshToken) return payload; // No refresh token — let the API call surface the 401.

  const sandbox = payload.environment === 'sandbox';
  const body = new URLSearchParams({
    client_id: input.clientId,
    client_secret: input.clientSecret,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });
  const response = await fetch(`${shipBobOAuthBaseUrl(sandbox)}/connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
  });
  const token = await response.json().catch(() => ({}));
  if (!response.ok || typeof token.access_token !== 'string') {
    const errorCode = typeof token.error === 'string' ? token.error : 'no_error_code';
    throw new Error(`shipbob_oauth_token_refresh_failed:${response.status}:${errorCode}`);
  }

  const nextPayload = {
    ...payload,
    accessToken: token.access_token,
    ...(typeof token.refresh_token === 'string' ? { refreshToken: token.refresh_token } : {}),
  };
  const expiresAt = typeof token.expires_in === 'number'
    ? new Date(now + token.expires_in * 1000).toISOString()
    : null;
  const { error: updateError } = await client
    .from('integration_credentials')
    .update({
      encrypted_payload: encryptIntegrationCredentials(nextPayload),
      expires_at: expiresAt,
      updated_at: new Date(now).toISOString(),
    })
    .eq('merchant_id', merchantId)
    .eq('provider_id', 'shipbob');
  if (updateError) throw new Error(`shipbob_credential_refresh_persist_failed:${updateError.message}`);
  return nextPayload;
}

export async function fetchShipBobChannel(input: { accessToken: string; sandbox: boolean }) {
  const response = await fetch(`${shipBobApiBaseUrl(input.sandbox)}/channel`, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${input.accessToken}` },
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`shipbob_channel_lookup_failed:${response.status}`);
  const channels = Array.isArray(payload) ? payload : payload.items;
  if (!Array.isArray(channels) || !channels[0]?.id) throw new Error('shipbob_channel_missing');
  return channels[0] as { id: string | number; name?: string; application_name?: string; scopes?: string[] };
}

export async function persistShipBobOAuthConnection(input: {
  client: SupabaseClient;
  merchantId: string;
  token: Awaited<ReturnType<typeof exchangeShipBobOAuthCode>>;
  channel: { id: string | number; name?: string; application_name?: string; scopes?: string[] };
  sandbox: boolean;
}): Promise<{ connectionId: string; sourceAccountId: string }> {
  const channelId = String(input.channel.id);
  const scopes = input.token.scope?.split(/\s+/).filter(Boolean) ?? input.channel.scopes ?? [];
  const baseUrl = shipBobApiBaseUrl(input.sandbox);
  const { connectionId, sourceAccountId } = await upsertConnection(input.client, {
    merchantId: input.merchantId,
    providerId: 'shipbob',
    category: 'warehouse_3pl',
    authMode: 'oauth',
    status: 'connected',
    providerAccountId: channelId,
    providerAccountName: input.channel.name ?? input.channel.application_name ?? 'ShipBob',
    providerBaseUrl: baseUrl,
    displayName: input.channel.name ?? input.channel.application_name ?? 'ShipBob',
    grantedScopes: scopes,
    capabilitiesSnapshot: {
      readOrders: true,
      readFulfilment: true,
      readReturns: true,
      readLocations: true,
      readWebhooks: true,
      sandbox: input.sandbox,
    },
    connectorVersion: 'shipbob-oauth-v1',
  });

  // Preserve the stored webhookSecret across reconnects: the existing ShipBob
  // subscription is reused (no new secret is issued), so dropping it here
  // would permanently fail signature verification on every future webhook.
  let existingWebhookSecret: string | null = null;
  const { data: existingCredential } = await input.client
    .from('integration_credentials')
    .select('encrypted_payload')
    .eq('merchant_id', input.merchantId)
    .eq('provider_id', 'shipbob')
    .maybeSingle();
  if (existingCredential?.encrypted_payload) {
    try {
      const previous = decryptIntegrationCredentials(existingCredential.encrypted_payload);
      if (typeof previous.webhookSecret === 'string') existingWebhookSecret = previous.webhookSecret;
    } catch {
      // Undecryptable legacy payload — proceed without it; webhook setup will
      // mint a fresh subscription+secret if verification later fails.
    }
  }

  const encryptedPayload = encryptIntegrationCredentials({
    accessToken: input.token.access_token,
    ...(input.token.refresh_token ? { refreshToken: input.token.refresh_token } : {}),
    ...(existingWebhookSecret ? { webhookSecret: existingWebhookSecret } : {}),
    providerAccountId: channelId,
    providerAccountName: input.channel.name ?? input.channel.application_name ?? 'ShipBob',
    environment: input.sandbox ? 'sandbox' : 'production',
  });
  const expiresAt = input.token.expires_in
    ? new Date(Date.now() + input.token.expires_in * 1000).toISOString()
    : null;
  const { error } = await input.client.from('integration_credentials').upsert({
    merchant_id: input.merchantId,
    provider_id: 'shipbob',
    connection_id: connectionId,
    encrypted_payload: encryptedPayload,
    scopes,
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'merchant_id,provider_id' });
  if (error) throw new Error(`shipbob_oauth_credential_persist_failed:${error.message}`);

  return { connectionId, sourceAccountId };
}

export async function ensureShipBobWebhookSubscriptions(input: {
  client: SupabaseClient;
  connectionId: string;
  accessToken: string;
  sandbox: boolean;
  webhookUrl: string;
  /**
   * Whether we still hold the signing secret for an existing subscription.
   * ShipBob only reveals the secret at creation time — reusing a subscription
   * whose secret we no longer have (e.g. credentials deleted on disconnect)
   * would fail signature verification on every future delivery, so such
   * subscriptions are replaced rather than reused.
   */
  hasStoredSecret: boolean;
}): Promise<{ healthy: boolean; subscriptionIds: string[]; webhookSecret?: string }> {
  const credentials: ShipBobCredentials = { accessToken: input.accessToken, sandbox: input.sandbox };
  const existing = await listShipBobSubscriptions(credentials);
  const required = new Set(SHIPBOB_WEBHOOK_TOPICS);
  const matching = existing.items.filter((subscription) => subscription.enabled !== false && subscription.url === input.webhookUrl && [...required].every((topic) => subscription.topics.includes(topic)));
  if (matching.length > 0 && input.hasStoredSecret) {
    return { healthy: true, subscriptionIds: matching.map((subscription) => subscription.id) };
  }
  for (const orphan of matching) {
    await deleteShipBobSubscription(credentials, orphan.id);
  }
  const created = await createShipBobSubscription(credentials, {
    url: input.webhookUrl,
    topics: [...SHIPBOB_WEBHOOK_TOPICS],
    description: 'Unauth ShipBob order and shipment updates',
    secret: `whsec_${randomBytes(24).toString('base64')}`,
  });
  if (!created.secret) throw new Error('shipbob_webhook_secret_missing');
  return { healthy: true, subscriptionIds: [created.id], webhookSecret: created.secret };
}

export async function storeShipBobWebhookSecret(input: {
  client: SupabaseClient;
  merchantId: string;
  webhookSecret: string;
}) {
  const { data, error } = await input.client.from('integration_credentials').select('encrypted_payload').eq('merchant_id', input.merchantId).eq('provider_id', 'shipbob').maybeSingle();
  if (error || !data?.encrypted_payload) throw new Error(`shipbob_webhook_secret_storage_lookup_failed:${error?.message ?? 'missing_credentials'}`);
  const credentials = decryptIntegrationCredentials(data.encrypted_payload);
  const encryptedPayload = encryptIntegrationCredentials({ ...credentials, webhookSecret: input.webhookSecret });
  const { error: updateError } = await input.client.from('integration_credentials').update({ encrypted_payload: encryptedPayload, updated_at: new Date().toISOString() }).eq('merchant_id', input.merchantId).eq('provider_id', 'shipbob');
  if (updateError) throw new Error(`shipbob_webhook_secret_storage_failed:${updateError.message}`);
}

