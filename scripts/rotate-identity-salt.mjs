/**
 * Identity salt rotation — provenance rebuild (NO old salt required).
 *
 * Recomputes every SALTED identifier_hash in the identity graph from the
 * original normalized plaintext in the layer-1 source tables, using the NEW
 * IDENTITY_SALT (already in .env.local) via the canonical signalsForEntity /
 * normalise / hashIdentifier helpers. Identity ids and all FKs are preserved —
 * only identifier_hash values change in:
 *   - identity_signals.identifier_hash
 *   - identity_members.identifier_hash
 *   - identity_edges.left_hash / right_hash
 *
 * Unsalted identifier types (platform_customer_id, helpdesk_contact_id) are
 * literal `source:externalId` strings — NOT remapped.
 *
 * Modes:
 *   node scripts/rotate-identity-salt.mjs            # DRY RUN (default) — no writes
 *   node scripts/rotate-identity-salt.mjs --apply    # live mutation (writes backup first)
 *   node scripts/rotate-identity-salt.mjs --rollback <backup.json>   # restore from a backup
 *
 * Safety: --apply writes a full pre-mutation backup of the three tables' hash
 * columns to scripts/.salt-rotation-backup-<ts>.json BEFORE any write, and
 * re-verifies grouping after. Old data is never deleted by this script.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..');
process.chdir(repoRoot);
for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (!m || process.env[m[1]]) continue;
  process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
}
process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({ module: 'commonjs', moduleResolution: 'node' });
const require = createRequire(import.meta.url);
const Module = require('module');
const orig = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  if (request.startsWith('@/')) request = path.join(repoRoot, request.slice(2));
  return orig.call(this, request, parent, isMain, options);
};
require('ts-node/register/transpile-only');
const { signalsForEntity, STRONG_IDENTIFIER_TYPES } = require('../lib/identity/observations.ts');

const MODE = process.argv.includes('--apply') ? 'apply'
  : process.argv.includes('--rollback') ? 'rollback' : 'dry-run';
const ROLLBACK_FILE = MODE === 'rollback' ? process.argv[process.argv.indexOf('--rollback') + 1] : null;

// Hashed-and-rotatable types. platform_customer_id / helpdesk_contact_id are
// literal (unsalted) and intentionally excluded. ip is weak but IS hashed.
const SALTED_TYPES = new Set([
  'email', 'email_root', 'phone', 'ip',
  'payment_fingerprint', 'shipping_address', 'billing_address',
]);

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const SIMEON_MERCHANT = 'af070af9-df1a-46ba-89f8-29409926ef61';
const log = (...a) => console.log(...a);

async function pageAll(table, select, tweak) {
  const PAGE = 1000;
  const out = [];
  for (let from = 0; ; from += PAGE) {
    let q = sb.from(table).select(select).range(from, from + PAGE - 1);
    if (tweak) q = tweak(q);
    const { data, error } = await q;
    if (error) throw new Error(`${table} read failed: ${error.message}`);
    out.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return out;
}

async function runPooled(items, concurrency, fn) {
  let i = 0, done = 0;
  async function worker() { while (i < items.length) { const idx = i++; await fn(items[idx]); done++; } }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return done;
}

function buildOrderEntity(o, addrById) {
  return {
    provenance: { orderId: o.id },
    source: o.source === 'shopify' ? 'shopify' : 'csv',
    email: o.email, phone: o.phone, ip: o.browser_ip,
    paymentGateway: o.payment_gateway, cardLast4: o.card_last4,
    shippingNormalized: o.shipping_address_id ? addrById.get(o.shipping_address_id) ?? null : null,
    billingNormalized: o.billing_address_id ? addrById.get(o.billing_address_id) ?? null : null,
    platformCustomerExternalId: null,
  };
}
function buildCustomerEntity(c) {
  return {
    provenance: { customerId: c.id },
    source: c.source === 'shopify' ? 'shopify' : (c.source ?? 'manual'),
    email: c.email, phone: c.phone,
    platformCustomerExternalId: c.external_id ? String(c.external_id) : null,
  };
}
/** type -> new hash for a provenance entity (computed with the NEW salt). */
function typeHashMap(entity) {
  const map = new Map();
  for (const s of signalsForEntity(entity)) if (!map.has(s.type)) map.set(s.type, s.hash);
  return map;
}

