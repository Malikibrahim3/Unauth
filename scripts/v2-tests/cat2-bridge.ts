/** 2.10 setup: bridge order linking mergeleft (email) + mergeright (phone). */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'node:fs';
import { signalsForOrder, edgesForEntity } from './ssot';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const statePath = new URL('./state.json', import.meta.url);
const manifest = JSON.parse(readFileSync(statePath, 'utf8'));
const A = manifest.merchants['v2test-merchant-a'];

async function main() {
  // record pre-merge identity ids
  const idOf = async (type: string, hash: string) => {
    const { data } = await sb.from('identity_members').select('identity_id').eq('identifier_type', type).eq('identifier_hash', hash).limit(1).single();
    return data?.identity_id;
  };
  manifest.premerge = {
    left: await idOf('email', manifest.hashes['m1_email'].hash),
    right: await idOf('email', manifest.hashes['m2_email'].hash),
  };

  const o = { externalId: 'v2t-m3', email: 'v2testmergeleft@v2test.example', phone: '415-555-0201' };
  const { data, error } = await sb.from('source_orders').insert({
    merchant_id: A, source: 'csv', external_id: o.externalId, order_number: o.externalId,
    email: o.email, phone: o.phone, financial_status: 'paid', fulfillment_state: 'fulfilled',
    total_price: 100, currency: 'USD', placed_at: new Date(Date.now() - 5 * 86400e3).toISOString(),
  }).select('id').single();
  if (error) { console.error(error); process.exit(1); }
  manifest.orders[o.externalId] = data.id;
  const sigs = signalsForOrder(o);
  const { error: e2 } = await sb.rpc('ingest_identity_observations', {
    p_merchant_id: A,
    p_signals: sigs.map((s) => ({ identifier_type: s.type, identifier_hash: s.hash, source: 'csv', source_order_id: data.id })),
    p_edges: edgesForEntity(sigs),
  });
  if (e2) { console.error(e2); process.exit(1); }
  writeFileSync(statePath, JSON.stringify(manifest, null, 2));
  console.log('BRIDGE OK premerge:', JSON.stringify(manifest.premerge));
}
main();
