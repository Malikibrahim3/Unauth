import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServiceClient } from '@/lib/supabase/server';
import { backfillShopifyMerchantIdentities } from '@/lib/shopify/backfill';
import { registerShopifyWebhooks } from '@/lib/shopify/webhooks';

const SHOP_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/;

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

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const code = params.get('code');
    const shopParam = params.get('shop');
    const state = params.get('state');
    const hmac = params.get('hmac');
    const timestamp = params.get('timestamp');
    const shop = shopParam ? normalizeShopDomain(shopParam) : null;

    if (!code || !shop || !state || !hmac || !timestamp) {
      return NextResponse.json({ error: 'Missing OAuth callback parameters' }, { status: 400 });
    }

    const stateCookie = request.cookies.get('shopify_oauth_state')?.value;
    if (!stateCookie || stateCookie !== state) {
      return NextResponse.json({ error: 'Invalid OAuth state' }, { status: 400 });
    }

    const apiKey = process.env.SHOPIFY_API_KEY;
    const apiSecret = process.env.SHOPIFY_API_SECRET;
    if (!apiKey || !apiSecret) {
      return NextResponse.json({ error: 'Missing SHOPIFY_API_KEY or SHOPIFY_API_SECRET' }, { status: 500 });
    }

    if (!verifyOAuthHmac(params, apiSecret)) {
      return NextResponse.json({ error: 'Invalid OAuth HMAC' }, { status: 400 });
    }

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
      const body = await tokenRes.text();
      throw new Error(`Token exchange failed (${tokenRes.status}): ${body.slice(0, 400)}`);
    }
    const tokenPayload = (await tokenRes.json()) as { access_token?: string };
    const accessToken = tokenPayload.access_token;
    if (!accessToken) {
      throw new Error('Missing Shopify access token after OAuth callback');
    }

    const supabase = createServiceClient();
    const { error } = await supabase
      .from('shopify_merchants' as any)
      .upsert(
        {
          shop_domain: shop,
          access_token: accessToken,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'shop_domain' }
      );

    if (error) {
      throw new Error(error.message);
    }

    const backfill = await backfillShopifyMerchantIdentities({
      shopDomain: shop,
      accessToken,
      supabase,
    });
    await registerShopifyWebhooks({
      shopDomain: shop,
      accessToken,
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
    const response = NextResponse.redirect(`${appUrl.replace(/\/$/, '')}/dashboard`);
    response.cookies.set('shopify_oauth_state', '', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Shopify OAuth callback failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
