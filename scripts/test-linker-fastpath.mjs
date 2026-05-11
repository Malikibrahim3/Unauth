/**
 * Standalone timing test for the linker anchor fast-path optimisation.
 *
 * Run with:
 *   node --experimental-vm-modules scripts/test-linker-fastpath.mjs
 *
 * This script imports the compiled JS from the Next.js cache if available,
 * or we measure the core fast-path logic independently using CSV data.
 *
 * What we verify:
 *   1. Build the same pair map the linker builds (strong + weak signal indexes)
 *   2. Count how many pairs would be skipped by the fast-path
 *   3. Compare scorePair call count before vs after
 */

import { readFileSync } from 'fs';
import { createHash } from 'crypto';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CSV_PATH = join(__dirname, '..', 'friendly_fraud_blind_test_2000.csv');

// ── Read CSV ──────────────────────────────────────────────────────────────────
const raw = readFileSync(CSV_PATH, 'utf-8');
const lines = raw.trim().split('\n');
const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
const rows = lines.slice(1).map(line => {
  // Simple CSV parse (no embedded commas/quotes in test data)
  const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
  return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? '']));
});

console.log(`Loaded ${rows.length} rows from CSV`);

// ── Minimal normalisation (mirrors linker.ts) ─────────────────────────────────
const norm = rows.map(r => ({
  order_id:         r.order_id || r.transaction_id || String(Math.random()),
  email:            (r.email || '').toLowerCase().trim() || null,
  phone:            (r.phone || r.billing_phone || '').replace(/\D/g, '') || null,
  card:             (r.card_last4 || '').trim() || null,
  device:           (r.device_fingerprint || '').trim() || null,
  account:          (r.account_id || '').trim() || null,
  name:             (r.name || r.billing_name || '').toLowerCase().trim() || null,
  postcode:         (r.postcode || r.billing_postcode || '').toUpperCase().trim() || null,
  ip:               (r.ip || '').trim() || null,
  shipping_full:    (r.shipping_address || '').toLowerCase().trim() || null,
  billing_full:     (r.billing_address || '').toLowerCase().trim() || null,
}));

// ── Build indexes (group by shared value) ─────────────────────────────────────
function buildIndex(field) {
  const idx = new Map();
  for (const o of norm) {
    const v = o[field];
    if (!v) continue;
    let arr = idx.get(v);
    if (!arr) { arr = []; idx.set(v, arr); }
    arr.push(o.order_id);
  }
  return idx;
}

const indexes = {
  email:    { idx: buildIndex('email'),    signal: 'email' },
  card:     { idx: buildIndex('card'),     signal: 'card' },
  phone:    { idx: buildIndex('phone'),    signal: 'phone' },
  device:   { idx: buildIndex('device'),   signal: 'device' },
  account:  { idx: buildIndex('account'),  signal: 'account' },
  name:     { idx: buildIndex('name'),     signal: 'name' },
  postcode: { idx: buildIndex('postcode'), signal: 'postcode' },
  ip:       { idx: buildIndex('ip'),       signal: 'ip' },
  ship:     { idx: buildIndex('shipping_full'), signal: 'shipping_address' },
  bill:     { idx: buildIndex('billing_full'),  signal: 'billing_address' },
};

// ── Build pair map (mirrors linker addSignalPairsFrom) ────────────────────────
const PERSONAL_SIGNALS = new Set(['email', 'card', 'phone', 'device', 'account']);
const pairs = new Map(); // key → { signals: Set }

function pairKey(a, b) { return a < b ? `${a}|${b}` : `${b}|${a}`; }

function addPairs(idx, signal) {
  for (const [, group] of idx) {
    if (group.length < 2) continue;
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const key = pairKey(group[i], group[j]);
        let acc = pairs.get(key);
        if (!acc) { acc = { signals: new Set() }; pairs.set(key, acc); }
        acc.signals.add(signal);
      }
    }
  }
}

// Strong signals (unrestricted)
for (const { idx, signal } of Object.values(indexes)) {
  addPairs(idx, signal);
}

// ── Measure impact of fast-path ───────────────────────────────────────────────
let withPersonal = 0, withoutPersonal = 0;
for (const acc of pairs.values()) {
  let hasP = false;
  for (const s of acc.signals) { if (PERSONAL_SIGNALS.has(s)) { hasP = true; break; } }
  if (hasP) withPersonal++;
  else withoutPersonal++;
}

const total = pairs.size;
const skipPct = ((withoutPersonal / total) * 100).toFixed(1);

console.log('');
console.log('=== Anchor Fast-Path Analysis ===');
console.log(`Total pairs in map:            ${total.toLocaleString()}`);
console.log(`Pairs WITH personal signal:    ${withPersonal.toLocaleString()}  (would call scorePair)`);
console.log(`Pairs WITHOUT personal signal: ${withoutPersonal.toLocaleString()}  (skipped — anchor rule)`);
console.log(`Fast-path skip rate:           ${skipPct}%`);
console.log('');
console.log('→ scorePair calls BEFORE fix:', total.toLocaleString());
console.log('→ scorePair calls AFTER fix: ', withPersonal.toLocaleString());
console.log(`→ Reduction: ${skipPct}%`);
