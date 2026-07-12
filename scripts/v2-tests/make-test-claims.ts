/** Creates test claims/claim_events/merchant_identity_state for isolation +
 *  append-only tests, then relies on resolve.ts re-run for linkage/profiles. */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'node:fs';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const statePath = new URL('./state.json', import.meta.url);
const manifest = JSON.parse(readFileSync(statePath, 'utf8'));

function fail(msg: string, e?: unknown): never { console.error('FAILED:', msg, e ?? ''); process.exit(1); }

async function main() {
  const A = manifest.merchants['v2test-merchant-a'], B = manifest.merchants['v2test-merchant-b'];
  const rows = [
    { merchant_id: A, source_order_id: manifest.orders['v2t-g7-a'], claim_type: 'item_not_received', status: 'open', detection_method: 'manual', reason_raw: 'v2test claim A', amount_at_risk: 123.45, currency: 'USD' },
    { merchant_id: B, source_order_id: manifest.orders['v2t-g7-b'], claim_type: 'chargeback', status: 'open', detection_method: 'manual', reason_raw: 'v2test claim B', amount_at_risk: 67.89, currency: 'USD' },
  ];
  const { data, error } = await sb.from('support_payout_cases').insert(rows).select('id, merchant_id');
  if (error) fail('claims', error);
  manifest.claims = { A: data.find((r: any) => r.merchant_id === A)!.id, B: data.find((r: any) => r.merchant_id === B)!.id };

  const { error: e2 } = await sb.from('claim_events').insert([
    { claim_id: manifest.claims.A, merchant_id: A, event_type: 'created', to_status: 'open', note: 'v2test event A' },
    { claim_id: manifest.claims.B, merchant_id: B, event_type: 'created', to_status: 'open', note: 'v2test event B' },
  ]);
  if (e2) fail('claim_events', e2);

  // watchlist state rows need identity ids: use the k1 (A-only) and k2 identities
  const k1 = manifest.hashes['k1_email'], k2 = manifest.hashes['k2_email'];
  const { data: m1 } = await sb.from('identity_members').select('identity_id').eq('identifier_type', k1.type).eq('identifier_hash', k1.hash).single();
  const { data: m2 } = await sb.from('identity_members').select('identity_id').eq('identifier_type', k2.type).eq('identifier_hash', k2.hash).single();
  if (!m1 || !m2) fail('identity lookup for watchlist');
  const { error: e3 } = await sb.from('merchant_identity_state').insert([
    { merchant_id: A, identity_id: m1.identity_id, on_watchlist: true, display_name: 'v2test watch A' },
    { merchant_id: B, identity_id: m2.identity_id, on_watchlist: true, display_name: 'v2test watch B' },
  ]);
  if (e3) fail('merchant_identity_state', e3);

  writeFileSync(statePath, JSON.stringify(manifest, null, 2));
  console.log('TEST CLAIMS OK', JSON.stringify(manifest.claims));
}
main().catch((e) => fail('unhandled', e));
