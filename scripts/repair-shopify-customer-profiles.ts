import { createClient } from '@supabase/supabase-js';
import { syncShopifyProfilesForShop } from '@/lib/shopify/profileLinking';

const SHOP_DOMAIN = 'unauth-test.myshopify.com';

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase env');

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const result = await syncShopifyProfilesForShop({ shopDomain: SHOP_DOMAIN, supabase });
  console.log(JSON.stringify({ shop_domain: SHOP_DOMAIN, ...result }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
