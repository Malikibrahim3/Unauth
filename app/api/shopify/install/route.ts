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

    const authRoute = await shopify.auth.begin({
      shop,
      callbackPath: '/api/shopify/callback',
      isOnline: false,
      rawRequest: request,
    });

    return authRoute as unknown as NextResponse;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to begin Shopify OAuth';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

