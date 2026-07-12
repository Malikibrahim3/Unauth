import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { TABLES } from '@/lib/supabase/tables';
import { mintCollectorToken } from '@/lib/checkout/collectorToken';
import { getAppUrl } from '@/lib/utils/appUrl';

export const runtime = 'nodejs';

const SHOP_RE = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i;

export async function GET(request: NextRequest) {
  const shopParam = request.nextUrl.searchParams.get('shop')?.trim().toLowerCase();
  if (!shopParam || !SHOP_RE.test(shopParam)) {
    return new NextResponse('', { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: connection } = await supabase
    .from(TABLES.MERCHANT_SHOPIFY_CONNECTIONS)
    .select('merchant_id')
    .eq('platform', 'shopify')
    .eq('store_key', shopParam)
    .eq('status', 'active')
    .maybeSingle();

  if (!connection?.merchant_id) {
    return new NextResponse('', { status: 404 });
  }

  const collectorToken = mintCollectorToken(connection.merchant_id);
  const ingestEndpoint = `${getAppUrl()}/api/checkout-signals/ingest`;

  const js = `
if (window.UnauthCollector) {
  window.UnauthCollector.init({
    merchantId: ${JSON.stringify(connection.merchant_id)},
    platform: "shopify",
    token: ${JSON.stringify(collectorToken)},
    endpoint: ${JSON.stringify(ingestEndpoint)}
  });
}
  `.trim();

  return new NextResponse(js, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
