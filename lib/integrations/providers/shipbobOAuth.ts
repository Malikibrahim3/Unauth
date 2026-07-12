import { createHash, randomBytes } from 'node:crypto';
import { decryptIntegrationCredentials, encryptIntegrationCredentials } from '@/lib/integrations/secrets';
import { upsertConnection } from '@/lib/connectors/connectionStore';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createShipBobSubscription, listShipBobSubscriptions, SHIPBOB_WEBHOOK_TOPICS, type ShipBobCredentials } from '@/lib/connectors/providers/shipbob/api';

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
    throw new Error(`shipbob_oauth_token_exchange_failed:${response.status}`);
  }
  return payload;
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

  const encryptedPayload = encryptIntegrationCredentials({
    accessToken: input.token.access_token,
    ...(input.token.refresh_token ? { refreshToken: input.token.refresh_token } : {}),
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
}): Promise<{ healthy: boolean; subscriptionIds: string[]; webhookSecret?: string }> {
  const credentials: ShipBobCredentials = { accessToken: input.accessToken, sandbox: input.sandbox };
  const existing = await listShipBobSubscriptions(credentials);
  const required = new Set(SHIPBOB_WEBHOOK_TOPICS);
  const matching = existing.items.filter((subscription) => subscription.enabled !== false && subscription.url === input.webhookUrl && [...required].every((topic) => subscription.topics.includes(topic)));
  if (matching.length > 0) {
    return { healthy: true, subscriptionIds: matching.map((subscription) => subscription.id) };
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

export async function enqueueShipBobInitialImport(input: {
  client: SupabaseClient;
  merchantId: string;
  connectionId: string;
  sourceAccountId: string;
}) {
  const { error } = await input.client.from('sync_jobs').insert({
    merchant_id: input.merchantId,
    connection_id: input.connectionId,
    source_account_id: input.sourceAccountId,
    source: 'shipbob',
    job_kind: 'initial_import',
    status: 'pending',
    cursor: null,
    next_attempt_at: new Date().toISOString(),
    label: 'ShipBob initial import',
  });
  if (error && error.code !== '23505') throw new Error(`shipbob_initial_import_enqueue_failed:${error.message}`);
}