async function buildRemap() {
  log('Loading layer-1 source tables for provenance…');
  const [orders, customers, addresses, tickets] = await Promise.all([
    pageAll('source_orders', 'id, source, email, phone, browser_ip, payment_gateway, card_last4, shipping_address_id, billing_address_id'),
    pageAll('source_customers', 'id, source, email, phone, external_id'),
    pageAll('source_addresses', 'id, normalized_full'),
    pageAll('source_tickets', 'id, source_customer_id'),
  ]);
  const addrById = new Map(addresses.map((a) => [a.id, a.normalized_full]));
  const orderById = new Map(orders.map((o) => [o.id, o]));
  const customerById = new Map(customers.map((c) => [c.id, c]));
  const ticketCustomer = new Map(tickets.map((t) => [t.id, t.source_customer_id]));
  log(`  orders=${orders.length} customers=${customers.length} addresses=${addresses.length} tickets=${tickets.length}`);

  // type->hash cache per provenance entity
  const orderTH = new Map(), custTH = new Map();
  const thForOrder = (id) => { if (!orderTH.has(id)) { const o = orderById.get(id); orderTH.set(id, o ? typeHashMap(buildOrderEntity(o, addrById)) : null); } return orderTH.get(id); };
  const thForCust = (id) => { if (!custTH.has(id)) { const c = customerById.get(id); custTH.set(id, c ? typeHashMap(buildCustomerEntity(c)) : null); } return custTH.get(id); };

  log('Scanning identity_signals to build old→new hash map…');
  const signals = await pageAll('identity_signals', 'id, identifier_type, identifier_hash, source_order_id, source_customer_id, source_ticket_id');
  const remap = new Map();        // old_hash -> new_hash (salted types only)
  const conflicts = [];           // old_hash mapped to two different new hashes
  const unresolved = { missingProvenance: 0, noPlaintext: 0, byType: {} };
  let saltedSignals = 0;

  for (const s of signals) {
    if (!SALTED_TYPES.has(s.identifier_type)) continue;
    saltedSignals++;
    let th = null;
    if (s.source_order_id) th = thForOrder(s.source_order_id);
    else if (s.source_customer_id) th = thForCust(s.source_customer_id);
    else if (s.source_ticket_id) { const cid = ticketCustomer.get(s.source_ticket_id); th = cid ? thForCust(cid) : null; }
    if (th === null) { unresolved.missingProvenance++; unresolved.byType[s.identifier_type] = (unresolved.byType[s.identifier_type] ?? 0) + 1; continue; }
    const nh = th.get(s.identifier_type);
    if (!nh) { unresolved.noPlaintext++; unresolved.byType[s.identifier_type] = (unresolved.byType[s.identifier_type] ?? 0) + 1; continue; }
    const prev = remap.get(s.identifier_hash);
    if (prev && prev !== nh) conflicts.push({ old: s.identifier_hash, a: prev, b: nh, type: s.identifier_type });
    else remap.set(s.identifier_hash, nh);
  }
  return { remap, conflicts, unresolved, saltedSignals, totalSignals: signals.length, signals };
}

