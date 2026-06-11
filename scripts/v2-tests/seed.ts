/**
 * Seeds all v2 test-suite data into dedicated test merchants (is_demo=true,
 * is_internal=true). Layer-1 rows via PostgREST (service role, as production
 * adapters do), signals/edges via the canonical ingest_identity_observations()
 * RPC. Writes a manifest to state.json for verification + cleanup.
 */
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'node:fs';
import {
  signalsForOrder, edgesForEntity, composeAddress, normaliseEmail, normaliseAddress,
  hashIdentifier, emailRoot, normalisePhone, type TestOrder, type Sig, type EdgeRow,
} from './ssot';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

type Manifest = {
  merchants: Record<string, string>;
  users: Record<string, string>;
  orders: Record<string, string>;       // externalId -> uuid
  customers: Record<string, string>;
  hashes: Record<string, { type: string; hash: string }>;
  baselines: Record<string, number>;
  startedAt: string;
};
const manifest: Manifest = { merchants: {}, users: {}, orders: {}, customers: {}, hashes: {}, baselines: {}, startedAt: new Date().toISOString() };

function fail(msg: string, error?: unknown): never {
  console.error('SEED FAILED:', msg, error ?? '');
  process.exit(1);
}

async function baseline(label: string, table: string, filter?: (q: any) => any) {
  let q = sb.from(table).select('*', { count: 'exact', head: true });
  if (filter) q = filter(q);
  const { count, error } = await q;
  if (error) fail(`baseline ${label}`, error);
  manifest.baselines[label] = count ?? 0;
}

async function createMerchant(name: string): Promise<string> {
  const { data, error } = await sb.from('merchants')
    .insert({ name, is_demo: true, is_internal: true, settings: { v2_test_suite: true } })
    .select('id').single();
  if (error) fail(`merchant ${name}`, error);
  manifest.merchants[name] = data.id;
  return data.id;
}

async function createUser(email: string): Promise<string> {
  const { data, error } = await sb.auth.admin.createUser({ email, password: 'V2TestSuite!2026', email_confirm: true });
  if (error || !data.user) fail(`auth user ${email}`, error);
  manifest.users[email] = data.user.id;
  return data.user.id;
}

async function addMember(merchantId: string, userId: string, email: string) {
  const { error } = await sb.from('merchant_users').insert({
    merchant_id: merchantId, user_id: userId, invited_email: email,
    role: 'owner', invite_status: 'active', accepted_at: new Date().toISOString(),
  });
  if (error) fail(`merchant_users ${email}`, error);
}

type SeedOrder = TestOrder & { merchant: string; placedAt?: string };

async function insertOrders(orders: SeedOrder[]): Promise<void> {
  // batch the address-free orders (chunks of 200), loop the rest
  const simple = orders.filter((o) => !o.shippingAddress && !o.billingAddress);
  const withAddr = orders.filter((o) => o.shippingAddress || o.billingAddress);
  for (let i = 0; i < simple.length; i += 200) {
    const chunk = simple.slice(i, i + 200);
    const { data, error } = await sb.from('source_orders').insert(chunk.map((o) => ({
      merchant_id: manifest.merchants[o.merchant], source: 'csv', external_id: o.externalId,
      order_number: o.externalId, email: o.email ?? null, phone: o.phone ?? null,
      financial_status: 'paid', fulfillment_state: 'fulfilled',
      total_price: 100, currency: 'USD',
      payment_gateway: o.paymentGateway ?? null, card_last4: o.cardLast4 ?? null,
      browser_ip: o.ip ?? null,
      placed_at: o.placedAt ?? new Date(Date.now() - 30 * 86400e3).toISOString(),
    }))).select('id, external_id');
    if (error) fail(`batch orders ${i}`, error);
    for (const row of data) manifest.orders[row.external_id] = row.id;
  }
  // insert addresses first where present, then orders referencing them
  for (const o of withAddr) {
    const merchantId = manifest.merchants[o.merchant];
    let shipId: string | null = null, billId: string | null = null;
    if (o.shippingAddress) {
      const { data, error } = await sb.from('source_addresses').insert({
        merchant_id: merchantId, kind: 'shipping',
        line1: o.shippingAddress.split(',')[0], city: 'New York', region: 'NY',
        postal_code: o.shippingAddress.match(/(\d{5})(?:, |$)/)?.[1] ?? null, country: 'US',
        normalized_full: normaliseAddress(o.shippingAddress),
      }).select('id').single();
      if (error) fail(`address for ${o.externalId}`, error);
      shipId = data.id;
    }
    if (o.billingAddress) {
      const { data, error } = await sb.from('source_addresses').insert({
        merchant_id: merchantId, kind: 'billing',
        line1: o.billingAddress.split(',')[0], city: 'New York', region: 'NY',
        postal_code: o.billingAddress.match(/(\d{5})(?:, |$)/)?.[1] ?? null, country: 'US',
        normalized_full: normaliseAddress(o.billingAddress),
      }).select('id').single();
      if (error) fail(`bill address for ${o.externalId}`, error);
      billId = data.id;
    }
    const { data, error } = await sb.from('source_orders').insert({
      merchant_id: merchantId, source: 'csv', external_id: o.externalId,
      order_number: o.externalId, email: o.email ?? null, phone: o.phone ?? null,
      financial_status: 'paid', fulfillment_state: 'fulfilled',
      total_price: 100, currency: 'USD',
      payment_gateway: o.paymentGateway ?? null, card_last4: o.cardLast4 ?? null,
      browser_ip: o.ip ?? null,
      shipping_address_id: shipId, billing_address_id: billId,
      placed_at: o.placedAt ?? new Date(Date.now() - 30 * 86400e3).toISOString(),
    }).select('id').single();
    if (error) fail(`order ${o.externalId}`, error);
    manifest.orders[o.externalId] = data.id;
  }
}

