import { createHash, randomBytes } from 'node:crypto';
import { encryptIntegrationCredentials } from '@/lib/integrations/secrets';
import { upsertConnection } from '@/lib/connectors/connectionStore';
import type { SupabaseClient } from '@supabase/supabase-js';

export const SHIPBOB_READ_SCOPES = [
  'openid',
  'channels_read',
  'orders_read',
  'fulfillments_read',
  'locations_read',
  'returns_read',
  'webhooks_read',
  'offline_access',
] as const;

export type ShipBobOAuthState = {
  state: string;
  codeVerifier: string;
  sandbox: boolean;
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
