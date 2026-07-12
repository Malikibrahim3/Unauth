import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { ensureMerchantContextForUser } from '@/lib/account/ensureMerchantContext';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { getAppUrl } from '@/lib/utils/appUrl';
import { env } from '@/lib/utils/env';
import {
  createShipBobOAuthState,
  sealShipBobOAuthState,
  SHIPBOB_READ_SCOPES,
  shipBobCodeChallenge,
  shipBobOAuthBaseUrl,
} from '@/lib/integrations/providers/shipbobOAuth';
import { shipBobOAuthCookie, shipBobOAuthCookieOptions } from '@/lib/integrations/shipbobOAuthCookies';

const REDIRECT_PATH = '/integrations';

function redirect(request: NextRequest, key: string): NextResponse {
  return NextResponse.redirect(new URL(`${REDIRECT_PATH}?${key}=1`, request.url));
}

export async function GET(request: NextRequest) {
  const clientId = env.SHIPBOB_OAUTH_CLIENT_ID;
  const clientSecret = env.SHIPBOB_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) return redirect(request, 'shipbob_misconfigured');

  const userClient = createClient();
  const serviceClient = createServiceClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return redirect(request, 'shipbob_unauthorized');
  const { denied } = await requirePermission(serviceClient, user.id, PERMISSIONS.MANAGE_SETTINGS);
  if (denied) return redirect(request, 'shipbob_forbidden');
  const context = await ensureMerchantContextForUser(serviceClient, user);
  if (!context?.merchantId) return redirect(request, 'shipbob_missing_merchant');

  // Environment comes from deployment config (SHIPBOB_SANDBOX), not the
  // browser: a hardcoded client-side query param would send every real
  // merchant to ShipBob's sandbox. The query param remains as an explicit
  // per-request override for testing.
  const environmentOverride = request.nextUrl.searchParams.get('environment');
  const sandbox = environmentOverride
    ? environmentOverride !== 'production'
    : env.SHIPBOB_SANDBOX === 'true';
  const oauthState = createShipBobOAuthState(sandbox);
  const stateToken = sealShipBobOAuthState({
    oauthState,
    merchantId: context.merchantId,
    userId: user.id,
  });
  const redirectUri = `${getAppUrl()}/api/integrations/shipbob/callback`;
  const authorizeUrl = new URL(`${shipBobOAuthBaseUrl(sandbox)}/connect/authorize`);
  authorizeUrl.searchParams.set('client_id', clientId);
  authorizeUrl.searchParams.set('response_type', 'code');
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
