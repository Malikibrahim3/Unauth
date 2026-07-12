import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { ensureMerchantContextForUser } from '@/lib/account/ensureMerchantContext';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { getAppUrl } from '@/lib/utils/appUrl';
import { env } from '@/lib/utils/env';
import {
  exchangeShipBobOAuthCode,
  fetchShipBobChannel,
  persistShipBobOAuthConnection,
  ensureShipBobWebhookSubscriptions,
  enqueueShipBobInitialImport,
  openShipBobOAuthState,
  storeShipBobWebhookSecret,
  type ShipBobOAuthState,
} from '@/lib/integrations/providers/shipbobOAuth';
import {
  clearShipBobOAuthCookieOptions,
  shipBobOAuthCookie,
} from '@/lib/integrations/shipbobOAuthCookies';

function redirect(params: Record<string, string>): NextResponse {
  const url = new URL('/integrations', getAppUrl());
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return NextResponse.redirect(url);
}

async function callbackParams(request: NextRequest): Promise<{ code: string | null; state: string | null; error: string | null }> {
  if (request.method === 'GET') {
    return {
      code: request.nextUrl.searchParams.get('code'),
      state: request.nextUrl.searchParams.get('state'),
      error: request.nextUrl.searchParams.get('error'),
    };
  }
  const form = await request.formData();
  return {
    code: typeof form.get('code') === 'string' ? String(form.get('code')) : null,
    state: typeof form.get('state') === 'string' ? String(form.get('state')) : null,
    error: typeof form.get('error') === 'string' ? String(form.get('error')) : null,
  };
}

export async function GET(request: NextRequest) { return handleCallback(request); }
export async function POST(request: NextRequest) { return handleCallback(request); }

async function handleCallback(request: NextRequest) {
  const responseError = (key: string) => {
    console.warn('shipbob_oauth_callback_rejected', {
      code: key,
      method: request.method,
      hasStateCookie: Boolean(request.cookies.get(shipBobOAuthCookie)?.value),
    });
    const response = redirect({ [`shipbob_${key}`]: '1' });
    response.cookies.set(shipBobOAuthCookie, '', clearShipBobOAuthCookieOptions());
    return response;
  };
  const { code, state, error } = await callbackParams(request);
  if (error) {
    console.warn('shipbob_oauth_provider_error', { errorCategory: error.slice(0, 80) });
    return responseError('authorization_denied');
  }
  if (!code || !state) return responseError('missing_params');

  let oauthState: ShipBobOAuthState;
  try {
    // The encrypted state carries the PKCE verifier and merchant binding, so
    // browsers that discard the temporary OAuth cookie can still complete the
    // callback safely. The cookie fallback preserves in-flight legacy attempts.
    oauthState = openShipBobOAuthState(state);
  } catch {
    const rawCookie = request.cookies.get(shipBobOAuthCookie)?.value;
    if (!rawCookie) return responseError('invalid_state');
    try { oauthState = JSON.parse(rawCookie) as ShipBobOAuthState; } catch { return responseError('invalid_state'); }
    if (!oauthState.state || oauthState.state !== state || !oauthState.codeVerifier) return responseError('invalid_state');
  }

  try {
    const userClient = createClient();
    const serviceClient = createServiceClient();
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return responseError('unauthorized');
    if (oauthState.userId && oauthState.userId !== user.id) return responseError('identity_mismatch');
    const { denied } = await requirePermission(serviceClient, user.id, PERMISSIONS.MANAGE_SETTINGS);
    if (denied) return responseError('forbidden');
    const context = await ensureMerchantContextForUser(serviceClient, user);
    if (!context?.merchantId) return responseError('missing_merchant');
    if (oauthState.merchantId && oauthState.merchantId !== context.merchantId) return responseError('identity_mismatch');
    if (!env.SHIPBOB_OAUTH_CLIENT_ID || !env.SHIPBOB_OAUTH_CLIENT_SECRET) return responseError('misconfigured');

    const redirectUri = `${getAppUrl()}/api/integrations/shipbob/callback`;
    const token = await exchangeShipBobOAuthCode({
      code,
      codeVerifier: oauthState.codeVerifier,
      clientId: env.SHIPBOB_OAUTH_CLIENT_ID,
      clientSecret: env.SHIPBOB_OAUTH_CLIENT_SECRET,
      redirectUri,
      sandbox: oauthState.sandbox,
    });
    const channel = await fetchShipBobChannel({ accessToken: token.access_token, sandbox: oauthState.sandbox });
    const persisted = await persistShipBobOAuthConnection({
      client: serviceClient,
      merchantId: context.merchantId,
      token,
      channel,
      sandbox: oauthState.sandbox,
    });
    const webhookUrl = `${getAppUrl()}/api/integrations/shipbob/webhook?connectionId=${encodeURIComponent(persisted.connectionId)}`;
    let subscriptionHealthy = false;
    try {
      const subscription = await ensureShipBobWebhookSubscriptions({
        client: serviceClient,
        connectionId: persisted.connectionId,
        accessToken: token.access_token,
        sandbox: oauthState.sandbox,
        webhookUrl,
      });
      subscriptionHealthy = subscription.healthy;
      if (subscription.webhookSecret) {
        await storeShipBobWebhookSecret({ client: serviceClient, merchantId: context.merchantId, webhookSecret: subscription.webhookSecret });
      }
      await serviceClient.from('merchant_integrations').update({ subscribed: subscriptionHealthy, webhook_status: subscriptionHealthy ? 'healthy' : 'degraded' }).eq('id', persisted.connectionId);
    } catch (subscriptionError) {
      console.error('ShipBob webhook subscription setup failed', { message: subscriptionError instanceof Error ? subscriptionError.message : 'unknown' });
      await serviceClient.from('merchant_integrations').update({ status: 'degraded', subscribed: false, webhook_status: 'missing' }).eq('id', persisted.connectionId);
    }
    await enqueueShipBobInitialImport({ client: serviceClient, merchantId: context.merchantId, connectionId: persisted.connectionId, sourceAccountId: persisted.sourceAccountId });
    const response = redirect({ shipbob_connected: '1', ...(subscriptionHealthy ? {} : { shipbob_warning: 'webhook_subscription_failed' }) });
    response.cookies.set(shipBobOAuthCookie, '', clearShipBobOAuthCookieOptions());
    return response;
  } catch (error) {
    console.error('ShipBob OAuth callback failed', { message: error instanceof Error ? error.message : 'unknown' });
    return responseError('callback_failed');
  }
}
