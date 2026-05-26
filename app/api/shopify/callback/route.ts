import { NextRequest, NextResponse } from 'next/server';
import { shopify } from '@/lib/shopify/client';
import { createServiceClient } from '@/lib/supabase/server';
import { backfillShopifyMerchantIdentities } from '@/lib/shopify/backfill';
import { registerShopifyWebhooks } from '@/lib/shopify/webhooks';

export async function GET(request: NextRequest) {
  try {
    const { session } = await shopify.auth.callback({
      rawRequest: request,
    });
    if (!session.accessToken) {
      throw new Error('Missing Shopify access token after OAuth callback');
    }

    const supabase = createServiceClient();
    const { error } = await supabase
      .from('shopify_merchants' as any)
      .upsert(
        {
          shop_domain: session.shop,
          access_token: session.accessToken,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'shop_domain' }
      );

    if (error) {
      throw new Error(error.message);
    }

    const backfill = await backfillShopifyMerchantIdentities({
      shopDomain: session.shop,
      accessToken: session.accessToken,
      supabase,
    });
    await registerShopifyWebhooks({
      shopDomain: session.shop,
      accessToken: session.accessToken,
    });

    return NextResponse.json({ ok: true, shop: session.shop, backfill });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Shopify OAuth callback failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
