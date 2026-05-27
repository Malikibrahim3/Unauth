import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { backfillShopifyMerchantIdentities } from '@/lib/shopify/backfill';
import { shopifyDebugLog } from '@/lib/shopify/debugLog';
import { clearShopifyOAuthCookieOptions } from '@/lib/shopify/oauthCookies';
import { resolveOAuthMerchantId } from '@/lib/shopify/resolveOAuthMerchantId';
import { registerShopifyWebhooks } from '@/lib/shopify/webhooks';
import { getAppUrl } from '@/lib/utils/appUrl';

const SHOP_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/;
const INTEGRATIONS_PATH = '/settings/integrations';

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

function integrationsRedirect(
  request: NextRequest,
  params: Record<string, string>,
): NextResponse {
  const appUrl = getAppUrl();
  const url = new URL(INTEGRATIONS_PATH, appUrl);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  shopifyDebugLog('final_redirect', { path: `${url.pathname}${url.search}` });
  return NextResponse.redirect(url);
}

function clearOAuthCookies(response: NextResponse): void {
  response.cookies.set('shopify_oauth_state', '', clearShopifyOAuthCookieOptions());
  response.cookies.set('shopify_oauth_merchant_id', '', clearShopifyOAuthCookieOptions());
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
    const response = integrationsRedirect(request, { shopify_error: 'missing_params' });
    clearOAuthCookies(response);
    return response;
  }

  const stateCookie = request.cookies.get('shopify_oauth_state')?.value;
  if (!stateCookie || stateCookie !== state) {
    shopifyDebugLog('callback.state_invalid', { hasStateCookie: Boolean(stateCookie) });
    const response = integrationsRedirect(request, { shopify_error: 'invalid_state' });
    clearOAuthCookies(response);
    return response;
  }

  const apiKey = process.env.SHOPIFY_API_KEY;
  const apiSecret = process.env.SHOPIFY_API_SECRET;
  if (!apiKey || !apiSecret) {
    const response = integrationsRedirect(request, { shopify_error: 'misconfigured' });
    clearOAuthCookies(response);
    return response;
  }

  const hmacValid = verifyOAuthHmac(params, apiSecret);
  shopifyDebugLog('callback.hmac_valid', { callbackHmacValid: hmacValid, callbackShopDomain: shop });
  if (!hmacValid) {
    const response = integrationsRedirect(request, { shopify_error: 'invalid_hmac' });
    clearOAuthCookies(response);
    return response;
  }

  try {
    shopifyDebugLog('token_exchange.started', { callbackShopDomain: shop });
    const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: apiKey,
        client_secret: apiSecret,
        code,
      }),
    });
    if (!tokenRes.ok) {
      shopifyDebugLog('token_exchange.success', { tokenExchangeSuccess: false, status: tokenRes.status });
      const response = integrationsRedirect(request, { shopify_error: 'token_exchange_failed' });
      clearOAuthCookies(response);
      return response;
    }
    const tokenPayload = (await tokenRes.json()) as { access_token?: string };
    const accessToken = tokenPayload.access_token;
    if (!accessToken) {
      shopifyDebugLog('token_exchange.success', { tokenExchangeSuccess: false, reason: 'missing_token' });
      const response = integrationsRedirect(request, { shopify_error: 'token_exchange_failed' });
      clearOAuthCookies(response);
      return response;
    }
    shopifyDebugLog('token_exchange.success', { tokenExchangeSuccess: true });

    const serviceClient = createServiceClient();
    const userClient = createClient();
    const merchantId = await resolveOAuthMerchantId(request, serviceClient, userClient);
    shopifyDebugLog('callback.merchant_resolved', { hasMerchantId: Boolean(merchantId) });

    const now = new Date().toISOString();
    const { error: merchantTokenError } = await serviceClient
      .from('shopify_merchants' as never)
      .upsert(
        {
          shop_domain: shop,
          access_token: accessToken,
          uninstalled_at: null,
          updated_at: now,
        },
        { onConflict: 'shop_domain' },
      );

    if (merchantTokenError) {
      throw new Error(merchantTokenError.message);
    }

    if (!merchantId) {
      shopifyDebugLog('merchant_connection.upserted', { merchantConnectionUpserted: false, merchantConnectionActive: false });
      const response = integrationsRedirect(request, { shopify_error: 'missing_merchant' });
      clearOAuthCookies(response);
      return response;
    }

    const { error: mappingError } = await serviceClient
      .from('merchant_shopify_connections' as never)
      .upsert(
        {
          merchant_id: merchantId,
          shop_domain: shop,
          active: true,
          uninstalled_at: null,
          updated_at: now,
        },
        { onConflict: 'merchant_id' },
      );

    if (mappingError) {
      shopifyDebugLog('merchant_connection.upserted', { merchantConnectionUpserted: false, merchantConnectionActive: false });
      const response = integrationsRedirect(request, { shopify_error: 'connection_failed' });
      clearOAuthCookies(response);
      return response;
    }

    shopifyDebugLog('merchant_connection.upserted', {
      merchantConnectionUpserted: true,
      merchantConnectionActive: true,
    });

    shopifyDebugLog('backfill.started', { callbackShopDomain: shop });
    let backfillSuccess = true;
    try {
      await backfillShopifyMerchantIdentities({
        shopDomain: shop,
        accessToken,
        supabase: serviceClient,
      });
      shopifyDebugLog('backfill.success', { backfillSuccess: true });
    } catch (backfillError) {
      backfillSuccess = false;
      shopifyDebugLog('backfill.success', {
        backfillSuccess: false,
        message: backfillError instanceof Error ? backfillError.message : 'unknown',
      });
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
        message: webhookError instanceof Error ? webhookError.message : 'unknown',
      });
    }

    const successParams: Record<string, string> = {
      shopify_connected: '1',
      shop: shop,
    };
    if (!backfillSuccess) successParams.shopify_warning = 'backfill_failed';
    if (!webhookRegistrationSuccess) successParams.shopify_warning = 'webhook_registration_failed';

    const response = integrationsRedirect(request, successParams);
    clearOAuthCookies(response);
    return response;
  } catch (error) {
    console.error('Shopify OAuth callback failed', {
      message: error instanceof Error ? error.message : String(error),
      shop,
    });
    const response = integrationsRedirect(request, { shopify_error: 'callback_failed' });
    clearOAuthCookies(response);
    return response;
  }
}
