import { syncShopifyProfilesForShop } from '@/lib/shopify/profileLinking';

function makeSupabase(seed: any) {
  const state = JSON.parse(JSON.stringify(seed));
  const api = {
    from: (table: string) => {
      const q: any = {
        _filters: [] as Array<(r: any) => boolean>,
        select() { return q; },
        eq(col: string, val: any) { q._filters.push((r: any) => r[col] === val); return q; },
        in(col: string, vals: any[]) { q._filters.push((r: any) => vals.includes(r[col])); return q; },
        contains(col: string, vals: any[]) { q._filters.push((r: any) => Array.isArray(r[col]) && vals.every((v) => r[col].includes(v))); return q; },
        limit() { return q; },
        async maybeSingle() { const rows = (state[table] || []).filter((r: any) => q._filters.every((f: any) => f(r))); return { data: rows[0] ?? null, error: null }; },
        async single() { const rows = (state[table] || []).filter((r: any) => q._filters.every((f: any) => f(r))); return { data: rows[0] ?? null, error: null }; },
        async then(resolve: any) { const rows = (state[table] || []).filter((r: any) => q._filters.every((f: any) => f(r))); resolve({ data: rows, error: null }); },
        update(payload: any) { return { eq: async (col: string, val: any) => { const rows = (state[table] || []).filter((r: any) => q._filters.every((f: any) => f(r)) && r[col] === val); rows.forEach((r: any) => Object.assign(r, payload)); return { data: rows, error: null }; } }; },
        insert(payload: any) { const row = { id: `p${(state[table]||[]).length+1}`, ...payload }; (state[table] ||= []).push(row); return { select: () => ({ single: async () => ({ data: row, error: null }) }) }; },
        upsert(payload: any, _opts?: any) { const rows = Array.isArray(payload) ? payload : [payload]; (state[table] ||= []); for (const r of rows) { const idx = state[table].findIndex((x: any) => x.merchant_id===r.merchant_id && x.identity_type===r.identity_type && x.identity_value===r.identity_value); if (idx >= 0) state[table][idx] = { ...state[table][idx], ...r }; else state[table].push({ id: `i${state[table].length+1}`, ...r }); } return Promise.resolve({ data: null, error: null }); },
      };
      return q;
    },
    _state: state,
  };
  return api;
}

describe('shopify profile linking', () => {
  it('creates mapping identities and profile', async () => {
    const supabase: any = makeSupabase({ merchant_shopify_connections:[{merchant_id:'m1',shop_domain:'s.myshopify.com',active:true}], merchant_identities:[{shop_domain:'s.myshopify.com',source:'order',source_id:'o1',email:'a@b.com',phone:null,shipping_address:null,billing_address:null,customer_id:'c1'}], shopify_order_signals:[{shop_domain:'s.myshopify.com',shopify_order_id:'o1',customer_id:'c1',risk_level:'low',risk_recommendation:null,refunds_count:0,created_at_shopify:'2026-05-20T00:00:00Z'}], customer_profiles:[], customer_profile_identities:[] });
    const result = await syncShopifyProfilesForShop({ shopDomain: 's.myshopify.com', supabase });
    expect(result.profilesCreated).toBe(1);
    expect(supabase._state.customer_profile_identities.some((r: any) => r.identity_type === 'email' && r.identity_value === 'a@b.com')).toBe(true);
    expect(supabase._state.customer_profile_identities.some((r: any) => r.identity_type === 'shopify_order_id' && r.identity_value === 'o1')).toBe(true);
  });

  it('creates profile + shopify_order_id mapping for fresh order-only sync', async () => {
    const supabase: any = makeSupabase({
      merchant_shopify_connections:[{merchant_id:'af070af9-df1a-46ba-89f8-29409926ef61',shop_domain:'unauth-test.myshopify.com',active:true}],
      merchant_identities:[{shop_domain:'unauth-test.myshopify.com',source:'order',source_id:'1779820021334',email:null,phone:null,shipping_address:null,billing_address:null,customer_id:null}],
      shopify_order_signals:[{shop_domain:'unauth-test.myshopify.com',shopify_order_id:'1779820021334',customer_id:null,risk_level:null,risk_recommendation:null,refunds_count:0,created_at_shopify:'2026-05-26T18:27:02.411Z'}],
      customer_profiles:[],
      customer_profile_identities:[],
    });
    const result = await syncShopifyProfilesForShop({ shopDomain: 'unauth-test.myshopify.com', supabase, onlyOrderIds: ['1779820021334'] });
    expect(result.profilesCreated).toBe(1);
    expect(supabase._state.customer_profile_identities.some((r: any) => r.identity_type === 'shopify_order_id' && r.identity_value === '1779820021334')).toBe(true);
  });
});
