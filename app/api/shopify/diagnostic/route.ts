import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = createServiceClient();

  let supabaseConnected = false;
  let merchantsInstalled = 0;
  let identitiesCollected = 0;
  let webhooksProcessed = 0;

  const merchantsRes = await supabase
    .from('shopify_merchants' as any)
    .select('shop_domain', { count: 'exact', head: true });
  supabaseConnected = !merchantsRes.error;
  merchantsInstalled = merchantsRes.count ?? 0;

  const identitiesRes = await supabase
    .from('merchant_identities' as any)
    .select('id', { count: 'exact', head: true });
  identitiesCollected = identitiesRes.count ?? 0;

  const webhooksRes = await supabase
    .from('processed_webhooks' as any)
    .select('webhook_id', { count: 'exact', head: true });
  webhooksProcessed = webhooksRes.count ?? 0;

  return NextResponse.json({
    supabase_connected: supabaseConnected,
    merchants_installed: merchantsInstalled,
    identities_collected: identitiesCollected,
    webhooks_processed: webhooksProcessed,
    env_vars: {
      SHOPIFY_API_KEY: !!process.env.SHOPIFY_API_KEY,
      SHOPIFY_API_SECRET: !!process.env.SHOPIFY_API_SECRET,
      SHOPIFY_WEBHOOK_SECRET: !!process.env.SHOPIFY_WEBHOOK_SECRET,
      NEXT_PUBLIC_APP_URL: !!process.env.NEXT_PUBLIC_APP_URL,
    },
  });
}