async function emitSignals(orders: SeedOrder[]) {
  // group per merchant, one RPC call per merchant batch (adapter semantics:
  // signals carry per-order provenance; edges merged across entities)
  const byMerchant = new Map<string, SeedOrder[]>();
  for (const o of orders) {
    if (!byMerchant.has(o.merchant)) byMerchant.set(o.merchant, []);
    byMerchant.get(o.merchant)!.push(o);
  }
  for (const [merchant, ms] of byMerchant) {
    const merchantId = manifest.merchants[merchant];
    const signals: any[] = [];
    const edgeMap = new Map<string, EdgeRow>();
    for (const o of ms) {
      const sigs = signalsForOrder(o);
      for (const s of sigs) {
        signals.push({
          identifier_type: s.type, identifier_hash: s.hash, source: 'csv',
          source_order_id: manifest.orders[o.externalId],
          observed_at: o.placedAt ?? new Date(Date.now() - 30 * 86400e3).toISOString(),
        });
      }
      for (const e of edgesForEntity(sigs)) {
        const k = `${e.left_type}|${e.left_hash}|${e.right_type}|${e.right_hash}`;
        const prev = edgeMap.get(k);
        if (prev) prev.count_delta += e.count_delta; else edgeMap.set(k, { ...e });
      }
    }
    const { error } = await sb.rpc('ingest_identity_observations', {
      p_merchant_id: merchantId, p_signals: signals, p_edges: [...edgeMap.values()],
    });
    if (error) fail(`ingest for ${merchant}`, error);
  }
}

const A = 'v2test-merchant-a', B = 'v2test-merchant-b', C = 'v2test-merchant-c',
      D = 'v2test-merchant-d', Q = 'v2test-merchant-q', PERF = 'v2test-merchant-perf';

