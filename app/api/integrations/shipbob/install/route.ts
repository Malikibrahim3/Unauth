import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { ensureMerchantContextForUser } from '@/lib/account/ensureMerchantContext';
import {
  ACTIVE_MERCHANT_COOKIE,
  PERMISSIONS,
  requirePermissionForMerchant,
} from '@/lib/permissions';
import { beginOAuthConnectionTransaction } from '@/lib/integrations/oauthTransactions';
import { getAppUrl } from '@/lib/utils/appUrl';
import {
  createShipBobOAuthState,
  sealShipBobOAuthState,
  SHIPBOB_READ_SCOPES,
  shipBobCodeChallenge,
  shipBobOAuthClientCredentials,
  shipBobOAuthBaseUrl,
} from '@/lib/integrations/providers/shipbobOAuth';
import { shipBobOAuthCookie, shipBobOAuthCookieOptions } from '@/lib/integrations/shipbobOAuthCookies';
import { requestedShipBobEnvironment } from '@/lib/integrations/providers/shipbobEnvironment';
import { recordShipBobAudit } from '@/lib/integrations/providers/shipbobAudit';

const REDIRECT_PATH = '/sources/connected';

function redirect(request: NextRequest, key: string): NextResponse {
  return NextResponse.redirect(new URL(`${REDIRECT_PATH}?${key}=1`, request.url));
}

export async function GET(request: NextRequest) {
  const userClient = createClient();
  const serviceClient = createServiceClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return redirect(request, 'shipbob_unauthorized');
  const selectedMerchantId = request.cookies.get(ACTIVE_MERCHANT_COOKIE)?.value ?? null;
  const context = await ensureMerchantContextForUser(serviceClient, user, selectedMerchantId);
  if (!context?.merchantId) return redirect(request, 'shipbob_missing_merchant');
  const { denied } = await requirePermissionForMerchant(
    serviceClient,
    user.id,
    context.merchantId,
    PERMISSIONS.MANAGE_SETTINGS,
  );
  if (denied) return redirect(request, 'shipbob_forbidden');

  // Environment is a connection choice and is sealed into the transaction;
  // it is never taken from a deployment-wide merchant default.
  const environmentOverride = request.nextUrl.searchParams.get('environment');
  const environment = requestedShipBobEnvironment({
    requested: environmentOverride,
    nodeEnv: process.env.NODE_ENV,
    testMode: process.env.SHIPBOB_AUTHORIZED_TEST_MODE === 'true',
  });
  const sandbox = environment === 'sandbox';
  const oauthCredentials = shipBobOAuthClientCredentials(environment);
  if (!oauthCredentials) return redirect(request, 'shipbob_misconfigured');
  const oauthState = createShipBobOAuthState(sandbox);
  const stateToken = sealShipBobOAuthState({
    oauthState,
    merchantId: context.merchantId,
    userId: user.id,
  });
  const redirectUri = `${getAppUrl()}/api/integrations/shipbob/callback`;
  await beginOAuthConnectionTransaction(serviceClient, {
    state: stateToken,
    merchantId: context.merchantId,
    userId: user.id,
    providerId: 'shipbob',
    environment,
    callbackUrl: redirectUri,
    providerAccountHint: null,
  });
  await recordShipBobAudit(serviceClient, { merchantId: context.merchantId, actorUserId: user.id, environment, action: 'shipbob_connection_started', status: 'started' });
  const authorizeUrl = new URL(`${shipBobOAuthBaseUrl(sandbox)}/connect/authorize`);
  authorizeUrl.searchParams.set('client_id', oauthCredentials.clientId);
  authorizeUrl.searchParams.set('response_type', 'code');
  // ShipBob upgrades the request to a hybrid `code id_token` response. Without
  // an explicit response mode IdentityServer places the authorization result
  // in the URL fragment, which is never sent to this server-side callback.
  // form_post keeps the result out of browser history and is already accepted
  // by the callback's POST handler.
  authorizeUrl.searchParams.set('response_mode', 'form_post');
  authorizeUrl.searchParams.set('scope', SHIPBOB_READ_SCOPES.join(' '));
  authorizeUrl.searchParams.set('redirect_uri', redirectUri);
  authorizeUrl.searchParams.set('code_challenge', shipBobCodeChallenge(oauthState.codeVerifier));
  authorizeUrl.searchParams.set('code_challenge_method', 'S256');
  authorizeUrl.searchParams.set('state', stateToken);
  authorizeUrl.searchParams.set('nonce', crypto.randomBytes(16).toString('base64url'));
  authorizeUrl.searchParams.set('integration_name', 'Unauth');

  const response = NextResponse.redirect(authorizeUrl.toString());
  response.cookies.set(shipBobOAuthCookie, JSON.stringify(oauthState), shipBobOAuthCookieOptions());
  return response;
}
