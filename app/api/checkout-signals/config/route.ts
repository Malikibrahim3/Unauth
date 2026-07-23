import { NextRequest, NextResponse } from 'next/server';
import { mintCollectorToken } from '@/lib/checkout/collectorToken';
import { createServiceClient } from '@/lib/supabase/server';
import { TABLES } from '@/lib/supabase/tables';
import { getAppUrl } from '@/lib/utils/appUrl';

export const runtime = 'nodejs';

const PLATFORMS = new Set(['shopify', 'woocommerce', 'bigcommerce']);
const STORE_KEY_RE = /^[a-z0-9][a-z0-9._:/-]{0,254}$/i;
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * Bootstrap a short-lived, merchant-bound collector token without putting it
 * in an installed script URL. Store keys are public storefront identifiers;
 * checkout signals remain explicitly low-trust input after this handshake.
 */
export async function GET(request: NextRequest) {
  const platform = request.nextUrl.searchParams.get('platform')?.trim().toLowerCase() ?? '';
  const storeKey = request.nextUrl.searchParams.get('store')?.trim().toLowerCase() ?? '';
  if (!PLATFORMS.has(platform) || !STORE_KEY_RE.test(storeKey)) {
    return NextResponse.json({ error: 'invalid_collector_config' }, {
      status: 400,
      headers: CORS_HEADERS,
    });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from(TABLES.MERCHANT_SHOPIFY_CONNECTIONS)
    .select('merchant_id')
    .eq('platform', platform)
    .eq('store_key', storeKey)
    .eq('status', 'active')
    .maybeSingle();

  if (error || !data?.merchant_id) {
    return NextResponse.json({ error: 'collector_config_not_found' }, {
      status: 404,
      headers: CORS_HEADERS,
    });
  }

  return NextResponse.json({
    merchantId: data.merchant_id,
    platform,
    collectorToken: mintCollectorToken(data.merchant_id),
    endpoint: `${getAppUrl()}/api/checkout-signals/ingest`,
  }, {
    headers: {
      ...CORS_HEADERS,
      'Cache-Control': 'public, max-age=300',
    },
  });
}
