import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { exchangeBigCommerceOAuthAccessToken } from '@/lib/commerce/bigcommerce/exchangeOAuthAccessToken';
import { persistBigCommerceOAuthConnection } from '@/lib/commerce/bigcommerce/persistOAuthConnection';
import { storeHashFromOAuthContext } from '@/lib/commerce/bigcommerce/normalizeStoreHash';
import {
  clearBigCommerceOAuthCookieOptions,
} from '@/lib/commerce/bigcommerce/oauthCookies';
import { registerBigCommerceWebhooks } from '@/lib/commerce/bigcommerce/registerWebhooks';
import { registerBigCommerceCollectorScript } from '@/lib/commerce/bigcommerce/collectorScript';
import { getAppUrl } from '@/lib/utils/appUrl';
import { logAction } from '@/lib/permissions/audit';
import { PERMISSIONS, requirePermissionForMerchant } from '@/lib/permissions';
import { consumeOAuthConnectionTransaction } from '@/lib/integrations/oauthTransactions';
import { getClientIp } from '@/lib/ratelimit';
import { backfillBigCommerceOrders } from '@/lib/commerce/bigcommerce/backfill';
import { TABLES } from '@/lib/supabase/tables';
import { safeConnectionErrorCode } from '@/lib/integrations/publicErrors';

const INTEGRATIONS_PATH = '/integrations/bigcommerce';

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

    const appUrl = getAppUrl();
    const redirectUri = `${appUrl.replace(/\/$/, '')}/api/bigcommerce/callback`;
    let transaction;
    try {
      transaction = await consumeOAuthConnectionTransaction(serviceClient, {
        state,
        userId: user.id,
        providerId: 'bigcommerce',
        callbackUrl: redirectUri,
      });
    } catch {
      const response = integrationsRedirect({ bigcommerce_error: 'invalid_or_replayed_state' });
      clearOAuthCookies(response);
      return response;
    }
    const { denied, ctx } = await requirePermissionForMerchant(
      serviceClient,
      user.id,
      transaction.merchantId,
      PERMISSIONS.MANAGE_SETTINGS,
    );
    if (denied) {
      const response = integrationsRedirect({ bigcommerce_error: 'forbidden' });
      clearOAuthCookies(response);
      return response;
    }

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

    const persisted = await persistBigCommerceOAuthConnection(serviceClient, {
      storeHash,
      accessToken: tokenExchange.token.access_token,
      scope: tokenExchange.token.scope ?? null,
      merchantId: transaction.merchantId,
    });

    if (!persisted.ok) {
      const errorKey =
        persisted.error === 'missing_merchant' ? 'missing_merchant' : 'connection_failed';
      const response = integrationsRedirect({ bigcommerce_error: errorKey });
      clearOAuthCookies(response);
      return response;
    }

    logAction({
      ctx,
      action: 'connect_bigcommerce',
      resourceType: 'commerce_store_connection',
      resourceId: persisted.connectionId,
      metadata: { store_key: storeHash },
      ip: getClientIp(request.headers),
    });

    let webhookWarning = false;
    try {
      const webhookResult = await registerBigCommerceWebhooks({
        storeHash,
        accessToken: tokenExchange.token.access_token,
      });
      if (webhookResult.failed.length > 0) {
        webhookWarning = true;
        await serviceClient
          .from(TABLES.MERCHANT_SHOPIFY_CONNECTIONS)
          .update({ last_error: 'webhook_register_partial' } as never)
          .eq('merchant_id', persisted.merchantId)
          .eq('platform', 'bigcommerce')
          .eq('store_key', storeHash);
      }
    } catch (webhookError) {
      webhookWarning = true;
      console.error('BigCommerce webhook registration failed', {
        storeHash,
        category: safeConnectionErrorCode(webhookError instanceof Error ? webhookError.message : null)
          ?? 'bigcommerce_webhook_registration_failed',
      });
    }

    let collectorWarning = false;
    try {
      const scriptUuid = await registerBigCommerceCollectorScript({
        storeHash,
        accessToken: tokenExchange.token.access_token,
        merchantId: persisted.merchantId,
      });
      await serviceClient
        .from(TABLES.MERCHANT_SHOPIFY_CONNECTIONS)
        .update({
          collector_metadata: { bigcommerce_script_uuid: scriptUuid },
        })
        .eq('merchant_id', persisted.merchantId)
        .eq('platform', 'bigcommerce')
        .eq('store_key', storeHash);
      await serviceClient
        .from('merchants')
        .update({ bigcommerce_script_uuid: scriptUuid })
        .eq('id', persisted.merchantId);
    } catch (collectorError) {
      collectorWarning = true;
      console.error('BigCommerce collector script registration failed', {
        storeHash,
        category: safeConnectionErrorCode(collectorError instanceof Error ? collectorError.message : null)
          ?? 'bigcommerce_collector_registration_failed',
      });
    }

    const connectedMerchantId = persisted.merchantId;
    const accessToken = tokenExchange.token.access_token;
    after(async () => {
      try {
        await backfillBigCommerceOrders({
          supabase: serviceClient,
          storeHash,
          accessToken,
        });
      } catch (err) {
        console.error('BigCommerce historical order backfill failed', {
          storeHash,
          merchantId: connectedMerchantId,
          category: safeConnectionErrorCode(err instanceof Error ? err.message : null)
            ?? 'bigcommerce_backfill_failed',
        });
      }
    });

    const successParams: Record<string, string> = {
      bigcommerce_connected: '1',
      store: storeHash,
    };
    if (webhookWarning) successParams.bigcommerce_warning = 'webhook_registration_failed';
    if (collectorWarning) successParams.bigcommerce_warning = 'collector_registration_failed';

    const response = integrationsRedirect(successParams);
    clearOAuthCookies(response);
    return response;
  } catch (error) {
    console.error('BigCommerce OAuth callback failed', {
      category: safeConnectionErrorCode(error instanceof Error ? error.message : null)
        ?? 'bigcommerce_callback_failed',
      storeHash,
    });
    const response = integrationsRedirect({ bigcommerce_error: 'callback_failed' });
    clearOAuthCookies(response);
    return response;
  }
}