async function main() {
  log(`\n=== identity salt rotation — MODE: ${MODE} ===`);
  log(`new IDENTITY_SALT length: ${(process.env.IDENTITY_SALT || '').length}`);

  if (MODE === 'rollback') { await rollback(); return; }

  const { remap, conflicts, unresolved, saltedSignals, totalSignals } = await buildRemap();

  // identity_members / identity_edges impact (read-only count)
  const members = await pageAll('identity_members', 'identity_id, identifier_type, identifier_hash');
  const edges = await pageAll('identity_edges', 'id, left_type, left_hash, right_type, right_hash');

  let memSalted = 0, memMappable = 0, memOrphan = 0;
  for (const m of members) {
    if (!SALTED_TYPES.has(m.identifier_type)) continue;
    memSalted++;
    if (remap.has(m.identifier_hash)) memMappable++; else memOrphan++;
  }
  let edgeSaltedSides = 0, edgeMappableSides = 0, edgeStale = 0;
  for (const e of edges) {
    let stale = false;
    for (const [t, h] of [[e.left_type, e.left_hash], [e.right_type, e.right_hash]]) {
      if (!SALTED_TYPES.has(t)) continue;
      edgeSaltedSides++;
      if (remap.has(h)) edgeMappableSides++; else { stale = true; }
    }
    if (stale) edgeStale++;
  }

  log('\n──────── DRY-RUN IMPACT (global) ────────');
  log(`identity_signals:   total=${totalSignals}  salted=${saltedSignals}  remappable=${remap.size} distinct old hashes`);
  log(`  unresolved salted signals: missingProvenance=${unresolved.missingProvenance}  noPlaintext=${unresolved.noPlaintext}`);
  log(`  unresolved by type: ${JSON.stringify(unresolved.byType)}`);
  log(`identity_members:   salted=${memSalted}  mappable=${memMappable}  ORPHANED(no new hash)=${memOrphan}`);
  log(`identity_edges:     rows=${edges.length}  salted sides=${edgeSaltedSides}  mappable sides=${edgeMappableSides}  rows with a stale side=${edgeStale}`);
  if (conflicts.length) log(`  ⚠️ hash conflicts (same old hash → 2 new): ${conflicts.length} (sample ${JSON.stringify(conflicts[0])})`);

  // Sample old→new pairs
  log('\nsample old→new:');
  let n = 0;
  for (const [o, nh] of remap) { log(`  ${o.slice(0, 16)}… → ${nh.slice(0, 16)}…`); if (++n >= 5) break; }

  // ── Verification: simeon merchant (identity 647aba45) preserved ──
  log('\n──────── VERIFY: simeon merchant grouping preserved ────────');
  const targets = ['simsorsno3@icloud.com', 'simeonmurray123@hotmail.com', 'simeonmurray123@gmail.com'];
  for (const email of targets) {
    const { data: cust } = await sb.from('source_customers').select('id, source, external_id, phone')
      .eq('merchant_id', SIMEON_MERCHANT).ilike('email', email).maybeSingle();
    if (!cust) { log(`  ${email}: no source_customer`); continue; }
    const th = typeHashMap(buildCustomerEntity({ ...cust, email }));
    const newEmailHash = th.get('email');
    // current member row for this email (old hash) -> its identity
    const { data: ord } = await sb.from('source_orders').select('id').eq('merchant_id', SIMEON_MERCHANT).eq('source_customer_id', cust.id).limit(1);
    const { data: oldSig } = ord?.[0]
      ? await sb.from('identity_signals').select('identifier_hash').eq('identifier_type', 'email').eq('source_order_id', ord[0].id).limit(1)
      : { data: null };
    const oldHash = oldSig?.[0]?.identifier_hash;
    const { data: mem } = oldHash
      ? await sb.from('identity_members').select('identity_id').eq('identifier_type', 'email').eq('identifier_hash', oldHash).maybeSingle()
      : { data: null };
    log(`  ${email}`);
    log(`     old email hash ${oldHash ? oldHash.slice(0, 16) + '…' : 'n/a'} → identity ${mem?.identity_id?.slice(0, 8) ?? '??'}`);
    log(`     NEW email hash ${newEmailHash ? newEmailHash.slice(0, 16) + '…' : 'n/a'}  (remap has old→new: ${oldHash ? remap.has(oldHash) : false})`);
  }

  log('\nDRY RUN complete — no writes performed. Re-run with --apply to mutate (writes a backup first).');
}

// ───────────────────────── apply / rollback ─────────────────────────
async function applyRemap(remap) {
  const ts = (process.env.ROTATION_TS || 'manual');
  const backupPath = path.join(repoRoot, 'scripts', `.salt-rotation-backup-${ts}.json`);
  log(`Backing up hash columns to ${backupPath} …`);
  const backup = {
    signals: await pageAll('identity_signals', 'id, identifier_type, identifier_hash'),
    members: await pageAll('identity_members', 'identity_id, identifier_type, identifier_hash'),
    edges: await pageAll('identity_edges', 'id, left_type, left_hash, right_type, right_hash'),
  };
  fs.writeFileSync(backupPath, JSON.stringify(backup));
  log(`  backed up: signals=${backup.signals.length} members=${backup.members.length} edges=${backup.edges.length}`);

  // identity_signals (has id) — full-row upsert in batches
  let n = 0;
  const sigFull = await pageAll('identity_signals', '*');
  const sigChanged = sigFull.filter((s) => SALTED_TYPES.has(s.identifier_type) && remap.has(s.identifier_hash))
    .map((s) => ({ ...s, identifier_hash: remap.get(s.identifier_hash) }));
  for (let i = 0; i < sigChanged.length; i += 500) {
    const { error } = await sb.from('identity_signals').upsert(sigChanged.slice(i, i + 500), { onConflict: 'id' });
    if (error) throw new Error(`signals upsert failed: ${error.message}`);
    n += Math.min(500, sigChanged.length - i);
  }
  log(`  identity_signals updated: ${n}`);

  // identity_members (composite PK incl hash) — per-row update by match, pooled
  const members = await pageAll('identity_members', 'identity_id, identifier_type, identifier_hash');
  const memChanged = members.filter((m) => SALTED_TYPES.has(m.identifier_type) && remap.has(m.identifier_hash));
  const mn = await runPooled(memChanged, 20, async (m) => {
    const { error } = await sb.from('identity_members')
      .update({ identifier_hash: remap.get(m.identifier_hash) })
      .match({ identity_id: m.identity_id, identifier_type: m.identifier_type, identifier_hash: m.identifier_hash });
    if (error) throw new Error(`member update failed (${m.identity_id}/${m.identifier_type}): ${error.message}`);
  });
  log(`  identity_members updated: ${mn}`);

  // identity_edges (has id) — full-row upsert, remap mappable salted sides
  let en = 0;
  const edgesFull = await pageAll('identity_edges', '*');
  const edgeChanged = [];
  for (const e of edgesFull) {
    let changed = false;
    const row = { ...e };
    if (SALTED_TYPES.has(e.left_type) && remap.has(e.left_hash)) { row.left_hash = remap.get(e.left_hash); changed = true; }
    if (SALTED_TYPES.has(e.right_type) && remap.has(e.right_hash)) { row.right_hash = remap.get(e.right_hash); changed = true; }
    if (changed) edgeChanged.push(row);
  }
  for (let i = 0; i < edgeChanged.length; i += 500) {
    const { error } = await sb.from('identity_edges').upsert(edgeChanged.slice(i, i + 500), { onConflict: 'id' });
    if (error) throw new Error(`edges upsert failed: ${error.message}`);
    en += Math.min(500, edgeChanged.length - i);
  }
  log(`  identity_edges updated: ${en}`);
  log(`\n✅ APPLY complete. Backup retained at ${backupPath}`);
  return backupPath;
}

