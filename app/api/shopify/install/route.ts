import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { ensureMerchantContextForUser } from '@/lib/account/ensureMerchantContext';

const SHOP_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/;

function normalizeShopDomain(shop: string): string | null {
  const value = shop.trim();
  if (!value) return null;
  return SHOP_REGEX.test(value) ? value.toLowerCase() : null;
}

export async function GET(request: NextRequest) {
  try {
    const shopParam = request.nextUrl.searchParams.get('shop');
    const shop = shopParam ? normalizeShopDomain(shopParam) : null;

    if (!shop) {
      return NextResponse.json({ error: 'Invalid or missing shop domain' }, { status: 400 });
    }

    const apiKey = process.env.SHOPIFY_API_KEY;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!apiKey || !appUrl) {
      return NextResponse.json({ error: 'Missing SHOPIFY_API_KEY or NEXT_PUBLIC_APP_URL' }, { status: 500 });
    }

    const state = crypto.randomBytes(16).toString('hex');
    const redirectUri = `${appUrl.replace(/\/$/, '')}/api/shopify/callback`;
    const scope = 'read_orders,read_customers';
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
    const {
      data: { user },
    } = await supabase.auth.getUser();
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
      shop: request.nextUrl.searchParams.get('shop'),
    });
    const message = error instanceof Error ? error.message : 'Failed to begin Shopify OAuth';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
