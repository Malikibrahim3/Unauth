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
  type ShipBobOAuthState,
} from '@/lib/integrations/providers/shipbobOAuth';
import {
  clearShipBobOAuthCookieOptions,
  shipBobOAuthCookie,
} from '@/lib/integrations/shipbobOAuthCookies';

function redirect(params: Record<string, string>): NextResponse {
  const url = new URL('/settings/integrations', getAppUrl());
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
    const response = redirect({ [`shipbob_${key}`]: '1' });
    response.cookies.set(shipBobOAuthCookie, '', clearShipBobOAuthCookieOptions());
    return response;
  };
  const { code, state, error } = await callbackParams(request);
  if (error) return responseError('authorization_denied');
  if (!code || !state) return responseError('missing_params');

  const rawCookie = request.cookies.get(shipBobOAuthCookie)?.value;
  if (!rawCookie) return responseError('invalid_state');
  let oauthState: ShipBobOAuthState;
  try { oauthState = JSON.parse(rawCookie) as ShipBobOAuthState; } catch { return responseError('invalid_state'); }
  if (!oauthState.state || oauthState.state !== state || !oauthState.codeVerifier) return responseError('invalid_state');

  try {
    const userClient = createClient();
    const serviceClient = createServiceClient();
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return responseError('unauthorized');
    const { denied } = await requirePermission(serviceClient, user.id, PERMISSIONS.MANAGE_SETTINGS);
    if (denied) return responseError('forbidden');
    const context = await ensureMerchantContextForUser(serviceClient, user);
    if (!context?.merchantId) return responseError('missing_merchant');
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
    await persistShipBobOAuthConnection({
      client: serviceClient,
      merchantId: context.merchantId,
      token,
      channel,
      sandbox: oauthState.sandbox,
    });
    const response = redirect({ shipbob_connected: '1' });
    response.cookies.set(shipBobOAuthCookie, '', clearShipBobOAuthCookieOptions());
    return response;
  } catch (error) {
    console.error('ShipBob OAuth callback failed', { message: error instanceof Error ? error.message : 'unknown' });
    return responseError('callback_failed');
  }
}
