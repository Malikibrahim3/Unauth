import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermissionForMerchant } from '@/lib/permissions';
import { getAppUrl } from '@/lib/utils/appUrl';
import { env } from '@/lib/utils/env';
import {
  exchangeShipBobOAuthCode,
  fetchShipBobChannels,
  openShipBobOAuthState,
  type ShipBobOAuthState,
} from '@/lib/integrations/providers/shipbobOAuth';
import { recordShipBobAudit } from '@/lib/integrations/providers/shipbobAudit';
import { consumeOAuthConnectionTransaction } from '@/lib/integrations/oauthTransactions';
import { createPendingAccountSelection } from '@/lib/integrations/pendingAccountSelection';
import { completeShipBobConnection } from '@/lib/integrations/providers/shipbobCompletion';
import {
  clearShipBobOAuthCookieOptions,
  shipBobOAuthCookie,
} from '@/lib/integrations/shipbobOAuthCookies';
import { safeConnectionErrorCode } from '@/lib/integrations/publicErrors';

// Token exchange + channel lookup + webhook subscription is a multi-call
// chain against ShipBob; the platform default duration can cut it off.
export const maxDuration = 60;

function redirect(params: Record<string, string>): NextResponse {
  const url = new URL('/integrations', getAppUrl());
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  // The provider returns a form_post. A 307 would preserve that POST across
  // the application redirect (and eventually hit /login with POST); 303 is the
  // OAuth-safe POST/Redirect/GET transition.
  return NextResponse.redirect(url, 303);
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
  const responseError = async (key: string) => {
    console.warn('shipbob_oauth_callback_rejected', {
      code: key,
      method: request.method,
      hasStateCookie: Boolean(request.cookies.get(shipBobOAuthCookie)?.value),
    });
    if (oauthStateForAudit) {
      try {
        const auditClient = createServiceClient();
        await recordShipBobAudit(auditClient, {
          merchantId: oauthStateForAudit.merchantId!, actorUserId: oauthStateForAudit.userId,
          environment: oauthStateForAudit.sandbox ? 'sandbox' : 'production',
          action: 'shipbob_authorization_failed', status: 'failed', metadata: { failureCategory: key },
        });
      } catch { /* audit must never change OAuth error handling */ }
    }
    const response = redirect({ [`shipbob_${key}`]: '1' });
    response.cookies.set(shipBobOAuthCookie, '', clearShipBobOAuthCookieOptions());
    return response;
  };
  let oauthStateForAudit: ShipBobOAuthState | null = null;
  const { code, state, error } = await callbackParams(request);
  if (error) {
    try { oauthStateForAudit = state ? openShipBobOAuthState(state) : null; } catch { oauthStateForAudit = null; }
    console.warn('shipbob_oauth_provider_error', {
      errorCategory: safeConnectionErrorCode(error) ?? 'provider_authorization_error',
    });
    return responseError('authorization_denied');
  }
  if (!code || !state) return responseError('missing_params');

  let oauthState: ShipBobOAuthState;
  try {
    oauthState = openShipBobOAuthState(state);
    oauthStateForAudit = oauthState;
  } catch {
    return responseError('invalid_state');
  }

  try {
    const userClient = createClient();
    const serviceClient = createServiceClient();
    const { data: { user } } = await userClient.auth.getUser();
    // ShipBob's hybrid OAuth response uses form_post. Browsers intentionally
    // omit SameSite=Lax session cookies on that cross-site POST, so recover the
    // initiating user only from our HMAC-sealed, short-lived state. The
    // one-time transaction and current merchant permission are both verified
    // below before any credential is persisted.
    const callbackUserId = user?.id
      ?? (request.method === 'POST' ? oauthState.userId : null);
    if (!callbackUserId) return responseError('unauthorized');
    if (oauthState.userId && oauthState.userId !== callbackUserId) return responseError('identity_mismatch');
    if (!env.SHIPBOB_OAUTH_CLIENT_ID || !env.SHIPBOB_OAUTH_CLIENT_SECRET) return responseError('misconfigured');

    const redirectUri = `${getAppUrl()}/api/integrations/shipbob/callback`;
    let transaction;
    try {
      transaction = await consumeOAuthConnectionTransaction(serviceClient, {
        state,
        userId: callbackUserId,
        providerId: 'shipbob',
        callbackUrl: redirectUri,
      });
    } catch {
      return responseError('invalid_or_replayed_state');
    }
    if (oauthState.merchantId !== transaction.merchantId) return responseError('identity_mismatch');
    const { denied, ctx: context } = await requirePermissionForMerchant(
      serviceClient,
      callbackUserId,
      transaction.merchantId,
      PERMISSIONS.MANAGE_SETTINGS,
    );
    if (denied) return responseError('forbidden');
    if ((oauthState.sandbox ? 'sandbox' : 'production') !== transaction.environment) {
      return responseError('environment_mismatch');
    }

    const token = await exchangeShipBobOAuthCode({
      code,
      codeVerifier: oauthState.codeVerifier,
      clientId: env.SHIPBOB_OAUTH_CLIENT_ID,
      clientSecret: env.SHIPBOB_OAUTH_CLIENT_SECRET,
      redirectUri,
      sandbox: oauthState.sandbox,
    });
    const channels = await fetchShipBobChannels({ accessToken: token.access_token, sandbox: oauthState.sandbox });
    if (channels.length > 1) {
      const selectionId = await createPendingAccountSelection(serviceClient, {
        merchantId: context.merchantId,
        userId: callbackUserId,
        providerId: 'shipbob',
        environment: oauthState.sandbox ? 'sandbox' : 'production',
        accounts: channels.map((channel) => ({
          id: String(channel.id),
          name: channel.name ?? channel.application_name ?? null,
        })),
        credentialPayload: token,
      });
      const selectionUrl = new URL('/integrations/shipbob/select', getAppUrl());
      selectionUrl.searchParams.set('selection', selectionId);
      const response = NextResponse.redirect(selectionUrl);
      response.cookies.set(shipBobOAuthCookie, '', clearShipBobOAuthCookieOptions());
      return response;
    }
    const completed = await completeShipBobConnection({
      client: serviceClient,
      merchantId: context.merchantId,
      userId: callbackUserId,
      token,
      channel: channels[0]!,
      sandbox: oauthState.sandbox,
    });
    const response = redirect({ shipbob_connected: '1', ...(completed.subscriptionHealthy ? {} : { shipbob_warning: 'webhook_subscription_failed' }) });
    response.cookies.set(shipBobOAuthCookie, '', clearShipBobOAuthCookieOptions());
    return response;
  } catch (error) {
    const reason = safeConnectionErrorCode(error instanceof Error ? error.message : null)
      ?? 'shipbob_callback_failed';
    console.error('ShipBob OAuth callback failed', { category: reason });
    const response = redirect({ shipbob_callback_failed: '1', shipbob_reason: reason });
    response.cookies.set(shipBobOAuthCookie, '', clearShipBobOAuthCookieOptions());
    return response;
  }
}
