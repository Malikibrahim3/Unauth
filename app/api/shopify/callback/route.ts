import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { backfillShopifyMerchantIdentities } from '@/lib/shopify/backfill';
import { shopifyDebugLog } from '@/lib/shopify/debugLog';
import { clearShopifyOAuthCookieOptions } from '@/lib/shopify/oauthCookies';
import { registerShopifyWebhooks } from '@/lib/shopify/webhooks';
import { getAppUrl } from '@/lib/utils/appUrl';
import { exchangeShopifyOAuthAccessToken, fetchShopifyGrantedScopes } from '@/lib/shopify/exchangeOAuthAccessToken';
import { persistShopifyOAuthConnection } from '@/lib/shopify/persistOAuthConnection';
import { consumeOAuthConnectionTransaction } from '@/lib/integrations/oauthTransactions';
import { PERMISSIONS, requirePermissionForMerchant } from '@/lib/permissions';
import { safeConnectionErrorCode } from '@/lib/integrations/publicErrors';

const SHOP_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/;
const INTEGRATIONS_PATH = '/settings/integrations';

export const maxDuration = 300;

function normalizeShopDomain(shop: string): string | null {
  const value = shop.trim();
  if (!value) return null;
  return SHOP_REGEX.test(value) ? value.toLowerCase() : null;
}

function verifyOAuthHmac(params: URLSearchParams, secret: string): boolean {
  const hmac = params.get('hmac');
  if (!hmac) return false;
  const message = [...params.entries()]
    .filter(([key]) => key !== 'hmac' && key !== 'signature')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  const digest = crypto.createHmac('sha256', secret).update(message).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(digest, 'utf8'), Buffer.from(hmac, 'utf8'));
}

function oauthCompleteResponse(params: Record<string, string>): NextResponse {
  const appUrl = getAppUrl();
  const fallbackUrl = new URL(INTEGRATIONS_PATH, appUrl);
  for (const [key, value] of Object.entries(params)) {
    fallbackUrl.searchParams.set(key, value);
  }

  const error = params.shopify_error ?? null;
  const payload = JSON.stringify({
    type: 'shopify_oauth_complete',
    success: !error,
    error,
  });
  const targetOrigin = JSON.stringify(new URL(appUrl).origin);
  const fallbackHref = JSON.stringify(fallbackUrl.toString());

  const response = new NextResponse(
    `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Returning to Unauth</title>
    <style>
      body {
        align-items: center;
        background: #f7f5f2;
        color: #211f1c;
        display: flex;
        font: 14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        height: 100vh;
        justify-content: center;
        margin: 0;
      }
    </style>
  </head>
  <body>
    <p>Returning to Unauth...</p>
    <script>
      const payload = ${payload};
      const targetOrigin = ${targetOrigin};
      const fallbackHref = ${fallbackHref};

      try {
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage(payload, targetOrigin);
          window.close();
        } else {
          window.location.replace(fallbackHref);
        }
      } catch {
        window.location.replace(fallbackHref);
      }
    </script>
  </body>
</html>`,
    {
      headers: {
        'content-type': 'text/html; charset=utf-8',
      },
    },
  );

  shopifyDebugLog('oauth_complete_response', { path: `${fallbackUrl.pathname}${fallbackUrl.search}` });
  return response;
}

