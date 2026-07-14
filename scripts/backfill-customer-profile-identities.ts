import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

const uniq = (arr: Array<string | null | undefined>) => Array.from(new Set(arr.filter((v): v is string => !!v && v.trim()).map((v) => v.trim())));
const hashAddress = (v: string | null) => (v ? createHash('sha256').update(v.trim().toLowerCase(), 'utf8').digest('hex') : null);

async function main() {
  const shopDomain = process.argv[2]?.trim();
  const merchantId = process.argv[3]?.trim() ?? process.env.E2E_MERCHANT_ID?.trim();
  if (!shopDomain || !merchantId) throw new Error('Usage: backfill-customer-profile-identities <shop-domain> <merchant-id>');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing env');
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  await supabase.from('merchant_shopify_connections' as any).upsert({ merchant_id: merchantId, shop_domain: shopDomain, active: true }, { onConflict: 'merchant_id,shop_domain' });

  const { data: identities } = await supabase.from('merchant_identities' as any)
    .select('email,phone,shipping_address,billing_address,customer_id,source_id')
    .eq('shop_domain', shopDomain)
    .eq('source', 'order');

  const groups = new Map<string, any[]>();
  for (const row of identities ?? []) {
    const key = row.customer_id ? `cid:${row.customer_id}` : (row.email ? `email:${String(row.email).toLowerCase()}` : `order:${row.source_id}`);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }

  let profilesCreated = 0, profilesLinked = 0, identitiesUpserted = 0;

  for (const rows of groups.values()) {
    const orderIds = uniq(rows.map((r) => String(r.source_id)));
    const emails = uniq(rows.map((r) => r.email ? String(r.email).toLowerCase() : null));
    const phones = uniq(rows.map((r) => r.phone));
    const addresses = uniq(rows.flatMap((r) => [r.shipping_address, r.billing_address]));
    const customerIds = uniq(rows.map((r) => r.customer_id));

    const { data: signals } = await supabase.from('shopify_order_signals' as any)
      .select('shopify_order_id,customer_id,created_at_shopify,refunds_count')
      .eq('shop_domain', shopDomain)
      .in('shopify_order_id', orderIds);
    for (const s of signals ?? []) if (s.customer_id) customerIds.push(String(s.customer_id));

    const anchors = [
      ...emails.map((v) => ({ identity_type: 'email', identity_value: v })),
      ...phones.map((v) => ({ identity_type: 'phone', identity_value: v })),
      ...uniq(customerIds).map((v) => ({ identity_type: 'shopify_customer_id', identity_value: v })),
      ...orderIds.map((v) => ({ identity_type: 'shopify_order_id', identity_value: v })),
      ...uniq(addresses.map((a) => hashAddress(a))).map((v) => ({ identity_type: 'address_hash', identity_value: v })),
    ];

    let profileId: string | null = null;
    const grouped: Record<string, string[]> = {};
    for (const a of anchors) (grouped[a.identity_type] ||= []).push(a.identity_value);
    for (const [type, vals] of Object.entries(grouped)) {
      const { data } = await supabase.from('customer_profile_identities' as any)
        .select('customer_profile_id').eq('merchant_id', merchantId).eq('identity_type', type).in('identity_value', uniq(vals)).limit(1).maybeSingle();
      if (data?.customer_profile_id) { profileId = data.customer_profile_id; break; }
    }

    if (!profileId && emails.length) {
      const { data } = await supabase.from('customer_profiles' as any).select('id,merchant_ids').contains('emails',[emails[0]]).limit(1).maybeSingle();
      if (data && (data.merchant_ids ?? []).includes(merchantId)) profileId = data.id;
    }

    if (!profileId) {
      const { data } = await supabase.from('customer_profiles' as any).insert({
        primary_email: emails[0] ?? null, emails, ips: [], addresses, card_last4s: [], phones, names: [], risk_score: 15, risk_level: 'low', fraud_flags: [],
        total_orders: (signals ?? []).length, total_refund_claims: 0, total_chargebacks: 0, total_merchants_seen_at: 1, refund_rate: 0, refund_timestamps: [], refund_acceleration_score: 0,
        merchant_ids: [merchantId], first_seen: new Date().toISOString(), last_seen: new Date().toISOString(), profile_confidence: 60, manually_reviewed: false, on_watchlist: false,
      }).select('id').single();
      profileId = data?.id ?? null;
      if (profileId) profilesCreated++;
    } else {
      profilesLinked++;
    }

    if (!profileId) continue;
    for (const a of anchors) {
      const { error } = await supabase.from('customer_profile_identities' as any).upsert({
        customer_profile_id: profileId, merchant_id: merchantId, shop_domain: shopDomain, identity_type: a.identity_type, identity_value: a.identity_value, source: 'shopify', updated_at: new Date().toISOString(),
      }, { onConflict: 'merchant_id,identity_type,identity_value' });
      if (!error) identitiesUpserted++;
    }
  }

  console.log(JSON.stringify({ shopDomain, merchantId, groups: groups.size, profilesCreated, profilesLinked, identitiesUpserted }));
}

main().catch((e) => { console.error(e); process.exit(1); });
