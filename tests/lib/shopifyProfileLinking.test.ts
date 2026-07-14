import { syncShopifyProfilesForShop } from '@/lib/shopify/profileLinking';
import { normalizeAddress } from '@/lib/shopify/identity';

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
        delete() { return { in: async (col: string, vals: any[]) => { state[table] = (state[table] || []).filter((r: any) => !vals.includes(r[col])); return { data: null, error: null }; } }; },
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
  it('normalizes Shopify addresses without recipient names', () => {
    const a = normalizeAddress({
      name: 'Simon Murphy',
      address1: '234 Joyce Avenue',
      city: 'London',
      province: 'England',
      zip: 'N18 2TS',
      country: 'United Kingdom',
    });
    const b = normalizeAddress({
      name: 'Simeon Murray',
      address1: '234 Joyce Avenue',
      city: 'London',
      province: 'England',
      zip: 'N18 2TS',
      country: 'United Kingdom',
    });
    expect(a).toBe(b);
    expect(a).not.toContain('simon');
    expect(a).not.toContain('murphy');
    expect(a).not.toContain('simeon');
    expect(a).not.toContain('murray');
  });

  it('creates mapping identities and profile', async () => {
    const supabase: any = makeSupabase({ merchant_shopify_connections:[{merchant_id:'m1',shop_domain:'s.myshopify.com',active:true}], merchant_identities:[{shop_domain:'s.myshopify.com',source:'order',source_id:'o1',email:'a@b.com',phone:null,shipping_address:null,billing_address:null,customer_id:'c1'}], shopify_order_signals:[{shop_domain:'s.myshopify.com',shopify_order_id:'o1',customer_id:'c1',risk_level:'low',risk_recommendation:null,refunds_count:0,created_at_shopify:'2026-05-20T00:00:00Z'}], customer_profiles:[], customer_profile_identities:[] });
    const result = await syncShopifyProfilesForShop({ shopDomain: 's.myshopify.com', supabase });
    expect(result.profilesCreated).toBe(1);
    expect(supabase._state.customer_profile_identities.some((r: any) => r.identity_type === 'email' && r.identity_value === 'a@b.com')).toBe(true);
    expect(supabase._state.customer_profile_identities.some((r: any) => r.identity_type === 'shopify_order_id' && r.identity_value === 'o1')).toBe(true);
  });

  it('creates profile + shopify_order_id mapping for fresh order-only sync', async () => {
    const supabase: any = makeSupabase({
      merchant_shopify_connections:[{merchant_id:'00000000-0000-4000-8000-000000000001',shop_domain:'merchant-a.myshopify.com',active:true}],
      merchant_identities:[{shop_domain:'merchant-a.myshopify.com',source:'order',source_id:'1779820021334',email:null,phone:null,shipping_address:null,billing_address:null,customer_id:null}],
      shopify_order_signals:[{shop_domain:'merchant-a.myshopify.com',shopify_order_id:'1779820021334',customer_id:null,risk_level:null,risk_recommendation:null,refunds_count:0,created_at_shopify:'2026-05-26T18:27:02.411Z'}],
      customer_profiles:[],
      customer_profile_identities:[],
    });
    const result = await syncShopifyProfilesForShop({ shopDomain: 'merchant-a.myshopify.com', supabase, onlyOrderIds: ['1779820021334'] });
    expect(result.profilesCreated).toBe(1);
    expect(supabase._state.customer_profile_identities.some((r: any) => r.identity_type === 'shopify_order_id' && r.identity_value === '1779820021334')).toBe(true);
  });

  it('merges stale duplicate profiles that share the same email', async () => {
    const supabase: any = makeSupabase({
      merchant_shopify_connections:[{merchant_id:'m1',shop_domain:'s.myshopify.com',active:true}],
      merchant_identities:[
        {shop_domain:'s.myshopify.com',source:'order',source_id:'o1',email:'same@example.com',phone:'555',shipping_address:'1 Main St',billing_address:null,customer_id:'c1'},
        {shop_domain:'s.myshopify.com',source:'order',source_id:'o2',email:'same@example.com',phone:'555',shipping_address:'1 Main St',billing_address:null,customer_id:'c1'},
      ],
      shopify_order_signals:[
        {shop_domain:'s.myshopify.com',shopify_order_id:'o1',order_number:'1012',customer_id:'c1',risk_level:'low',risk_recommendation:null,refunds_count:0,created_at_shopify:'2026-05-31T08:39:00Z'},
        {shop_domain:'s.myshopify.com',shopify_order_id:'o2',order_number:'1013',customer_id:'c1',risk_level:'low',risk_recommendation:null,refunds_count:0,created_at_shopify:'2026-05-31T08:43:00Z'},
      ],
      customer_profiles:[
        {id:'stale-profile',primary_email:'same@example.com',emails:['same@example.com'],phones:[],addresses:[],merchant_ids:['m1'],total_orders:1,total_refund_claims:0,first_seen:'2026-05-31T08:39:00Z',last_seen:'2026-05-31T08:39:00Z'},
        {id:'canonical-profile',primary_email:'same@example.com',emails:['same@example.com'],phones:['555'],addresses:['1 Main St'],merchant_ids:['m1'],total_orders:2,total_refund_claims:0,first_seen:'2026-05-31T08:39:00Z',last_seen:'2026-05-31T08:43:00Z'},
      ],
      customer_profile_identities:[
        {customer_profile_id:'canonical-profile',merchant_id:'m1',shop_domain:'s.myshopify.com',identity_type:'email',identity_value:'same@example.com',source:'shopify'},
        {customer_profile_id:'canonical-profile',merchant_id:'m1',shop_domain:'s.myshopify.com',identity_type:'shopify_customer_id',identity_value:'c1',source:'shopify'},
        {customer_profile_id:'canonical-profile',merchant_id:'m1',shop_domain:'s.myshopify.com',identity_type:'shopify_order_id',identity_value:'o1',source:'shopify'},
      ],
    });

    await syncShopifyProfilesForShop({ shopDomain: 's.myshopify.com', supabase, onlyOrderIds: ['o2'] });

    expect(supabase._state.customer_profiles.map((r: any) => r.id)).toEqual(['canonical-profile']);
    expect(supabase._state.customer_profiles[0].total_orders).toBe(2);
    expect(supabase._state.customer_profile_identities.some((r: any) => r.identity_type === 'shopify_order_id' && r.identity_value === 'o2' && r.customer_profile_id === 'canonical-profile')).toBe(true);
  });
});
