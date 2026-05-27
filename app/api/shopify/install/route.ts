import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { ensureMerchantContextForUser } from '@/lib/account/ensureMerchantContext';
import { normalizeShopInput } from '@/lib/shopify/normalizeShopInput';

const INTEGRATIONS_URL = '/settings/integrations';

export async function GET(request: NextRequest) {
  const shopParam = request.nextUrl.searchParams.get('shop') ?? '';
  const normalized = normalizeShopInput(shopParam);

  if (normalized.error !== null) {
    // Never show raw JSON to the browser — redirect back to the integrations page
    // with a query param the UI can surface as a friendly message.
    const reason = normalized.error === 'public_domain' ? 'public_domain' : 'invalid_shop';
    return NextResponse.redirect(
      new URL(`${INTEGRATIONS_URL}?error=${reason}`, request.url),
    );
  }

  const shop = normalized.domain;

  try {
    const apiKey = process.env.SHOPIFY_API_KEY;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!apiKey || !appUrl) {
      console.error('Shopify install: missing SHOPIFY_API_KEY or NEXT_PUBLIC_APP_URL');
      return NextResponse.redirect(
        new URL(`${INTEGRATIONS_URL}?error=misconfigured`, request.url),
      );
    }

    const state = crypto.randomBytes(16).toString('hex');
    const redirectUri = `${appUrl.replace(/\/$/, '')}/api/shopify/callback`;
    const scope = 'read_orders,read_all_orders,read_customers';
    const installUrl = new URL(`https://${shop}/admin/oauth/authorize`);
    installUrl.searchParams.set('client_id', apiKey);
    installUrl.searchParams.set('scope', scope);
    installUrl.searchParams.set('redirect_uri', redirectUri);
    installUrl.searchParams.set('state', state);

    const response = NextResponse.redirect(installUrl.toString());
    response.cookies.set('shopify_oauth_state', state, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 600,
    });

    const supabase = createClient();
    const serviceClient = createServiceClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const ctx = await ensureMerchantContextForUser(serviceClient, user);
      if (ctx?.merchantId) {
        response.cookies.set('shopify_oauth_merchant_id', ctx.merchantId, {
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          path: '/',
          maxAge: 600,
        });
      }
    }

    return response;
  } catch (error) {
    console.error('Shopify install route failed', {
      error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      url: request.url,
      shop,
    });
    return NextResponse.redirect(
      new URL(`${INTEGRATIONS_URL}?error=install_failed`, request.url),
    );
  }
}
