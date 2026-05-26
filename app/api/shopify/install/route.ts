import { NextRequest, NextResponse } from 'next/server';
import { shopify } from '@/lib/shopify/client';

function normalizeShopDomain(shop: string): string | null {
  const value = shop.trim().toLowerCase();
  if (!value) return null;
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(value) ? value : null;
}

export async function GET(request: NextRequest) {
  try {
    const shopParam = request.nextUrl.searchParams.get('shop');
    const shop = shopParam ? normalizeShopDomain(shopParam) : null;

    if (!shop) {
      return NextResponse.json({ error: 'Invalid or missing shop domain' }, { status: 400 });
    }

    const response = await shopify.auth.begin({
      shop,
      callbackPath: '/api/shopify/callback',
      isOnline: false,
      rawRequest: request,
    });

    const redirectUrl = response.headers.get('location');
    if (!redirectUrl) {
      throw new Error('No redirect URL from Shopify');
    }

    return NextResponse.redirect(redirectUrl);
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
