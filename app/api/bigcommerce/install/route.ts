import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { ensureMerchantContextForUser } from '@/lib/account/ensureMerchantContext';
import {
  ACTIVE_MERCHANT_COOKIE,
  PERMISSIONS,
  requirePermissionForMerchant,
} from '@/lib/permissions';
import { beginOAuthConnectionTransaction } from '@/lib/integrations/oauthTransactions';
import {
  bigCommerceOAuthCookieOptions,
  clearBigCommerceOAuthCookieOptions,
} from '@/lib/commerce/bigcommerce/oauthCookies';
import { BIGCOMMERCE_OAUTH_SCOPES } from '@/lib/commerce/bigcommerce/bigcommerceConnectionShared';
import { getAppUrl } from '@/lib/utils/appUrl';
import { env } from '@/lib/utils/env';
import { safeConnectionErrorCode } from '@/lib/integrations/publicErrors';

const INTEGRATIONS_URL = '/settings/integrations/bigcommerce';

function integrationsRedirect(request: NextRequest, params: Record<string, string>): NextResponse {
  const url = new URL(INTEGRATIONS_URL, request.url);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const clientId = env.BIGCOMMERCE_CLIENT_ID;
  const clientSecret = env.BIGCOMMERCE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return integrationsRedirect(request, { bigcommerce_error: 'misconfigured' });
  }

  try {
    const supabase = createClient();
    const serviceClient = createServiceClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return integrationsRedirect(request, { bigcommerce_error: 'unauthorized' });
    }

    const selectedMerchantId = request.cookies.get(ACTIVE_MERCHANT_COOKIE)?.value ?? null;
    const ctx = await ensureMerchantContextForUser(serviceClient, user, selectedMerchantId);
    if (!ctx) {
      return integrationsRedirect(request, { bigcommerce_error: 'missing_merchant' });
    }
    const { denied } = await requirePermissionForMerchant(
      serviceClient,
      user.id,
      ctx.merchantId,
      PERMISSIONS.MANAGE_SETTINGS,
    );
    if (denied) {
      return integrationsRedirect(request, { bigcommerce_error: 'forbidden' });
    }

    const appUrl = getAppUrl();
    const redirectUri = `${appUrl.replace(/\/$/, '')}/api/bigcommerce/callback`;
    const state = await beginOAuthConnectionTransaction(serviceClient, {
      merchantId: ctx.merchantId,
      userId: user.id,
      providerId: 'bigcommerce',
      environment: 'production',
      callbackUrl: redirectUri,
      providerAccountHint: null,
    });

    const authorizeUrl = new URL('https://login.bigcommerce.com/oauth2/authorize');
    authorizeUrl.searchParams.set('client_id', clientId);
    authorizeUrl.searchParams.set('redirect_uri', redirectUri);
    authorizeUrl.searchParams.set('response_type', 'code');
    authorizeUrl.searchParams.set('scope', BIGCOMMERCE_OAUTH_SCOPES);
    authorizeUrl.searchParams.set('state', state);

    const response = NextResponse.redirect(authorizeUrl.toString());
    response.cookies.set('bigcommerce_oauth_state', state, bigCommerceOAuthCookieOptions(600));

    return response;
  } catch (error) {
    console.error('BigCommerce install route failed', {
      category: safeConnectionErrorCode(error instanceof Error ? error.message : null)
        ?? 'bigcommerce_install_failed',
    });
    const response = integrationsRedirect(request, { bigcommerce_error: 'install_failed' });
    response.cookies.set('bigcommerce_oauth_state', '', clearBigCommerceOAuthCookieOptions());
    return response;
  }
}