async function main() {
  // ── baselines for post-cleanup verification
  await baseline('identities', 'identities');
  await baseline('identity_members', 'identity_members');
  await baseline('identity_signals', 'identity_signals');
  await baseline('identity_edges', 'identity_edges');
  await baseline('source_orders', 'source_orders');
  await baseline('claims', 'claims');
  await baseline('merchants', 'merchants');
  await baseline('k3_identities', 'identities', (q) => q.gte('merchant_count', 3));

  // ── merchants + users
  for (const name of [A, B, C, D, Q, PERF]) await createMerchant(name);
  const ua = await createUser('v2test-user-a@v2test.example');
  const ub = await createUser('v2test-user-b@v2test.example');
  await addMember(manifest.merchants[A], ua, 'v2test-user-a@v2test.example');
  await addMember(manifest.merchants[B], ub, 'v2test-user-b@v2test.example');

  // ── Shopify store connection for webhook success-path tests (Cat 3)
  {
    const { error } = await sb.from('store_connections').insert({
      merchant_id: manifest.merchants[A], platform: 'shopify',
      store_key: 'v2test-store.myshopify.com', store_url: 'https://v2test-store.myshopify.com',
      status: 'active', credentials_encrypted: 'v2test-not-a-real-token',
    });
    if (error) fail('store_connection', error);
  }

  // ── Gorgias helpdesk connection for TM_A (widget gating requires active +
  // API-configured connection)
  {
    const { error } = await sb.from('helpdesk_connections').insert({
      merchant_id: manifest.merchants[A], provider: 'gorgias',
      provider_account_id: 'v2test-gorgias-account', provider_account_name: 'v2test',
      provider_base_url: 'https://v2test.gorgias.com', status: 'active',
      access_token_encrypted: (await import('../../lib/support/gorgias/credentialCrypto')).encryptGorgiasApiCredentials({ email: 'v2test@v2test.example', api_key: 'v2test-api-key' }),
      scopes: ['openid', 'tickets:read'],
      settings_metadata: undefined,
    });
    if (error) fail('helpdesk_connection', error);
  }

  // ── widget tokens for Cat 8 (sha256 of plaintext, per lib/api/widgetTokens)
  {
    const { createHash } = await import('node:crypto');
    const mint = async (merchant: string, label: string, revoked: boolean) => {
      const plaintext = `unauth_wt_${createHash('sha256').update(`v2test-${label}`).digest('hex').slice(0, 32)}`;
      const { error } = await sb.from('merchant_widget_tokens').insert({
        merchant_id: manifest.merchants[merchant],
        token_hash: createHash('sha256').update(plaintext, 'utf8').digest('hex'),
        token_prefix: plaintext.slice(0, 18),
        revoked_at: revoked ? new Date().toISOString() : null,
      });
      if (error) fail(`widget token ${label}`, error);
      (manifest as any).widgetTokens = (manifest as any).widgetTokens ?? {};
      (manifest as any).widgetTokens[label] = plaintext;
    };
    await mint(A, 'valid_a', false);
    await mint(A, 'revoked_a', true);
    await mint(B, 'valid_b', false);
  }

  const addr = composeAddress('123 Mainv2test Street', 'Apt 4B', 'New York', 'NY', '10001');
  const addrSt = composeAddress('123 Mainv2test St', 'Apt 4B', 'New York', 'NY', '10001');
  const addrHash = composeAddress('123 Mainv2test St', '#4B', 'New York', 'NY', '10001');
  const addrZip4 = composeAddress('77 Zipv2test Road', null, 'New York', 'NY', '10001-1234');
  const addrZip5 = composeAddress('77 Zipv2test Road', null, 'New York', 'NY', '10001');

  const orders: SeedOrder[] = [
    // G1 — gmail dots (2.1)
    { merchant: A, externalId: 'v2t-g1-1', email: 'v2test.john.smith@gmail.com' },
    { merchant: A, externalId: 'v2t-g1-2', email: 'v2testjohnsmith@gmail.com' },
    { merchant: A, externalId: 'v2t-g1-3', email: 'v.2.t.e.s.t.j.o.h.n.s.m.i.t.h@gmail.com' },
    // G2 — plus addressing gmail (2.2)
    { merchant: A, externalId: 'v2t-g2-1', email: 'v2testplus+shopify@gmail.com' },
    { merchant: A, externalId: 'v2t-g2-2', email: 'v2testplus+fraud@gmail.com' },
    { merchant: A, externalId: 'v2t-g2-3', email: 'v2testplus@gmail.com' },
    // G2b — plus addressing NON-gmail: bridges only via email_root
    { merchant: A, externalId: 'v2t-g2b-1', email: 'v2testplus+a@fastmail.com' },
    { merchant: A, externalId: 'v2t-g2b-2', email: 'v2testplus@fastmail.com' },
    // G3 — outlook case + dots (2.3)
    { merchant: A, externalId: 'v2t-g3-1', email: 'V2Test.John.Smith@outlook.com' },
    { merchant: A, externalId: 'v2t-g3-2', email: 'v2test.john.smith@outlook.com' },
    { merchant: A, externalId: 'v2t-g3-3', email: 'v2testjohnsmith@outlook.com' },
    // G4 — phone variants (2.4); distinct emails so only phone bridges
    { merchant: A, externalId: 'v2t-g4-1', email: 'v2testphone1@v2test.example', phone: '+1 (415) 555-0142' },
    { merchant: A, externalId: 'v2t-g4-2', email: 'v2testphone2@v2test.example', phone: '14155550142' },
    { merchant: A, externalId: 'v2t-g4-3', email: 'v2testphone3@v2test.example', phone: '415-555-0142' },
    // G5 — address abbreviation variants (2.5); distinct emails
    { merchant: A, externalId: 'v2t-g5-1', email: 'v2testaddr1@v2test.example', shippingAddress: addr.composed },
    { merchant: A, externalId: 'v2t-g5-2', email: 'v2testaddr2@v2test.example', shippingAddress: addrSt.composed },
    { merchant: A, externalId: 'v2t-g5-3', email: 'v2testaddr3@v2test.example', shippingAddress: addrHash.composed },
    // G6 — zip+4 (2.6)
    { merchant: A, externalId: 'v2t-g6-1', email: 'v2testzip1@v2test.example', shippingAddress: addrZip4.composed },
    { merchant: A, externalId: 'v2t-g6-2', email: 'v2testzip2@v2test.example', shippingAddress: addrZip5.composed },
    // G7 — cross-merchant (2.7)
    { merchant: A, externalId: 'v2t-g7-a', email: 'v2testjane@v2test.example' },
    { merchant: B, externalId: 'v2t-g7-b', email: 'v2testjane@v2test.example' },
    // G9 — grade thresholds (2.9)
    { merchant: A, externalId: 'v2t-t27', email: 'v2testt27@v2test.example', shippingAddress: '11 Weakv2test Street, New York, NY 10002' },
    { merchant: A, externalId: 'v2t-t44', email: 'v2testt44@v2test.example', phone: '415-555-0190', platformCustomerExternalId: 'v2t-cust-44' },
    { merchant: A, externalId: 'v2t-t45', paymentGateway: 'v2test_gw', cardLast4: '4145', shippingAddress: '45 Possv2test Street, New York, NY 10003' },
    { merchant: A, externalId: 'v2t-t47', email: 'v2testt47@v2test.example', phone: '415-555-0147', shippingAddress: '47 Possv2test Street, New York, NY 10004' },
    { merchant: A, externalId: 'v2t-t65', paymentGateway: 'v2test_gw', cardLast4: '4165', phone: '415-555-0165', shippingAddress: '65 Probv2test Street, New York, NY 10005' },
    { merchant: A, externalId: 'v2t-t63-a', email: 'v2testt63@v2test.example', shippingAddress: '63 Possv2test Street, New York, NY 10006', platformCustomerExternalId: 'v2t-cust-63' },
    { merchant: B, externalId: 'v2t-t63-b', email: 'v2testt63@v2test.example' },
    { merchant: A, externalId: 'v2t-t66-a', email: 'v2testt66@v2test.example', shippingAddress: '66 Probv2test Street, New York, NY 10007', billingAddress: '66B Probv2test Street, New York, NY 10007' },
    { merchant: B, externalId: 'v2t-t66-b', email: 'v2testt66@v2test.example' },
    { merchant: A, externalId: 'v2t-t84-a', paymentGateway: 'v2test_gw', cardLast4: '4184', shippingAddress: '84 Probv2test Street, New York, NY 10008', billingAddress: '84B Probv2test Street, New York, NY 10008' },
    { merchant: B, externalId: 'v2t-t84-b', paymentGateway: 'v2test_gw', cardLast4: '4184' },
    { merchant: A, externalId: 'v2t-t86-a', paymentGateway: 'v2test_gw', cardLast4: '4186', phone: '415-555-0186', platformCustomerExternalId: 'v2t-cust-86' },
    { merchant: B, externalId: 'v2t-t86-b', phone: '415-555-0186' },
    { merchant: A, externalId: 'v2t-t100', email: 'v2testt100@v2test.example', phone: '415-555-0100', paymentGateway: 'v2test_gw', cardLast4: '4100', shippingAddress: '100 Defv2test Street, New York, NY 10009', billingAddress: '100B Defv2test Street, New York, NY 10009', platformCustomerExternalId: 'v2t-cust-100' },
    // G10 — merge candidates (2.10): two disjoint identities now; bridge order added later
    { merchant: A, externalId: 'v2t-m1', email: 'v2testmergeleft@v2test.example', shippingAddress: '201 Mergev2test Street, New York, NY 10010' },
    { merchant: A, externalId: 'v2t-m2', email: 'v2testmergeright@v2test.example', phone: '415-555-0201', shippingAddress: '202 Mergev2test Street, New York, NY 10011' },
    // K-anonymity identities (1.4/1.5)
    { merchant: A, externalId: 'v2t-k1-a', email: 'v2testk1@v2test.example' },
    { merchant: A, externalId: 'v2t-k2-a', email: 'v2testk2@v2test.example' },
    { merchant: B, externalId: 'v2t-k2-b', email: 'v2testk2@v2test.example' },
    { merchant: A, externalId: 'v2t-k3-a', email: 'v2testk3@v2test.example' },
    { merchant: B, externalId: 'v2t-k3-b', email: 'v2testk3@v2test.example' },
    { merchant: C, externalId: 'v2t-k3-c', email: 'v2testk3@v2test.example' },
    { merchant: A, externalId: 'v2t-k4-a', email: 'v2testk4@v2test.example' },
    { merchant: B, externalId: 'v2t-k4-b', email: 'v2testk4@v2test.example' },
    { merchant: C, externalId: 'v2t-k4-c', email: 'v2testk4@v2test.example' },
    { merchant: D, externalId: 'v2t-k4-d', email: 'v2testk4@v2test.example' },
  ];

  // G8 — shared-IP weak signal (2.8): 500 distinct customers, one IP
  for (let i = 0; i < 500; i++) {
    orders.push({
      merchant: A, externalId: `v2t-g8-${i}`,
      email: `v2testip${i}@v2test.example`, ip: '203.0.113.77',
    });
  }

  await insertOrders(orders);
  await emitSignals(orders);

  // record interesting hashes for later categories
  const rec = (label: string, type: string, value: string, hashed = true) => {
    manifest.hashes[label] = { type, hash: hashed ? hashIdentifier(value) : value };
  };
  rec('g1_email', 'email', normaliseEmail('v2test.john.smith@gmail.com')!);
  rec('g2b_root', 'email_root', emailRoot('v2testplus+a@fastmail.com')!);
  rec('g3_email_dotted', 'email', normaliseEmail('v2test.john.smith@outlook.com')!);
  rec('g3_email_undotted', 'email', normaliseEmail('v2testjohnsmith@outlook.com')!);
  rec('g3_root', 'email_root', emailRoot('v2test.john.smith@outlook.com')!);
  rec('g4_phone', 'phone', normalisePhone('415-555-0142')!);
  rec('g5_addr', 'shipping_address', normaliseAddress(addr.composed)!);
  rec('g6_addr', 'shipping_address', normaliseAddress(addrZip5.composed)!);
  rec('g7_email', 'email', normaliseEmail('v2testjane@v2test.example')!);
  rec('g8_ip', 'ip', '203.0.113.77');
  rec('k1_email', 'email', normaliseEmail('v2testk1@v2test.example')!);
  rec('k2_email', 'email', normaliseEmail('v2testk2@v2test.example')!);
  rec('k3_email', 'email', normaliseEmail('v2testk3@v2test.example')!);
  rec('k4_email', 'email', normaliseEmail('v2testk4@v2test.example')!);
  rec('m1_email', 'email', normaliseEmail('v2testmergeleft@v2test.example')!);
  rec('m2_email', 'email', normaliseEmail('v2testmergeright@v2test.example')!);
  rec('m2_phone', 'phone', normalisePhone('415-555-0201')!);
  rec('t100_email', 'email', normaliseEmail('v2testt100@v2test.example')!);

  writeFileSync(new URL('./state.json', import.meta.url), JSON.stringify(manifest, null, 2));
  console.log('SEED OK:', Object.keys(manifest.merchants).length, 'merchants,',
    orders.length, 'orders. Baselines:', JSON.stringify(manifest.baselines));
}

main().catch((e) => fail('unhandled', e));
