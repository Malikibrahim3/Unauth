import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import crypto from 'crypto';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { backfillShopifyMerchantIdentities } from '@/lib/shopify/backfill';
import { backfillShopifyAuditTransactions } from '@/lib/shopify/auditBridge';
import { shopifyDebugLog } from '@/lib/shopify/debugLog';
import { clearShopifyOAuthCookieOptions } from '@/lib/shopify/oauthCookies';
import { resolveOAuthMerchantId } from '@/lib/shopify/resolveOAuthMerchantId';
import { registerShopifyWebhooks } from '@/lib/shopify/webhooks';
import { shopifyAuditError } from '@/lib/shopify/auditLog';
import { getAppUrl } from '@/lib/utils/appUrl';
import { exchangeShopifyOAuthAccessToken } from '@/lib/shopify/exchangeOAuthAccessToken';
import { persistShopifyOAuthConnection } from '@/lib/shopify/persistOAuthConnection';
import { registerShopifyCollectorScriptTags } from '@/lib/shopify/collectorScripts';

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
    const tokenExchange = await exchangeShopifyOAuthAccessToken(shop, code, apiKey, apiSecret);
    if (!tokenExchange.ok) {
      shopifyDebugLog('token_exchange.success', {
        tokenExchangeSuccess: false,
        status: tokenExchange.status,
        reason: tokenExchange.reason,
      });
      const response = integrationsRedirect(request, { shopify_error: 'token_exchange_failed' });
      clearOAuthCookies(response);
      return response;
    }
    const accessToken = tokenExchange.accessToken;
    shopifyDebugLog('token_exchange.success', { tokenExchangeSuccess: true });

    const serviceClient = createServiceClient();
    const userClient = createClient();
    const merchantId = await resolveOAuthMerchantId(request, serviceClient, userClient);
    shopifyDebugLog('callback.merchant_resolved', { hasMerchantId: Boolean(merchantId) });

    const persisted = await persistShopifyOAuthConnection(serviceClient, {
      shop,
      accessToken,
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
      const response = integrationsRedirect(request, { shopify_error: persisted.error });
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
        supabase: serviceClient,
      });
      shopifyDebugLog('backfill.identity.success', {
        callbackShopDomain: shop,
        orders: identityResult.orders,
        signalsUpserted: identityResult.signals_upserted,
      });
    } catch (backfillError) {
      identityBackfillSuccess = false;
      const message = backfillError instanceof Error ? backfillError.message : 'unknown';
      console.error('Shopify identity backfill failed', { shop, message });
      shopifyDebugLog('backfill.identity.failed', { callbackShopDomain: shop, message });
    }

    // Score into audit_transactions after the redirect so OAuth does not hit serverless timeouts.
    const connectedMerchantId = persisted.merchantId;
    after(async () => {
      try {
        const auditBackfill = await backfillShopifyAuditTransactions({
          supabase: serviceClient,
          shopDomain: shop,
          merchantId: connectedMerchantId,
        });
        shopifyDebugLog('backfill.audit.finished', {
          callbackShopDomain: shop,
          scored: auditBackfill.scored,
          skipped: auditBackfill.skipped,
          batches: auditBackfill.batches,
        });
      } catch (auditError) {
        shopifyAuditError('backfill.audit.failed', auditError, { shopDomain: shop, merchantId: connectedMerchantId });
        shopifyDebugLog('backfill.audit.failed', {
          callbackShopDomain: shop,
          message: auditError instanceof Error ? auditError.message : 'unknown',
        });
      }
    });

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

    let collectorRegistrationSuccess = true;
    try {
      const collectorTags = await registerShopifyCollectorScriptTags({
        shopDomain: shop,
        accessToken,
      });
      await serviceClient
        .from('store_connections')
        .update({
          collector_metadata: {
            shopify_collector_script_tag_id: collectorTags.collectorScriptTagId,
            shopify_collector_init_script_tag_id: collectorTags.initScriptTagId,
          },
        })
        .eq('platform', 'shopify')
        .eq('store_key', shop);
      await serviceClient
        .from('merchants')
        .update({
          shopify_collector_script_tag_id: collectorTags.collectorScriptTagId,
          shopify_collector_init_script_tag_id: collectorTags.initScriptTagId,
        })
        .eq('id', connectedMerchantId);
    } catch (collectorError) {
      collectorRegistrationSuccess = false;
      shopifyDebugLog('collector_registration.failure', {
        callbackShopDomain: shop,
        message: collectorError instanceof Error ? collectorError.message : 'unknown',
      });
    }

    const successParams: Record<string, string> = {
      shopify_connected: '1',
      shop: shop,
    };
    if (!identityBackfillSuccess) successParams.shopify_warning = 'backfill_failed';
    if (!webhookRegistrationSuccess) successParams.shopify_warning = 'webhook_registration_failed';
    if (!collectorRegistrationSuccess) successParams.shopify_warning = 'collector_registration_failed';

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