function clearOAuthCookies(response: NextResponse): void {
  response.cookies.set('shopify_oauth_state', '', clearShopifyOAuthCookieOptions());
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const code = params.get('code');
  const shopParam = params.get('shop');
  const state = params.get('state');
  const hmac = params.get('hmac');
  const timestamp = params.get('timestamp');
  const shop = shopParam ? normalizeShopDomain(shopParam) : null;

  shopifyDebugLog('callback.received', {
    hasCode: Boolean(code),
    callbackShopDomain: shop,
    hasState: Boolean(state),
    hasHmac: Boolean(hmac),
    hasTimestamp: Boolean(timestamp),
  });

  if (!code || !shop || !state || !hmac || !timestamp) {
    const response = oauthCompleteResponse({ shopify_error: 'missing_params' });
    clearOAuthCookies(response);
    return response;
  }

  const stateCookie = request.cookies.get('shopify_oauth_state')?.value;
  if (!stateCookie || stateCookie !== state) {
    shopifyDebugLog('callback.state_invalid', { hasStateCookie: Boolean(stateCookie) });
    const response = oauthCompleteResponse({ shopify_error: 'invalid_state' });
    clearOAuthCookies(response);
    return response;
  }

  const apiKey = process.env.SHOPIFY_API_KEY;
  const apiSecret = process.env.SHOPIFY_API_SECRET;
  if (!apiKey || !apiSecret) {
    const response = oauthCompleteResponse({ shopify_error: 'misconfigured' });
    clearOAuthCookies(response);
    return response;
  }

  const hmacValid = verifyOAuthHmac(params, apiSecret);
  shopifyDebugLog('callback.hmac_valid', { callbackHmacValid: hmacValid, callbackShopDomain: shop });
  if (!hmacValid) {
    const response = oauthCompleteResponse({ shopify_error: 'invalid_hmac' });
    clearOAuthCookies(response);
    return response;
  }

  try {
    const serviceClient = createServiceClient();
    const userClient = createClient();
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      const response = oauthCompleteResponse({ shopify_error: 'unauthorized' });
      clearOAuthCookies(response);
      return response;
    }
    const redirectUri = `${getAppUrl().replace(/\/$/, '')}/api/shopify/callback`;
    let transaction;
    try {
      transaction = await consumeOAuthConnectionTransaction(serviceClient, {
        state,
        userId: user.id,
        providerId: 'shopify',
        callbackUrl: redirectUri,
        providerAccountId: shop,
      });
    } catch {
      const response = oauthCompleteResponse({ shopify_error: 'invalid_or_replayed_state' });
      clearOAuthCookies(response);
      return response;
    }
    const authorization = await requirePermissionForMerchant(
      serviceClient,
      user.id,
      transaction.merchantId,
      PERMISSIONS.MANAGE_SETTINGS,
    );
    if (authorization.denied) {
      const response = oauthCompleteResponse({ shopify_error: 'forbidden' });
      clearOAuthCookies(response);
      return response;
    }

    shopifyDebugLog('token_exchange.started', { callbackShopDomain: shop });
    const tokenExchange = await exchangeShopifyOAuthAccessToken(shop, code, apiKey, apiSecret);
    if (!tokenExchange.ok) {
      shopifyDebugLog('token_exchange.success', {
        tokenExchangeSuccess: false,
        status: tokenExchange.status,
        reason: tokenExchange.reason,
      });
      const response = oauthCompleteResponse({ shopify_error: 'token_exchange_failed' });
      clearOAuthCookies(response);
      return response;
    }
    const accessToken = tokenExchange.accessToken;
    shopifyDebugLog('token_exchange.success', { tokenExchangeSuccess: true });

    const grantedScopes = await fetchShopifyGrantedScopes(shop, accessToken).catch(() => null);

    const merchantId = transaction.merchantId;
    shopifyDebugLog('callback.merchant_resolved', { hasMerchantId: true });

    const persisted = await persistShopifyOAuthConnection(serviceClient, {
      shop,
      accessToken,
      scope: grantedScopes?.join(',') ?? tokenExchange.scope,
      merchantId,
    });

    if (!persisted.ok) {
      if (persisted.error === 'merchant_token_failed') {
        throw new Error(persisted.message ?? 'merchant_token_failed');
      }
      shopifyDebugLog('merchant_connection.upserted', {
        merchantConnectionUpserted: false,
        merchantConnectionActive: false,
      });
      const response = oauthCompleteResponse({ shopify_error: persisted.error });
      clearOAuthCookies(response);
      return response;
    }

    shopifyDebugLog('merchant_connection.upserted', {
      merchantConnectionUpserted: true,
      merchantConnectionActive: true,
    });

    shopifyDebugLog('backfill.identity.started', { callbackShopDomain: shop });
    let identityBackfillSuccess = true;
    try {
      const identityResult = await backfillShopifyMerchantIdentities({
        shopDomain: shop,
        accessToken,
        merchantId: persisted.merchantId,
        supabase: serviceClient,
      });
      shopifyDebugLog('backfill.identity.success', {
        callbackShopDomain: shop,
        orders: identityResult.orders,
        sourceOrdersUpserted: identityResult.source_orders_upserted,
      });
    } catch (backfillError) {
      identityBackfillSuccess = false;
      const category = safeConnectionErrorCode(backfillError instanceof Error ? backfillError.message : null)
        ?? 'shopify_identity_backfill_failed';
      console.error('Shopify identity backfill failed', { shop, category });
      shopifyDebugLog('backfill.identity.failed', { callbackShopDomain: shop, category });
    }

    shopifyDebugLog('webhook_registration.started', { callbackShopDomain: shop });
    let webhookRegistrationSuccess = true;
    try {
      await registerShopifyWebhooks({
        shopDomain: shop,
        accessToken,
      });
      shopifyDebugLog('webhook_registration.success', { webhookRegistrationSuccess: true });
    } catch (webhookError) {
      webhookRegistrationSuccess = false;
      shopifyDebugLog('webhook_registration.failure', {
        webhookRegistrationSuccess: false,
        category: safeConnectionErrorCode(webhookError instanceof Error ? webhookError.message : null)
          ?? 'shopify_webhook_registration_failed',
      });
    }

    const successParams: Record<string, string> = {
      shopify_connected: '1',
      shop: shop,
    };
    if (!identityBackfillSuccess) successParams.shopify_warning = 'backfill_failed';
    if (!webhookRegistrationSuccess) successParams.shopify_warning = 'webhook_registration_failed';

    const response = oauthCompleteResponse(successParams);
    clearOAuthCookies(response);
    return response;
  } catch (error) {
    console.error('Shopify OAuth callback failed', {
      category: safeConnectionErrorCode(error instanceof Error ? error.message : null)
        ?? 'shopify_callback_failed',
      shop,
    });
    const response = oauthCompleteResponse({ shopify_error: 'callback_failed' });
    clearOAuthCookies(response);
    return response;
  }
}
