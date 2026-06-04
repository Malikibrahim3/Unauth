import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { exchangeBigCommerceOAuthAccessToken } from '@/lib/commerce/bigcommerce/exchangeOAuthAccessToken';
import { persistBigCommerceOAuthConnection } from '@/lib/commerce/bigcommerce/persistOAuthConnection';
import { storeHashFromOAuthContext } from '@/lib/commerce/bigcommerce/normalizeStoreHash';
import {
  clearBigCommerceOAuthCookieOptions,
} from '@/lib/commerce/bigcommerce/oauthCookies';
import { registerBigCommerceWebhooks } from '@/lib/commerce/bigcommerce/registerWebhooks';
import { resolveBigCommerceOAuthMerchantId } from '@/lib/commerce/bigcommerce/resolveOAuthMerchantId';
import { getAppUrl } from '@/lib/utils/appUrl';
import { logAction } from '@/lib/permissions/audit';
import { PERMISSIONS, requirePermission, resolveCallerContext } from '@/lib/permissions';
import { getClientIp } from '@/lib/ratelimit';

const INTEGRATIONS_PATH = '/settings/integrations/bigcommerce';

function integrationsRedirect(params: Record<string, string>): NextResponse {
  const appUrl = getAppUrl();
  const url = new URL(INTEGRATIONS_PATH, appUrl);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return NextResponse.redirect(url);
}

function clearOAuthCookies(response: NextResponse): void {
  response.cookies.set('bigcommerce_oauth_state', '', clearBigCommerceOAuthCookieOptions());
  response.cookies.set('bigcommerce_oauth_merchant_id', '', clearBigCommerceOAuthCookieOptions());
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const code = params.get('code');
  const state = params.get('state');
  const context = params.get('context');
  const storeHash = storeHashFromOAuthContext(context);

  if (!code || !state || !storeHash) {
    const response = integrationsRedirect({ bigcommerce_error: 'missing_params' });
    clearOAuthCookies(response);
    return response;
  }

  const stateCookie = request.cookies.get('bigcommerce_oauth_state')?.value;
  if (!stateCookie || stateCookie !== state) {
    const response = integrationsRedirect({ bigcommerce_error: 'invalid_state' });
    clearOAuthCookies(response);
    return response;
  }

  try {
    const userClient = createClient();
    const serviceClient = createServiceClient();
    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) {
      const response = integrationsRedirect({ bigcommerce_error: 'unauthorized' });
      clearOAuthCookies(response);
      return response;
    }

    const { denied } = await requirePermission(serviceClient, user.id, PERMISSIONS.MANAGE_SETTINGS);
    if (denied) {
      const response = integrationsRedirect({ bigcommerce_error: 'forbidden' });
      clearOAuthCookies(response);
      return response;
    }

    const appUrl = getAppUrl();
    const redirectUri = `${appUrl.replace(/\/$/, '')}/api/bigcommerce/callback`;

    const tokenExchange = await exchangeBigCommerceOAuthAccessToken({
      code,
      context: context ?? `stores/${storeHash}`,
      redirectUri,
    });

    if (!tokenExchange.ok) {
      const response = integrationsRedirect({ bigcommerce_error: 'token_exchange_failed' });
      clearOAuthCookies(response);
      return response;
    }

    const merchantId = await resolveBigCommerceOAuthMerchantId(
      request,
      serviceClient,
      userClient,
    );

    const persisted = await persistBigCommerceOAuthConnection(serviceClient, {
      storeHash,
      accessToken: tokenExchange.token.access_token,
      scope: tokenExchange.token.scope ?? null,
      merchantId,
    });

    if (!persisted.ok) {
      const errorKey =
        persisted.error === 'missing_merchant' ? 'missing_merchant' : 'connection_failed';
      const response = integrationsRedirect({ bigcommerce_error: errorKey });
      clearOAuthCookies(response);
      return response;
    }

    if (user) {
      const ctx = await resolveCallerContext(serviceClient, user.id);
      if (ctx) {
        logAction({
          ctx,
          action: 'connect_bigcommerce',
          resourceType: 'commerce_store_connection',
          resourceId: persisted.connectionId,
          metadata: { store_key: storeHash },
          ip: getClientIp(request.headers),
        });
      }
    }

    let webhookWarning = false;
    try {
      const webhookResult = await registerBigCommerceWebhooks({
        storeHash,
        accessToken: tokenExchange.token.access_token,
      });
      if (webhookResult.failed.length > 0) {
        webhookWarning = true;
        const summary = webhookResult.failed.map((f) => `${f.scope}: ${f.error}`).join('; ');
        await serviceClient
          .from('commerce_store_connections' as never)
          .update({ last_error: `webhook_register_partial: ${summary.slice(0, 500)}` } as never)
          .eq('merchant_id', persisted.merchantId)
          .eq('platform', 'bigcommerce')
          .eq('store_key', storeHash);
      }
    } catch (webhookError) {
      webhookWarning = true;
      console.error('BigCommerce webhook registration failed', {
        storeHash,
        message: webhookError instanceof Error ? webhookError.message : 'unknown',
      });
    }

    const successParams: Record<string, string> = {
      bigcommerce_connected: '1',
      store: storeHash,
    };
    if (webhookWarning) successParams.bigcommerce_warning = 'webhook_registration_failed';

    const response = integrationsRedirect(successParams);
    clearOAuthCookies(response);
    return response;
  } catch (error) {
    console.error('BigCommerce OAuth callback failed', {
      message: error instanceof Error ? error.message : String(error),
      storeHash,
    });
    const response = integrationsRedirect({ bigcommerce_error: 'callback_failed' });
    clearOAuthCookies(response);
    return response;
  }
}