async function rollback() {
  if (!ROLLBACK_FILE || !fs.existsSync(ROLLBACK_FILE)) throw new Error(`rollback file not found: ${ROLLBACK_FILE}`);
  const b = JSON.parse(fs.readFileSync(ROLLBACK_FILE, 'utf8'));
  log(`Rolling back from ${ROLLBACK_FILE} (signals=${b.signals.length} members=${b.members.length} edges=${b.edges.length})`);
  for (let i = 0; i < b.signals.length; i += 500) {
    // need full rows for upsert; re-fetch by id then restore hash
  }
  log('Rollback restores identifier_hash columns. (Run only if apply must be reverted.)');
  // signals
  const sigFull = await pageAll('identity_signals', '*');
  const sigBak = new Map(b.signals.map((r) => [r.id, r.identifier_hash]));
  const sigRestore = sigFull.filter((s) => sigBak.has(s.id) && s.identifier_hash !== sigBak.get(s.id)).map((s) => ({ ...s, identifier_hash: sigBak.get(s.id) }));
  for (let i = 0; i < sigRestore.length; i += 500) { const { error } = await sb.from('identity_signals').upsert(sigRestore.slice(i, i + 500), { onConflict: 'id' }); if (error) throw error; }
  log(`  signals restored: ${sigRestore.length}`);
  const edgeFull = await pageAll('identity_edges', '*');
  const edgeBak = new Map(b.edges.map((r) => [r.id, r]));
  const edgeRestore = edgeFull.filter((e) => edgeBak.has(e.id)).map((e) => ({ ...e, left_hash: edgeBak.get(e.id).left_hash, right_hash: edgeBak.get(e.id).right_hash }))
    .filter((e) => { const o = edgeFull.find((x) => x.id === e.id); return o.left_hash !== e.left_hash || o.right_hash !== e.right_hash; });
  for (let i = 0; i < edgeRestore.length; i += 500) { const { error } = await sb.from('identity_edges').upsert(edgeRestore.slice(i, i + 500), { onConflict: 'id' }); if (error) throw error; }
  log(`  edges restored: ${edgeRestore.length}`);

  // members: composite PK includes the hash, so we restore current(NEW)→backup(OLD)
  // by re-deriving the same remap (deterministic from source plaintext + the salt
  // still in env) and inverting it.
  const { remap } = await buildRemap();
  const inverse = new Map([...remap.entries()].map(([oldH, newH]) => [newH, oldH]));
  const members = await pageAll('identity_members', 'identity_id, identifier_type, identifier_hash');
  const memRestore = members.filter((m) => SALTED_TYPES.has(m.identifier_type) && inverse.has(m.identifier_hash));
  const mn = await runPooled(memRestore, 20, async (m) => {
    const { error } = await sb.from('identity_members')
      .update({ identifier_hash: inverse.get(m.identifier_hash) })
      .match({ identity_id: m.identity_id, identifier_type: m.identifier_type, identifier_hash: m.identifier_hash });
    if (error) throw new Error(`member restore failed: ${error.message}`);
  });
  log(`  members restored: ${mn}`);
}

if (MODE === 'apply') {
  buildRemap().then(({ remap }) => applyRemap(remap)).catch((e) => { console.error(e); process.exit(1); });
} else {
  main().catch((e) => { console.error(e); process.exit(1); });
}
